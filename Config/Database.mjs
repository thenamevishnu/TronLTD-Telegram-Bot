import { connect } from "mongoose"
import dotenv from "dotenv"

dotenv.config()

export const dbConnect = () => {
    connect(process.env.DB_URL, {
        autoIndex: false
    }).then(() => {
        console.log("MongoDB Connected")
    }).catch(err => {
        console.log(err.message)
    })
}