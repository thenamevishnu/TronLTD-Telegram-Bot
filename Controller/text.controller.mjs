import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { paymentDB } from "../Models/payment.model.mjs";
import { userDB } from "../Models/user.model.mjs";
import { createPaymentLink } from "../Utils/oxaPay.mjs";
import { answerCallback, isProtected, keys, userMention, uuid } from "../Utils/tgHelp.mjs";
import dotenv from "dotenv"
import ShortUniqueId from "short-unique-id";

dotenv.config()

api.onText(/\/start(?: (.+))?$|🔙 Back$/, async (msg, match) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({
            _id: chat.id
        })
        if (!user) {
            let inviter = match?.[1] || null
            if (inviter) {
                if (isNaN(inviter) || chat.id == inviter) {
                    return await api.sendMessage(chat.id, `<i>❌ Invalid inviter!</i>`, {
                        parse_mode: "HTML",
                        protect_content: isProtected
                    })
                }
                const userCheck = await userDB.findOne({
                    _id: inviter
                })
                if (!userCheck) {
                    inviter = botConfig.adminId
                }
            } else {
                inviter = botConfig.adminId
            }
            const response = await userDB.create({
                _id: chat.id,
                first_name: chat.first_name,
                last_name: chat.last_name,
                username: chat.username,
                invited_by: inviter
            })
            if (response._id) {
                await userDB.updateOne({
                    _id: inviter
                }, {
                    $inc: {
                        invites: 1
                    }
                })
            }
        }
        const text = `<b>🏡 Main Menu</b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                keyboard: await keys.getMainKey(chat.id),
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/💶 You have: /, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        const text = `<b><u>💰 Account Balance</u>\n\n💶 Available Balance: <code>${user.balance.balance.toFixed(4)} ${botConfig.currency}</code>\n💵 Referral Balance: <code>${user.balance.referrals.toFixed(4)} ${botConfig.currency}</code>\n💷 Payout Balance: <code>${user.balance.payouts.toFixed(4)} ${botConfig.currency}</code></b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                keyboard: keys.getBackKey(),
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/🎁 Gift$/, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        const next_gift = user.next_gift
        const currentTime = Math.floor(new Date().getTime() / 1000)
        let text = ""
        if (currentTime < next_gift) {
            const timer = next_gift - currentTime
            text = `<i>❌ You have already claimed!\n\n⚠️ Come back after: ${timer} sec.</i>`
        } else {
            const next = currentTime + 86400
            await userDB.updateOne({
                _id: chat.id
            }, {
                $inc: {
                    "balance.balance": botConfig.amount.gift
                },
                $set: {
                    next_gift: next
                }
            })
            text = `<i>🎁 You have received: ${botConfig.amount.gift} ${botConfig.currency}</i>` 
        }
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📟 Calculator$/, async (msg) => {
    try {
        const chat = msg.chat
        const text = `<i>📟 Enter the number of referrals</i>`
        answerCallback[chat.id] = "calculator"
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                keyboard: keys.getCancelKey(),
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📊 Bot Status$/, async (msg) => {
    try {
        const chat = msg.chat
        const info = await userDB.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: {
                        $count: {}  
                    },
                    totalEarned: {
                        $sum: "$balance.deposits"
                    },
                    totalPayouts: {
                        $sum: "$balance.payouts"
                    }
                }
            }
        ])
        const response = info[0]
        const text = `<b>👤 Total Members: <code>${response.totalUsers}</code>\n\n💶 Total Earned: <code>${response.totalEarned} ${botConfig.currency}</code>\n💷 Total Payouts: <code>${response.totalPayouts} ${botConfig.currency}</code>\n\n⌚ Server: <code>${new Date().toLocaleString()}</code></b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📥 Deposit$/, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        if (user.account_status) {
            return await api.sendMessage(chat.id, `<i>✅ You're already an active user</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected
            })
        }
        const { rnd: orderId} = new ShortUniqueId({length: 10})
        const { payLink } = await createPaymentLink(
            chat.id,
            botConfig.amount.deposit,
            process.env.PAYMENT_CALLBACK,
            orderId()
        )
        if (!payLink) {
            return await api.sendMessage(chat.id, `<i>❌ Something error happend!</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected
            })
        }
        const text = `<b>💶 One Time Payment\n\n🆔 OrderID: <code>#${orderId()}</code>\n💵 Cash: <code>${botConfig.amount.deposit} ${botConfig.currency}</code>\n⌚ Expire in 30 minutes</b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Pay", web_app: { url: payLink } }
                    ]
                ]
            }
        }) 
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📤 Payout$/, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        const balance = user.balance.balance
        if (!user.wallet) {
            const text = `<i>❌ Set ${botConfig.currency} wallet before payout.</i>`
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                protect_content: isProtected
            })
        }
        if (balance < botConfig.amount.withdraw) {
            const text = `<i>❌ You don't have enough balance.</i>`
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                protect_content: isProtected
            })
        }
        const text = `<b>💵 Enter amount in TRX\n\n📤 Should be multiple of ${botConfig.amount.withdraw}.</b>`
        answerCallback[chat.id] = "payout"
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                keyboard: keys.getCancelKey(),
                resize_keyboard: true 
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/⚙️ Settings$/, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        const wallet = user.wallet
        const text = `<b>💹 ${botConfig.currency}: <code>${wallet || `Not Set`}</code>\n\n⚠️ <i>This wallet will be used for future withdrawals</i></b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🖊️ Change Wallet", callback_data: `/change_wallet`}
                    ]
                ]
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/🪂 Referral$/, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        const invites = user.invites
        const text = `<b><i>✅ Every verified referral you will get ${botConfig.amount.commission} ${botConfig.currency}</i>\n\n👤 You've invited: <code>${invites} Members</code>\n\n🔗 Link: https://t.me/${botConfig.botName}?start=${chat.id}</b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📃 History$/, async (msg) => {
    try {
        const chat = msg.chat
        const user = await userDB.findOne({ _id: chat.id })
        const invites = user.invites
        const history = await paymentDB.find({ user_id: chat.id }).limit(5)
        let text = `<b>✨ Last 5 Transactions</b>`
        history.forEach((item) => {
            text += `\n\n<b>🪂 Type: <code>${item.type}</code>\n💵 Amount: <code>${item.amount.toFixed(4)} ${item.currency}</code>\n🆔 txID: <code>${item.txID}</code></b>` 
        })
        if (history.length == 0) {
            text += "\n\n<code>- Nothing found!</code>"
        }
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    } catch (err) {
        return console.log(err.message)
    }
})