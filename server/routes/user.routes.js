import { Router } from "express";
import {
  getUser,
  getUsers,
  createUser,
  getAdmin,
} from "../controllers/user.controllers.js";
const router = Router();

router.get("/getUsers", getUsers);

router.post("/getUser", getUser);

router.post("/getAdmin", getAdmin);

router.post("/CreateUser", createUser);

export default router;
