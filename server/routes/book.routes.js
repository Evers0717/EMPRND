import { Router } from "express";
import {
  createBook,
  deleteBook,
  getBook,
} from "../controllers/book.controllers.js";

const router = Router();

router.get("/getBook/:id", getBook);
router.post("/createBook", createBook);
router.delete("/deleteBook/:id", deleteBook);

export default router;
