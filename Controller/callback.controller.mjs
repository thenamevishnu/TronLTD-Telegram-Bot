import { botConfig } from "../Config/Bot.mjs";
import api from "../Config/Telegram.mjs";
import { answerCallback, answerStore, isProtected, keys } from "../Utils/tgHelp.mjs";

api.on("callback_query", async (callback) => {
    const chat = callback.message.chat
    const data = callback.data
    const message_id = callback.message.message_id
    const params = data.split()
    const command = params[0]
    params.shift()

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

    if (command === "/send_broadcast") {
        try {
            const text = `<i>📧 Create or forward a message to broadcast!</i>`
            answerCallback[chat.id] = "broadcast"
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