import axios from "axios"
import env from "dotenv"
import { botConfig } from "../Config/Bot.mjs"

env.config()

export const createPaymentLink = async (user_id, amount, callbackUrl, orderId) => {
    const data = JSON.stringify({
        merchant: process.env.OXAPAY_MERCHANT,
        amount: amount,
        currency: botConfig.currency,
        lifeTime: 30,
        feePaidByPayer: 1,
        underPaidCover: 0.1,
        callbackUrl: callbackUrl,
        description: user_id,
        orderId: orderId,
    })
    const { data: response } = await axios.post(process.env.OXAPAY_REQUEST_API, data)
    return response
}

export const createPayout = async (user_id, receiver_crypto_address, amount, callbackUrl) => {
        
    const body = {
        key: process.env.OXAPAY_PAYOUT,
        address: receiver_crypto_address,
        amount: amount,
        currency: botConfig.currency,
        network: "TRC20",
        callbackUrl: callbackUrl,
        description: user_id
    }

    const { data: response } = await axios.post(process.env.OXAPAY_PAYOUT_API, body)

    return response
}

export const getPriceInUSD = async (amount, currency) => {
    const { data: response } = await axios.post(process.env.OXAPAY_PRICES_API)
    const price = response?.data[currency]
    return parseFloat(amount * price).toFixed(4)
}