import { Router } from "express";
import {
  confirmPayment,
  createInvoice,
  sendInvoiceEmail,
} from "../controllers/invoice.controllers.js";

const router = Router();

router.put("/confirmPayment/:id", confirmPayment);
router.post("/createInvoice/:paymentId", createInvoice);
router.post("/sendInvoiceEmail/:InvoiceId", sendInvoiceEmail);

export default router;
