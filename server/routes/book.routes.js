import { Router } from "express";
import {
  createBook,
  deleteBook,
  getBook,
  getAllBooks,
  updateBook,
} from "../controllers/book.controllers.js";

const router = Router();

router.get("/getBook/:id", getBook);
router.get("/getAllBooks", getAllBooks);
router.post("/createBook", createBook);
router.put("/updateBook/:id", updateBook);
router.delete("/deleteBook/:id", deleteBook);

export default router;
