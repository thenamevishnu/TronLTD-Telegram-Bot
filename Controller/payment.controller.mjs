import dotenv from "dotenv"
import crypto from "crypto"
import { paymentDB } from "../Models/payment.model.mjs"
import { userDB } from "../Models/user.model.mjs"
import { botConfig } from "../Config/Bot.mjs"
import api from "../Config/Telegram.mjs"
import { isProtected } from "../Utils/tgHelp.mjs"

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
                        amount: parseFloat(postData.amount),
                        currency: postData.currency,
                        txID: postData.txID,
                        trackId: postData.trackId,
                        orderId: postData.orderId,
                        address: postData.address,
                        status: postData.status
                    })
                    if (response._id) {
                        const user = await userDB.findOne({ _id: userId })
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
                        const updateUser = await userDB.updateOne({
                            _id: user.invited_by,
                            account_status: true
                        }, {
                            $inc: {
                                "balance.balance": botConfig.amount.commission,
                                "balance.referrals": botConfig.amount.commission
                            }
                        })
                        if (updateUser.matchedCount == 1 && updateUser.modifiedCount == 1) {
                            await api.sendMessage(user.invited_by, `<i>✅ Referral commission added: ${botConfig.amount.commission} ${botConfig.currency}</i>`, {
                                parse_mode: "HTML",
                                protect_content: isProtected
                            })
                        }
                        await api.sendMessage(userId, `<b>✅ Payment is confirmed by the network.</b>`, {
                            parse_mode: "HTML",
                            protect_content: isProtected
                        })
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