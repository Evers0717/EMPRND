import { Router } from "express";
import { addGenre, getGenres } from "../controllers/genre.controllers.js";
import {
  addGenreToBook,
  getGenresByBook,
  deleteGenreFromBook,
} from "../controllers/book_genre.controllers.js";

const router = Router();

router.post("/addGenre", addGenre);
router.get("/getGenres", getGenres);
router.post("/addGenreToBook", addGenreToBook);
router.get("/getGenresByBook/:bookId", getGenresByBook);
router.delete("/deleteGenreFromBook/:bookId/:genreId", deleteGenreFromBook);

export default router;
