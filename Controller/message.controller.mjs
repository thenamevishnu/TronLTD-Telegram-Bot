import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { userDB } from "../Models/user.model.mjs";
import { createPayout } from "../Utils/oxaPay.mjs";
import { answerCallback, isProtected, isValidTRXAddress, keys } from "../Utils/tgHelp.mjs";
import dotenv from "dotenv"

dotenv.config()

api.on("message", async (msg) => {
    const chat = msg.chat
    if (chat.type !== "private") return 
    const callback = answerCallback[chat.id]

    const check = await userDB.findOne({ _id: chat.id }, { account_status: 1 })
    
    if (!check?.account_status) {
        await api.sendMessage(chat.id, `<i>🦉 Active your account by one time safety deposit\n\n✅ Benifit: ${botConfig.amount.commission} ${botConfig.currency} per refer and minimum payout ${botConfig.amount.withdraw} ${botConfig.currency}\n\n💵 Refer one, Withdraw instantly.\n\n⚠️ This message will be disabled after account activated!\n\nFor more join: @${botConfig.chat}</i>`, {
            parse_mode: "HTML",
            protect_content: isProtected
        })
    }

    if (msg.text === "❌ Cancel") {
        try {
            answerCallback[chat.id] = null
            return await api.sendMessage(chat.id, `<i>✖️ Operation cancelled!</i>`, {
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
    }

    if (callback === "calculator") {
        try {
            if (!msg.text) {
                return await api.sendMessage(chat.id, `<i>❌ Enter valid number</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            const returnAmount = (botConfig.amount.deposit * parseInt(msg.text)).toFixed(4)
            answerCallback[chat.id] = null
            const text = `<b>👥 Referral Count: <code>${parseInt(msg.text)}</code>\n\n💶 Per Refer: <code>${botConfig.amount.deposit.toFixed(4)} ${botConfig.currency}</code>\n\n💰 Total Earn: <code>${returnAmount} ${botConfig.currency}</code></b>`
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
    }

    if (callback === "payout") {
        try {
            if (!msg.text) {
                return await api.sendMessage(chat.id, `<i>❌ Enter valid number</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            const amount = Number(msg.text)
            const allowed = new Array(40).fill(0).map((_, index) => botConfig.amount.withdraw * (index + 1))
            if (amount > allowed[allowed.length - 1]) {
                return await api.sendMessage(chat.id, `<i>❌ Maximum payout at a time is ${allowed[allowed.length - 1]} ${botConfig.currency}.</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }  
            if (!allowed.includes(amount)) {
                return await api.sendMessage(chat.id, `<i>❌ Enter valid amount and it should be multiple of ${botConfig.amount.withdraw}.</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            const user = await userDB.findOne({ _id: chat.id })
            const balance = user.balance.balance
            if (amount < botConfig.amount.withdraw || amount > balance) {
                return await api.sendMessage(chat.id, `<i>❌ Minimum withdraw: ${botConfig.amount.withdraw} ${botConfig.currency} and maximum withdraw is ${balance.toFixed(4)} ${botConfig.currency}</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            answerCallback[chat.id] = null
            const { status: payoutStatus } = await createPayout(
                chat.id,
                user.wallet,
                amount,
                process.env.PAYMENT_CALLBACK
            )
            if (payoutStatus) {
                await userDB.updateOne({
                    _id: chat.id
                }, {
                    $inc: {
                        "balance.balance": -(amount),
                        "balance.payouts": amount
                    }
                })
            }
            const text = `<b>✅ Payout requested: ${payoutStatus || "Failed"}</b>`
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
    }

    if (callback === "wallet") {
        try {
            if (!msg.text) {
                return await api.sendMessage(chat.id, `<i>❌ Enter valid address</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            const isOK = isValidTRXAddress(msg.text)
            if (!isOK) {
                return await api.sendMessage(chat.id, `<i>❌ Enter valid address</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            await userDB.updateOne({
                _id: chat.id
            }, {
                $set: {
                    wallet: msg.text
                }
            })
            answerCallback[chat.id] = null
            const text = `<b>✅ OK: <code>${msg.text}</code></b>`
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
    }
})