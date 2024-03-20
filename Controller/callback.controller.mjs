import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { giveawayDB } from "../Models/giveaway.model.mjs";
import { userDB } from "../Models/user.model.mjs";
import { answerCallback, broadcast_stat, isProtected, keys } from "../Utils/tgHelp.mjs";
import cronJob from "node-cron"

api.on("callback_query", async (callback) => {
    const chat = callback.message.chat
    const data = callback.data
    const message_id = callback.message.message_id
    const params = data.split(" ")
    const command = params[0]
    params.shift()

    if (command === "/join_giveaway") {
        const user = await userDB.findOne({ _id: chat.id })
        if (!user.account_status) {
            return await api.answerCallbackQuery(callback.id, {
                text: `❌ Not eligible to join\n\n🦉 Reason: Account is not activated!`,
                show_alert: true
            })
        }
        const checkGiveaway = await giveawayDB.findOne({ _id: chat.id })
        if (checkGiveaway) {
            return await api.answerCallbackQuery(callback.id, {
                text: `❌ You're already joined`,
                show_alert: true
            })
        }
        await giveawayDB.create({
            _id: chat.id
        })
        const count = await giveawayDB.countDocuments()
        const text = `<b>🧧 Giveaway ( Live )\n\n🎁 Reward: $10\n\n🪂 Joined: ${count} Members\n\n⌚ Time: <code>${new Date().toLocaleString()}</code></b>`
        await api.editMessageText(text, {
            parse_mode: "HTML",
            chat_id: chat.id,
            message_id: message_id,
            protect_content: isProtected,
            reply_markup: {
                inline_keyboard: keys.getGiveawayKey()
            }
        })
        return await api.answerCallbackQuery(callback.id, {
            text: `✅ You're joined`,
            show_alert: true
        })
    }
    
    if (command === "/change_wallet") {
        try {
            const text = `<i>🖊️ Enter the ${botConfig.currency} (TRC20) address!</i>`
            answerCallback[chat.id] = "wallet"
            await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                protect_content: isProtected,
                reply_markup: {
                    keyboard: keys.getCancelKey(),
                    resize_keyboard: true
                }
            })
            return await api.deleteMessage(chat.id, message_id)
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/admin_broadcast") {
        try {
            const text = `<i>💬 Enter or forward the message!</i>`
            answerCallback[chat.id] = "broadcast"
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: keys.getCancelKey(),
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/stop_bcast") {
        try {
            return await api.editMessageText(`<i>✖️ Process cancelled!</i>`, {
                chat_id: chat.id,
                message_id: message_id,
                parse_mode: "HTML"
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/send_bcast") {
        try {
            const [msg_id] = params
            await api.editMessageText(`<i>✅ Broadcast initiated!</i>`, {
                chat_id: chat.id,
                message_id: message_id,
                parse_mode: "HTML"
            })
            const users = await userDB.find()
            broadcast_stat["sent"] = 0
            broadcast_stat["success"] = 0
            const totalUsers = users.length
            const cronTask = cronJob.schedule("*/2 * * * * *", async () => {
                users.splice(0, 1).forEach(async item => {
                    broadcast_stat["sent"]++
                    const user_id = item._id
                    try {
                        await api.copyMessage(user_id, chat.id, msg_id)
                        broadcast_stat["success"]++
                    } catch (err) { }

                    if (broadcast_stat["sent"] > 0 && broadcast_stat["sent"] % 100 == 0) {
                        await api.sendMessage(chat.id, `<b>✅ Broadcast Status\n\n☑️ Sent: <code>${broadcast_stat["sent"]}/${totalUsers}</code>\n✅ Success: <code>${broadcast_stat["success"]}/${totalUsers}</code>\n❌ Blocked: <code>${broadcast_stat["sent"] - broadcast_stat["success"]}/${totalUsers}</code></b>`, {
                            parse_mode: "HTML"
                        })
                    }
                    if (broadcast_stat["sent"] >= totalUsers) {
                        cronTask.stop()
                        await api.sendMessage(chat.id, `<b>✅ Broadcast completed\n\n☑️ Sent: <code>${broadcast_stat["sent"]}</code>\n✅ Success: <code>${broadcast_stat["success"]}/${totalUsers}</code>\n❌ Blocked: <code>${broadcast_stat["sent"] - broadcast_stat["success"]}/${totalUsers}</code></b>`, {
                            parse_mode: "HTML"
                        })
                        broadcast_stat["sent"] = 0
                        broadcast_stat["blocked"] = 0
                    }
                })
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/admin_getuser") {
        try {
            const text = `<i>🆔 Enter user ID or Username</i>`
            answerCallback[chat.id] = "getuserinfo"
            return await api.sendMessage(chat.id, text, {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: keys.getCancelKey(),
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

})