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
import "./Controller/newMember.controller.mjs"
import "./Controller/leftMember.controller.mjs"

env.config()
db.dbConnect()

const app = express()

cronJob.schedule("* * * * *", async () => {
    axios.get(`${process.env.SERVER}`).then(({ data: resData }) => {}).catch(err => {
        console.log(err.message)
    })
})

app.use(express.json())

app.use("/", serverRoute)
app.use("/payment", paymentRoute)

app.listen(4001, () => {
    console.log("Server started!")
})