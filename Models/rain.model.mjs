import { Schema, model } from "mongoose";

const rain = new Schema({
    _id: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        default: 0.005
    },
    claimed: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
})

export const rainDB = model("rains", rain)