import express from "express";
import cors from "cors";
import { PORT } from "./config.js";
import indexRoutes from "./routes/index.routes.js";
import userRoutes from "./routes/user.routes.js";
import bookRoutes from "./routes/book.routes.js";
import genreRoutes from "./routes/genre.routes.js";
import cartRoutes from "./routes/cart.routes.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(indexRoutes);
app.use(userRoutes);
app.use(bookRoutes);
app.use(genreRoutes);
app.use(cartRoutes);
app.listen(PORT);

console.log("Server is running on port " + PORT);
