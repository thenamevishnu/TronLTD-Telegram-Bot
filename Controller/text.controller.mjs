import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { giveawayDB } from "../Models/giveaway.model.mjs";
import { paymentDB } from "../Models/payment.model.mjs";
import { userDB } from "../Models/user.model.mjs";
import { createPaymentLink } from "../Utils/oxaPay.mjs";
import { answerCallback, inviterStore, isProtected, joinChannelCheck, joinChatMessage, keys, userMention, uuid } from "../Utils/tgHelp.mjs";
import dotenv from "dotenv"
import ShortUniqueId from "short-unique-id";

dotenv.config()

api.onText(/\/start(?: (.+))?$|🔙 Back$/, async (msg, match) => {
    try {
        const chat = msg.chat
        if (chat.type !== "private") return
        const user = await userDB.findOne({
            _id: chat.id
        })
        let referType;
        if (!user) {
            inviterStore[chat.id] = match?.[1] || null
            if (inviterStore[chat.id]) {
                if (isNaN(inviterStore[chat.id]) || chat.id == inviterStore[chat.id]) {
                    return await api.sendMessage(chat.id, `<i>❌ Invalid inviter!</i>`, {
                        parse_mode: "HTML",
                        protect_content: isProtected
                    })
                }
                const userCheck = await userDB.findOne({
                    _id: inviterStore[chat.id]
                })
                if (!userCheck) {
                    inviterStore[chat.id] = botConfig.adminId
                }
                referType = `🚀 New user joined using your referral link.`
            } else {
                const userList = await userDB.aggregate([
                    {
                        $match: {
                            account_status: true
                        }
                    },
                    {
                        $sample: {
                            size: 1
                        }
                    }
                ])
                inviterStore[chat.id] = userList[0]?._id
                referType = `✨ New user joined through auto filling.`
            }
            const response = await userDB.create({
                _id: chat.id,
                first_name: chat.first_name,
                last_name: chat.last_name,
                username: chat.username,
                invited_by: inviterStore[chat.id],
                last_message_time: Math.floor(new Date().getTime()/1000)
            })
            if (response._id) {
                await userDB.updateOne({
                    _id: inviterStore[chat.id]
                }, {
                    $inc: {
                        invites: 1
                    }
                })
                await api.sendMessage(inviterStore[chat.id], `<i>${referType}\n✅ You'll get $${botConfig.amount.commission.toFixed(4)} when they activate their account (Only if your account is activated).</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
                const userCount = await userDB.countDocuments()
                const txt = `<b>🦉 Users: <code>${userCount}</code>\n🚀 UserName: ${userMention(chat.id, chat.username, chat.first_name)}\n🆔 UserID: <code>${chat.id}</code>\n☄️ InvitedBy: <code>${inviterStore[chat.id] === botConfig.adminId ? `You` : `${inviterStore[chat.id]}`}</code></b>`
                await api.sendMessage(botConfig.adminId, txt, {
                    parse_mode: "HTML"
                })
            }
        }
        const checkJoin = await joinChannelCheck(chat.id)
        if (!checkJoin) {
            const resp = joinChatMessage()
            return await api.sendMessage(chat.id, resp.text, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_markup: {
                    keyboard: resp.key,
                    resize_keyboard: true
                } 
            })
        }
        const text = `<b>🏡 Main Menu</b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                keyboard: keys.getMainKey(chat.id),
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/✅ Joined/, async msg => {
    try {
        const chat = msg.chat
        const checkJoin = await joinChannelCheck(chat.id)
        if (!checkJoin) {
            const resp = joinChatMessage()
            return await api.sendMessage(chat.id, resp.text, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_markup: {
                    keyboard: resp.key,
                    resize_keyboard: true
                }
            })
        }
        const text = `<b>🏡 Main Menu</b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                keyboard: keys.getMainKey(chat.id),
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/💶 Balance/, async (msg) => {
    try {
        const chat = msg.chat
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
        const text = `<b><u>💰 Account Balance</u>\n\n💰 Safety Deposit: <code>$${user.balance.deposits.toFixed(4)}</code>\n💶 Available Balance: <code>$${user.balance.balance.toFixed(4)}</code>\n💵 Referral Balance: <code>$${user.balance.referrals.toFixed(4)}</code>\n💷 Payout Balance: <code>$${user.balance.payouts.toFixed(4)}</code></b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/🎁 Gift$/, async (msg) => {
    try {
        const chat = msg.chat
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
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
                    "balance.balance": botConfig.amount.gift.toFixed(4)
                },
                $set: {
                    next_gift: next
                }
            })
            text = `<i>🎁 You have received: $${botConfig.amount.gift.toFixed(4)}</i>` 
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
        if (chat.type !== "private") return
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
        if (chat.type !== "private") return
        const info = await userDB.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: {
                        $count: {}  
                    },
                    totalActiveUsers: {
                        $sum: {
                            $cond: [{
                                $eq: ["$account_status", true]
                            }, 1, 0]
                        }
                    },
                    totalPayouts: {
                        $sum: "$balance.payouts"
                    }
                }
            }
        ])
        const onlineUsers = await userDB.find({})
        const online = Math.floor(Math.floor(Math.random() * ( onlineUsers.length/2 + 1) ) + onlineUsers.length/2)
        const response = info[0]
        const text = `<b>👤 Total Members: <code>${response.totalUsers}</code>\n👥 Online: <code>${online}</code>\n\n🔰 Total Activated: <code>${response.totalActiveUsers}</code>\n💷 Total Payouts: <code>$${response.totalPayouts.toFixed(4)}</code>\n\n☄️ Admin: @${botConfig.adminName}\n🚀 Chat: @${botConfig.chat}\n\n⌚ Server: <code>${new Date().toLocaleString()}</code></b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📥 Deposit$|📥 Activate$/, async (msg) => {
    try {
        const chat = msg.chat
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
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
        const text = `<b>💶 Safety Deposit (One Time)\n☑️ We will refund you this safety deposit\nwhen you complete first 5 verified referrals\n\n🆔 OrderID: <code>#${orderId()}</code>\n💵 Cash: <code>$${botConfig.amount.deposit.toFixed(4)}</code>\n⌚ Expire in 30 minutes</b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Click To Pay", url: payLink }
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
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
        const balance = user.balance.balance
        if (!user.wallet) {
            const text = `<i>❌ Set  wallet before payout.</i>`
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
        if (!user.account_status) {
            const text = `<i>❌ You have to activate your account before payout!</i>`
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                protect_content: isProtected
            })
        }
        const currentTime = Math.floor(new Date().getTime()/1000)
        if (currentTime < user.next_payout) {
            const text = `<i>❌ Next payout after ${user.next_payout - currentTime} sec.!</i>`
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                protect_content: isProtected
            })
        }
        const text = `<b>💵 Enter amount in ${botConfig.currency}</b>`
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
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
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
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
        const invites = user.invites
        const text = `<b><i>✅ Every verified referral you will get $${botConfig.amount.commission.toFixed(4)}</i>\n\n👤 You've invited: <code>${invites} Members</code>\n\n🔗 Link: https://t.me/${botConfig.botName}?start=${chat.id}</b>`
        const text1 = `✅ Every verified referral you will get $${botConfig.amount.commission.toFixed(4)}\n\n👤 You've invited: ${invites} Members\n\n🔗 Link: https://t.me/${botConfig.botName}?start=${chat.id}`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Share To Telegram", url: `https://t.me/share/url?url=${text1}` }
                    ],
                    [
                        
                        { text: "Share To Whatsapp", url: `https://api.whatsapp.com/send?text=${text1}` },
                        { text: "Share To Facebook", url: `https://facebook.com/sharer/sharer.php?u=${text1}` }
                    ],
                    [
                        { text: "Share To Twitter", url: `https://twitter.com/intent/tweet?text=${text1}`}
                    ]
                ]
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/📃 History$/, async (msg) => {
    try {
        const chat = msg.chat
        if (chat.type !== "private") return
        const user = await userDB.findOne({ _id: chat.id })
        if(!user) return
        const invites = user.invites
        const history = await paymentDB.find({ user_id: chat.id }).limit(5)
        let text = `<b>✨ Last 5 Transactions</b>`
        history.forEach((item) => {
            text += `\n\n<b>🪂 Type: <code>${item.type}</code>\n💵 Amount: <code>$${item.amount.toFixed(4)}</code>\n🆔 txID: <code>${item.txID}</code></b>` 
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

api.onText(/🔝 Top Users$/, async msg => {
    try {
        const chat = msg.chat
        if (chat.type !== "private") return
        const userList1 = await userDB.find({ invites: { $gt:0 }, account_status: true }).limit(5).sort({ invites: -1, updatedAt: -1})
        let text = `<b>🦉 Top 5 Activated Users.\n</b>`
        userList1.forEach((item) => {
            text += `\n<b>🪂 UserName: ${userMention(item._id, item.username, item.first_name)}\n🚀 Referrals: <code>${item.invites}</code></b>` 
        })
        if (userList1.length == 0) {
            text += "\n\n<code>- Nothing found!</code>"
        }
        text += `\n\n<b>🦉 Top 5 Non-Activted Users.</b>\n`
        const userList2 = await userDB.find({ invites: { $gt: 0 }, account_status: false }).limit(5).sort({ invites: -1, updatedAt: -1})
        userList2.forEach((item) => {
            text += `\n<b>🪂 UserName: ${userMention(item._id, item.username, item.first_name)}\n🚀 Referrals: <code>${item.invites}</code></b>` 
        })
        if (userList2.length == 0) {
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

api.onText(/\🌃 Events$/, async (msg) => {
    try {
        const chat = msg.chat
        if (chat.type != "private") return
        const count = await giveawayDB.countDocuments()
        const text = `<b>🧧 Giveaway ( Live )\n\n🎁 Reward: $10\n\n🪂 Joined: ${count} Members\n\n⌚ Time: <code>${new Date().toLocaleString()}</code></b>`
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_markup: {
                inline_keyboard: keys.getGiveawayKey()
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/\/tip(?: (.+))?$/, async (msg, match) => {
    try {
        const chat = msg.chat
        const user = msg.from
        if(chat.type == "channel" || chat.type == "private") return
        const amount = parseFloat(match[1]).toFixed(4)
        if (!msg.reply_to_message) {
            return await api.sendMessage(chat.id, `<i>❌ Reply to a message to tip!</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_to_message_id: msg.message_id
            })
        }
        if (isNaN(amount)) {
            return await api.sendMessage(chat.id, `<i>❌ Enter amount in USD!</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_to_message_id: msg.message_id
            })
        }
        const userinfo = msg.reply_to_message.from
        const existUser = await userDB.findOne({ _id: userinfo.id })
        if (!existUser) {
            return await api.sendMessage(chat.id, `<i>❌ ${userMention(userinfo.id, userinfo.username, userinfo.first_name)} is not a user of @${botConfig.botName}</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_to_message_id: msg.message_id
            })
        }
        const myinfo = await userDB.findOne({ _id: user.id })
        if (!myinfo) {
            return await api.sendMessage(chat.id, `<i>❌ You're not a user of @${botConfig.botName}</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_to_message_id: msg.message_id
            })
        }
        if (amount <= 0 && user.id != botConfig.adminId) {
            return await api.sendMessage(chat.id, `<i>❌ Tip amount should be greater than 0!</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_to_message_id: msg.message_id
            })
        }
        if (amount > myinfo.balance.balance) {
            return await api.sendMessage(chat.id, `<i>❌ You don't have enough balance!</i>`, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_to_message_id: msg.message_id
            })
        }
        await userDB.updateOne({ _id: user.id }, { $inc: { "balance.balance": -(amount) }})
        await userDB.updateOne({ _id: userinfo.id }, { $inc: { "balance.balance": amount } })
        return await api.sendMessage(chat.id, `<b>✅ Tipped <code>$${amount}</code>\n\n🪂 Sent: ${userMention(user.id, user.username, user.first_name)}\n🧧 Received: ${userMention(userinfo.id, userinfo.username, userinfo.first_name)}</b>`, {
            parse_mode: "HTML",
            protect_content: isProtected,
            reply_to_message_id: msg.message_id
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/🎟️ Panel$/, async msg => {
    try {
        const chat = msg.chat
        if (botConfig.adminId != chat.id) return
        const text = `<b>🎟️ Admin panel</b>`
        const key = [
            [
                { text: "📤 Broadcast", callback_data: `/admin_broadcast`}
            ], [
                { text: "ℹ️ Get User", callback_data: `/admin_getuser` },
                { text: "💧 Rain Tag", callback_data: "/admin_raintag" }
            ]
        ]
        return await api.sendMessage(chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})