import express from "express";
import { getUserProfile, login, logout, register } from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/:id", authenticateUser, getUserProfile);



export default router;