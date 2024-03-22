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
            await api.getChat(id)
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