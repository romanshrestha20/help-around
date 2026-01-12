import express from "express";
import {
    getUserProfile,
    login,
    logout,
    register,
    googleLogin,
    facebookLogin,
    changeUserPassword,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyOtp
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// OAuth routes
router.post("/google", googleLogin);
router.post("/facebook", facebookLogin);

// Password management
router.put("/change-password", authenticateUser, changeUserPassword);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp",  verifyOtp);
router.post("/reset-password", resetPassword);

// User profile
router.get("/me", authenticateUser, getUserProfile);

// Refresh token
router.get("/refresh", refreshToken);
export default router;