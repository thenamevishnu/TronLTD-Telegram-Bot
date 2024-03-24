import api from "../Config/Telegram.mjs";

api.on("left_chat_member", async msg => {
    try {
        api.deleteMessage(msg.chat.id, msg.message_id)
    } catch (err) {
        return console.log(err.message)
    }
})