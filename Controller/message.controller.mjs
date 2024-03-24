import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { rainDB } from "../Models/rain.model.mjs";
import { userDB } from "../Models/user.model.mjs";
import { createPayout } from "../Utils/oxaPay.mjs";
import { answerCallback, answerStore, getUserInfo, isProtected, isValidTRXAddress, keys } from "../Utils/tgHelp.mjs";
import dotenv from "dotenv"

dotenv.config()

api.on("message", async (msg) => {
    const chat = msg.chat
    const user = await userDB.findOne({ _id: msg.from.id })
    if(!user) return

    await userDB.updateOne({ _id: msg.from.id }, {
        $set: {
            first_name: msg.from.first_name,
            username: msg.from.username,
            last_name: msg.from.last_name,
            last_message_time: Math.floor(new Date().getTime()/1000)
        }
    })

    if (chat.type == "supergroup" || chat.type == "group") {
        if (msg?.text) {
            const tagReg = /^[a-zA-Z0-9][a-zA-Z0-9_]{3,34}$/ig
            let tag = msg.text
            if (tag[0] == "#" && tagReg.test(tag.replace("#", ""))) {
                tag = tag.replace("#", "")
                const rains = await rainDB.findOne({ _id: tag })
                const user = msg.from
                if (rains) {
                    const activate = await userDB.findOne({ _id: user.id })
                    if (!activate.account_status) {
                        return await api.sendMessage(chat.id, `<i>❌ Activate your account</i>`, {
                            parse_mode: "HTML",
                            protect_content: isProtected,
                            reply_to_message_id: msg.message_id
                        }) 
                    }      
                }
                if (rains && rains.claimed.length < 5 && !rains.claimed.includes(user.id)) {
                    await rainDB.updateOne({ _id: tag }, { $addToSet: { claimed: user.id } })
                    await userDB.updateOne({ _id: user.id }, { $inc: { "balance.balance": rains.amount } })
                    return await api.sendMessage(chat.id, `<b>✅ You've received <code>$${rains.amount}</code></b>`, {
                        parse_mode: "HTML",
                        protect_content: isProtected,
                        reply_to_message_id: msg.message_id
                    }) 
                }
                if (rains && rains.claimed.length >= 5 && rains.claimed.includes(user.id)) {
                    return await api.sendMessage(chat.id, `<b>❌ You've already claimed</b>`, {
                        parse_mode: "HTML",
                        protect_content: isProtected,
                        reply_to_message_id: msg.message_id
                    }) 
                } 
                if (rains && rains.claimed.length >= 5 && !rains.claimed.includes(user.id)) {
                    return await api.sendMessage(chat.id, `<b>❌ Tag expired</b>`, {
                        parse_mode: "HTML",
                        protect_content: isProtected,
                        reply_to_message_id: msg.message_id
                    }) 
                } 
            } 
        }
    }

    if (chat.type !== "private") return 
    const callback = answerCallback[chat.id]

    if (!answerStore[chat.id]) {
        answerStore[chat.id] = {}
    }

    if (msg.text === "❌ Cancel") {
        try {
            answerCallback[chat.id] = null
            return await api.sendMessage(chat.id, `<i>✖️ Operation cancelled!</i>`, {
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
            const text = `<b>👥 Referral Count: <code>${parseInt(msg.text)}</code>\n\n💶 Per Refer: <code>$${botConfig.amount.deposit.toFixed(4)}</code>\n\n💰 Total Earn: <code>$${returnAmount}</code></b>`
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
    }

    if (callback === "payout") {
        try {
            if (!msg.text) {
                return await api.sendMessage(chat.id, `<i>❌ Enter valid number</i>`, {
                    parse_mode: "HTML",
                    protect_content: isProtected
                })
            }
            const amount = parseFloat(msg.text).toFixed(4)
            const user = await userDB.findOne({ _id: chat.id })
            const balance = user.balance.balance
            if (amount < botConfig.amount.withdraw || amount > balance) {
                return await api.sendMessage(chat.id, `<i>❌ Minimum withdraw: $${botConfig.amount.withdraw} and maximum withdraw is $${balance.toFixed(4)}</i>`, {
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
                const currentTime = Math.floor(new Date().getTime()/1000)
                await userDB.updateOne({
                    _id: chat.id
                }, {
                    $inc: {
                        "balance.balance": -(amount),
                        "balance.payouts": amount
                    },
                    $set: {
                        next_payout: currentTime + 86400
                    }
                })
            }
            const text = `<b>✅ Payout requested: ${payoutStatus || "Failed"}</b>`
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
                    keyboard: keys.getMainKey(chat.id),
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (callback === "broadcast") {
        try {
            const message_id = msg.message_id
            answerCallback[chat.id] = null
            await api.sendMessage(chat.id, "<b>👇 Preview Message 👇</b>", {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: keys.getMainKey(chat.id),
                    resize_keyboard: true
                }
            })
            await api.copyMessage(chat.id, chat.id, message_id)
            return await api.sendMessage(chat.id, `<b>❓ Are you confirm to send this broadcast?</b>`, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `❌ Cancel`, callback_data: "/stop_bcast" },
                            { text: `✅ Send`, callback_data: `/send_bcast ${message_id}` }
                        ]
                    ]
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (callback === "getuserinfo") {
        try {
            if (!msg.text) {
                return await api.sendMessage(chat.id, `<i>❌ Invalid UserID or Username!</i>`, {
                    parse_mode: "HTML"
                })
            }   
            answerCallback[chat.id] = null
            const text = await getUserInfo(msg.text)
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: keys.getMainKey(chat.id),
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (callback === "raintag") {
        try {
            if (!msg.text) {
                return await api.sendMessage(chat.id, `<i>❌ Invalid Tag!</i>`, {
                    parse_mode: "HTML"
                })
            }
            const tagReg = /^[a-zA-Z0-9][a-zA-Z0-9_]{3,34}$/ig
            if (!tagReg.test(msg.text)) {
                return await api.sendMessage(chat.id, `<i>❌ Length should be from 4 to 35, alpha Numeric and underscore!</i>`, {
                    parse_mode: "HTML"
                })
            }
            const check = await rainDB.findOne({ _id: msg.text })
            if (check) {
                return await api.sendMessage(chat.id, `<i>❌ Already exist!</i>`, {
                    parse_mode: "HTML"
                })
            }
            answerCallback[chat.id] = null
            await rainDB.create({
                _id: `${msg.text}`
            })
            return await api.sendMessage(chat.id, `<i>✅ New Rain created: <code>#${msg.text}</code></i>`, {
                parse_mode: "HTML",
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