import express from "express";
import { getUserById, updateUserProfile, deleteUserAccount,
    uploadProfileImage, removeProfileImage
 } from "../controllers/user.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/:id", authenticateUser, getUserById);
router.put("/:id", authenticateUser, updateUserProfile);
router.delete("/:id", authenticateUser, deleteUserAccount);

router.post("/:id/upload", authenticateUser, uploadProfileImage);
router.delete("/:id/remove", authenticateUser, removeProfileImage);

export default router;