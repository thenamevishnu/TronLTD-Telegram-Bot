import { botConfig } from "../Config/Bot.mjs"
import api from "../Config/Telegram.mjs"
import { userDB } from "../Models/user.model.mjs"
import { v4 as uuidv4 } from "uuid"

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

export const joinChannelCheck = async user_id => {
    const [chat1, chat2, chat3] = botConfig.chatList
    const { status: status1 } = await api.getChatMember(chat1.id, user_id)
    if (status1 != "administrator" && status1 != "creator" && status1 != "member") {
        return false
    }
    const { status: status2 } = await api.getChatMember(chat2.id, user_id)
    if (status2 != "administrator" && status2 != "creator" && status2 != "member") {
        return false
    }
    const { status: status3 } = await api.getChatMember(chat3.id, user_id)
    if (status3 != "administrator" && status3 != "creator" && status3 != "member") {
        return false
    }
    return true
}

export const joinChatMessage = () => {
    try {
        let text = `<b>🔰 Join Chats to continue</b>\n`
        botConfig.chatList.forEach(item => {
            text += `<b>\n@${item.name}</b>`
        })
        text += `<b>\n\n🚀 Press joined after joined all</b>`
        const key = [
            ["✅ Joined"]
        ]
        return {
            text: text,
            key: key
        }
    } catch (err) {
        return console.log(err.message)
    }
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
            [`📥 Deposit`, `🎁 Gift`, `📤 Payout`],
            [`⚙️ Settings`, `🌃 Events`, `📃 History`],
            [`📊 Bot Status`,`🔝 Top Users`]
        ]
        if (user == botConfig.adminId) {
            key[3].splice(1,0,"🎟️ Panel")
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