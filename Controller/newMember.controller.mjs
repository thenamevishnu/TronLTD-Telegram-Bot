import api from "../Config/Telegram.mjs";

api.on("new_chat_members", async msg => {
    try {
        api.deleteMessage(msg.chat.id, msg.message_id)
    } catch (err) {
        return console.log(err.message)
    }
})