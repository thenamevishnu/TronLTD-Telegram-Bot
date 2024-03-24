import { botConfig } from "../Config/Bot.mjs"
import api from "../Config/Telegram.mjs"
import { userDB } from "../Models/user.model.mjs"
import { v4 as uuidv4 } from "uuid"
import {readFileSync} from "fs"

export const isProtected = true

export const answerCallback = {}
export const answerStore = {}
export const inviterStore = {}
export const broadcast_stat = {}

export const uuid = () => uuidv4()

export const userMention = (userid, username, firstname) => {
    const mention = username ? `@${username}` : `<a href='tg://user?id=${userid}'>${firstname}</a>`
    return mention
}

export const getFAQ = () => {
    const file = JSON.parse(readFileSync("./Config/faq.json", "utf-8"))
    let text = `<b>⁉️ Frequently Asked Questions (FAQ)!</b>`
    file.forEach((item, index) => {
        text += `\n\n<b>${index+1}: ${item.question}</b>\n\n<i>- ${item.answer}</i>`
    })
    text += `\n\n<b>🚀 Chat: @${botConfig.chat}\n🛰️ Updates: @${botConfig.updates}</b>`
    return text
}

export const getUserInfo = async msgText => {
    try {
        const userinfo = await userDB.findOne({
            $or: [
                {
                    username: msgText.replace("@", "")
                }, {
                    _id: isNaN(msgText) ? 0 : Number(msgText)
                }
            ]
        })
        const text = `<b>UserName: ${userMention(userinfo._id, userinfo.username, userinfo.first_name)}\nUserID: <code>${userinfo._id}</code>\nAccount Status: <code>${userinfo.account_status ? `Activated` : `Not Activated`}</code>\nInviter: <code>${userinfo.invited_by==botConfig.adminId?`You`:userinfo.invited_by}</code>\n\n<u>Balance Info</u>\n\nSafety Deposit: <code>$${userinfo.balance.deposits.toFixed(4)}</code>\nBalance: <code>$${userinfo.balance.balance.toFixed(4)}</code>\nReferral Balance: <code>$${userinfo.balance.referrals.toFixed(4)}</code>\nPayout Balance: <code>$${userinfo.balance.payouts.toFixed(4)}</code>\n\nInvited: <code>${userinfo.invites}</code></b>`
        return text
    } catch {
        return "Error happend!"
    }
}

export const isValidTRXAddress = (address) => {
    const trxAddressRegex = /^(T[0-9a-zA-Z]{33})$/;
    return trxAddressRegex.test(address);
}

export const keys = {
    getMainKey: (user) => {
        const key = [
            [`💶 Balance`, `🪂 Referral`],
            [`📥 Activate`, `🌃 Events`, `📤 Payout`],
            [`⚙️ Settings`, `📃 History`],
            [`📊 Bot Status`,`⁉️ FAQ`, `🔝 Top Users`]
        ]
        if (user == botConfig.adminId) {
            key.push(["🎟️ Panel"])
        }
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