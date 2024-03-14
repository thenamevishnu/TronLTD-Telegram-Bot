import { Schema, model } from "mongoose";

const user = new Schema({
    _id: {
        type: Number,
        unique: true
    },
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String
    },
    username: {
        type: String
    },
    invited_by: {
        type: Number
    },
    invites: {
        type: Number  
    },
    account_status: {
        type: Boolean,
        default: false
    },
    balance: {
        deposits: {
            type: Number,
            default: 0
        },
        balance: {
            type: Number,
            default: 0
        },
        referrals: {
            type: Number,
            default: 0
        },
        payouts: {
            type: Number,
            default: 0
        }
    },
    next_gift: {
        type: Number,
        default: 0
    },
    wallet: {
        type: String
    }
}, {
    timestamps: true
})

export const userDB = model("users", user)