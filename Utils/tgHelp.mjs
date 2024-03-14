import { botConfig } from "../Config/Bot.mjs"
import { userDB } from "../Models/user.model.mjs"
import { v4 as uuidv4 } from "uuid"

export const isProtected = true

export const answerCallback = {}
export const answerStore = {}

export const uuid = () => uuidv4()

export const userMention = (userid, username, firstname) => {
    const mention = username ? `@${username}` : `<a href='tg://user?id=${userid}'>${firstname}</a>`
    return mention
}

export const isValidTRXAddress = (address) => {
    const trxAddressRegex = /^(T[0-9a-zA-Z]{33})$/;
    return trxAddressRegex.test(address);
}

export const keys = {
    getMainKey: async (id) => {
        const user = await userDB.findOne({ _id: id })
        const balance = user.balance.balance.toFixed(4)
        const key = [
            [`💶 You have: ${balance} ${botConfig.currency}`],
            [`📥 Deposit`, `🎁 Gift`, `📤 Payout`],
            [`⚙️ Settings`, `🪂 Referral`, `📃 History`],
            [`📊 Bot Status`]
        ]
        return key
    },
    getBackKey: () => {
        const key = [
            ["🔙 Back"]
        ]
        return key
    },
    getCancelKey: () => {
        const key = [
            ["❌ Cancel"]
        ]
        return key
    }
}