import { Router } from "express"
import paymentController from "../Controller/payment.controller.mjs"

const app = Router()

app.post("/callback", paymentController.paymentCallback)

export default app