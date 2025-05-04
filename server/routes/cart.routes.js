import e, { Router } from "express";
import {
  addBookToCart,
  getActiveCart,
  deleteBookFromCart,
} from "../controllers/cart.controllers.js";

const router = Router();

router.post("/addBookToCart", addBookToCart);
router.get("/getCartByUserId/:userId", getActiveCart);
router.delete("/deleteBookFromCart", deleteBookFromCart);

export default router;
