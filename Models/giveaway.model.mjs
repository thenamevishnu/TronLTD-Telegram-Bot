import { Schema, model } from "mongoose";

const giveaway = new Schema({
    _id: {
        type: Number,
        required: true,
        unique: true
    }
}, {
    timestamps: true
})

export const giveawayDB = model("giveaways", giveaway)