import express from "express";
import { getUserById, updateUserProfile } from "../controllers/user.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/:id", authenticateUser, getUserById);
router.put("/:id", authenticateUser, updateUserProfile);
export default router;