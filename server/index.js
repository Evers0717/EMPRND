import express from "express";
import cors from "cors";
import { PORT } from "./config.js";
import indexRoutes from "./routes/index.routes.js";
import userRoutes from "./routes/user.routes.js";
import bookRoutes from "./routes/book.routes.js";
import genreRoutes from "./routes/genre.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.json());
app.use(cors());
app.use(indexRoutes);
app.use(userRoutes);
app.use(bookRoutes);
app.use(genreRoutes);
app.use(cartRoutes);
app.use(invoiceRoutes);
app.listen(PORT);
const appRoot = path.resolve(__dirname, ".."); // apunta a la carpeta EMPRND
app.use("/invoices", express.static(path.join(appRoot, "invoices")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log("Server is running on port " + PORT);
