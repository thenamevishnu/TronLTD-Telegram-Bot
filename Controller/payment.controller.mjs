import dotenv from "dotenv"
import crypto from "crypto"
import { paymentDB } from "../Models/payment.model.mjs"
import { userDB } from "../Models/user.model.mjs"
import { botConfig } from "../Config/Bot.mjs"
import api from "../Config/Telegram.mjs"
import { isProtected, userMention } from "../Utils/tgHelp.mjs"

dotenv.config()

const paymentCallback = async (req, res) => {
    try {
        const postData = req.body
        const apiSecretKey = postData.type === "payment" ? process.env.OXAPAY_MERCHANT : process.env.OXAPAY_PAYOUT
        const hmacHeader = req.headers['hmac']
        const calculatedHmac = crypto.createHmac("sha512", apiSecretKey).update(JSON.stringify(postData)).digest("hex")
        if (calculatedHmac === hmacHeader) {
            const paymentStatus = postData.status
            const userId = Number(postData.description)
            const trackId = Number(postData.trackId)
            const payments = await paymentDB.findOne({ trackId: trackId})
            if (postData.type === "payment") {
                if (!payments && paymentStatus === "Paid") {
                    const response = await paymentDB.create({
                        user_id: userId,
                        type: postData.type,
                        amount: postData.payAmount,
                        currency: postData.payCurrency,
                        txID: postData.txID,
                        trackId: postData.trackId,
                        orderId: postData.orderId,
                        address: postData.address,
                        status: postData.status
                    })
                    if (response._id) {
                        const user = await userDB.findOne({ _id: userId })
                        const lvl1 = await userDB.findOne({ _id: user.invited_by })
                        const lvl2 = await userDB.findOne({ _id: lvl1.invited_by })
                        const lvl3 = await userDB.findOne({ _id: lvl2.invited_by })
                        await userDB.updateOne({
                            _id: userId
                        }, {
                            $inc: {
                                "balance.deposits": botConfig.amount.deposit,
                            },
                            $set: {
                                account_status: true
                            }
                        })
                        const lvl1UpdateUser = await userDB.updateOne({
                            _id: lvl1._id,
                            account_status: true
                        }, {
                            $inc: {
                                "balance.balance": botConfig.amount.commission,
                                "balance.referrals": botConfig.amount.commission
                            }
                        })
                        const lvl2pdateUser = await userDB.updateOne({
                            _id: lvl2._id,
                            account_status: true
                        }, {
                            $inc: {
                                "balance.balance": botConfig.amount.otherLevel_commission,
                                "balance.referrals": botConfig.amount.otherLevel_commission
                            }
                        })
                        const lvl3UpdateUser = await userDB.updateOne({
                            _id: lvl3._id,
                            account_status: true
                        }, {
                            $inc: {
                                "balance.balance": botConfig.amount.otherLevel_commission,
                                "balance.referrals": botConfig.amount.otherLevel_commission
                            }
                        })
                        await api.sendMessage(userId, `<b>✅ Payment is confirmed by the network.</b>`, {
                            parse_mode: "HTML",
                            protect_content: isProtected
                        })
                        if (lvl1UpdateUser.matchedCount == 1 && lvl1UpdateUser.modifiedCount == 1) {
                            try {
                                await api.sendMessage(lvl1._id, `<i>✅ Referral commission added (Level 1): $${botConfig.amount.commission}</i>`, {
                                    parse_mode: "HTML",
                                    protect_content: isProtected
                                })
                            } catch (err) {
                                console.log(err.message)
                            }
                        }
                        if (lvl2pdateUser.matchedCount == 1 && lvl2pdateUser.modifiedCount == 1) {
                            try {
                                await api.sendMessage(lvl2._id, `<i>✅ Referral commission added (Level 2): $${botConfig.amount.otherLevel_commission}</i>`, {
                                    parse_mode: "HTML",
                                    protect_content: isProtected
                                })
                            } catch (err) {
                                console.log(err.message)
                            }
                        }
                        if (lvl3UpdateUser.matchedCount == 1 && lvl3UpdateUser.modifiedCount == 1) {
                            try {
                                await api.sendMessage(lvl3._id, `<i>✅ Referral commission added (Level 3): $${botConfig.amount.otherLevel_commission}</i>`, {
                                    parse_mode: "HTML",
                                    protect_content: isProtected
                                })
                            } catch (err) {
                                console.log(err.message)
                            }
                        }
                    }
                }
            } else if (postData.type === "payout") {
                if (!payments && paymentStatus === "Complete") {
                    const response = await paymentDB.create({
                        user_id: userId,
                        type: postData.type,
                        amount: parseFloat(postData.amount),
                        currency: postData.currency,
                        txID: postData.txID,
                        trackId: postData.trackId,
                        orderId: Math.floor(new Date().getTime()/1000),
                        address: postData.address,
                        status: postData.status
                    })
                    if (response._id) {
                        await api.sendMessage(userId, `<b>✅ Payout is confirmed by the network.</b>`, {
                            parse_mode: "HTML",
                            protect_content: isProtected
                        })
                    }
                } 
            }
            return res.status(200).send({ message: "OK"})
        } else {
            return res.status(400).send({ message: "Invalid HMAC signature" })
        }
    } catch (err) {
        return res.status(500).send({ message: "Internal server error" })
    }
}

export default { paymentCallback }