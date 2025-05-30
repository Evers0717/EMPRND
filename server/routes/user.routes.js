import { Router } from "express";
import {
  getUser,
  getUsers,
  createUser,
} from "../controllers/user.controllers.js";
const router = Router();

router.get("/getUsers", getUsers);

router.post("/getUser", getUser);

router.post("/CreateUser", createUser);

export default router;
