import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { giveawayDB } from "../Models/giveaway.model.mjs";
import { userDB } from "../Models/user.model.mjs";
import { answerCallback, answerStore, isProtected, keys } from "../Utils/tgHelp.mjs";

api.on("callback_query", async (callback) => {
    const chat = callback.message.chat
    const data = callback.data
    const message_id = callback.message.message_id
    const params = data.split()
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
            const text = `<i>🖊️ Enter the ${botConfig.currency} address!</i>`
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

})