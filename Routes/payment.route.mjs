import { Router } from "express"
import paymentController from "../Controller/payment.controller.mjs"

const app = Router()

app.get("/callback", paymentController.paymentCallback)

export default app