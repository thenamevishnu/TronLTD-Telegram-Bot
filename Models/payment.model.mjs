import { Schema, model } from "mongoose";

const payment = new Schema({
    user_id: {
        type: Number,
        required: true
    },
    type: {
        type: String
    },
    amount: {
        type: Number
    },
    currency: {
        type: String
    },
    txID: {
        type: String
    },
    trackId: {
        type: Number
    },
    orderId: {
        type: String
    },
    address: {
        type: String
    },
    status: {
        type: String
    }
}, {
    timestamps: true
})

export const paymentDB = model("payments", payment)