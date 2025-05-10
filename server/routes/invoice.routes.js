import { Router } from "express";
import {
  confirmPayment,
  createInvoice,
  sendInvoiceEmail,
  getUserInvoicesByPaymentId,
  getUserPayments,
} from "../controllers/invoice.controllers.js";

const router = Router();

router.put("/confirmPayment/:id", confirmPayment);
router.post("/createInvoice/:paymentId", createInvoice);
router.post("/sendInvoiceEmail/:InvoiceId", sendInvoiceEmail);
router.get("/getUserPayments/:id_user", getUserPayments);
router.post("/getUserInvoices", getUserInvoicesByPaymentId);

export default router;
