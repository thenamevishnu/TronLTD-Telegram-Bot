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
    balance: {
        deposits: {
            type: Number
        },
        balance: {
            type: Number
        },
        investments: {
            type: Number
        },
        referrals: {
            type: Number
        }
    }
}, {
    timestamps: true
})

export const userDB = model("users", user)