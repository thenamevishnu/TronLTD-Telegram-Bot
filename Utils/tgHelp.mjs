import { botConfig } from "../Config/Bot.mjs"
import { userDB } from "../Models/user.model.mjs"
import { v4 as uuidv4 } from "uuid"

export const isProtected = true

export const answerCallback = {}
export const answerStore = {}
export const inviterStore = {}

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
    getMainKey: () => {
        const key = [
            [`💶 Balance`, `🪂 Referral`],
            [`📥 Deposit`, `🎁 Gift`, `📤 Payout`],
            [`⚙️ Settings`, `🌃 Events`, `📃 History`],
            [`📊 Bot Status`,`🔝 Top Users`]
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
    },
    getGiveawayKey: () => {
        const key = [
            [
                { text: "🚀 Join", callback_data: "/join_giveaway"}
            ]
        ]
        return key
    },
    getAdminKey: () => {
        const key = [
            [
                { text: "📧 Send Broadcast", callback_data: `/send_broadcast`}
            ]
        ]
        return key
    }
}