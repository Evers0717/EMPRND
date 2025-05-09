import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import {
  addBookToCart,
  getCartItems,
  deleteBookFromCart,
  clearCart,
  createPayment,
  uploadDeposit,
} from "../controllers/cart.controllers.js";

const router = Router();

router.post("/addBookToCart", addBookToCart);
router.post("/createPayment/:userId", createPayment);
router.post("/uploadDeposit/:userId", upload.single("deposit"), uploadDeposit);
router.get("/getCartByUserId/:userId", getCartItems);
router.delete("/clearCart/:userId", clearCart);
router.delete("/deleteBookFromCart", deleteBookFromCart);

export default router;
