import express from "express";
import { getUserProfile, login, logout, register, googleLogin, facebookLogin, changeUserPassword } from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/:id", authenticateUser, getUserProfile);
router.post("/google", googleLogin);
router.post("/facebook", facebookLogin);
router.put("/change-password", authenticateUser, changeUserPassword);


export default router;