import express from "express"
import env from "dotenv"
import * as db from "./Config/Database.mjs"
import cronJob from "node-cron"
import axios from "axios"
import serverRoute from "./Routes/server.route.mjs"
import "./Routes/tg.route.mjs"

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

app.use(express.json())

app.use("/", serverRoute)

app.listen(4001, () => {
    console.log("Server started!")
})