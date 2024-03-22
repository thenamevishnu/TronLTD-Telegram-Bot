import express from "express"
import env from "dotenv"
import * as db from "./Config/Database.mjs"
import cronJob from "node-cron"
import axios from "axios"
import serverRoute from "./Routes/server.route.mjs"
import paymentRoute from "./Routes/payment.route.mjs"
import "./Controller/text.controller.mjs"
import "./Controller/message.controller.mjs"
import "./Controller/callback.controller.mjs"
import api from "./Config/Telegram.mjs"
import { userDB } from "./Models/user.model.mjs"
import { botConfig } from "./Config/Bot.mjs"

env.config()
db.dbConnect()

const app = express()

cronJob.schedule("* * * * *", async () => {
    axios.get(`${process.env.SERVER}`).then(({ data: resData }) => {
        console.log("Server wokeup")
    }).catch(err => {
        console.log(err.message)
    })
})

cronJob.schedule("*/5 * * * * *", async () => {
    try {
        const randomUser = await userDB.aggregate([{ $sample: { size: 1 } }])
        const id = randomUser[0]?._id
        try {
            const response = await api.getChat(id)
            console.log("Alive: " + response.id)
            const info = await userDB.findOne({ _id: response.id })
            const inviter = info.invited_by
            const inviterInfo = await userDB.findOne({ _id: inviter })
            if (!inviterInfo) {
                await userDB.updateOne({ _id: response.id }, { $set: { invited_by: botConfig.adminId } })
                await userDB.updateOne({ _id: botConfig.adminId },{$inc:{invites: 1}})
                console.log("Inviter of " + response.id + " changed to " + botConfig.adminId)
            }
        } catch (err) {
            await userDB.deleteOne({ _id: id })
            console.log("Deleted: "+id)
        }
    } catch (err) {
        console.log(err.message)
    }
})

app.use(express.json())

app.use("/", serverRoute)
app.use("/payment", paymentRoute)

app.listen(4001, () => {
    console.log("Server started!")
})