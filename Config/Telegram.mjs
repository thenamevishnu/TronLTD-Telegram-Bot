import Telegram from "node-telegram-bot-api"
import env from "dotenv"

env.config()

const api = new Telegram(process.env.BOT_TOKEN, {
    polling: true
})

export default api