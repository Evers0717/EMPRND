import { Router } from "express";
import { client } from "../db.js";

const router = Router();

router.get("/ping", async (req, res) => {
  const result = await client.query("SELECT * FROM users");
  console.log(result);
  res.json(result);
});

export default router;
