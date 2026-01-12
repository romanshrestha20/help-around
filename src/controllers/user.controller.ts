import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prismaClient.js";
import AppError from "../utils/appError.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../utils/cloudinary.js";


export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, bio } = req.body;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }



    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        bio
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      message: "User profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};


export const deleteUserAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      message: "User account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const uploadProfileImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }
    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }

    const result = await uploadToCloudinary(req.file.path, "profile_images");

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        image: result.secure_url,
        imagePublicId: result.public_id,
      },
    });

    res.status(200).json({
      message: "Profile image uploaded successfully",
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};


export const removeProfileImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }
    const image = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        image: true,
        imagePublicId: true,
      },
    });

    if (!image) {
      return next(new AppError("Image not found", 404));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.imagePublicId) {
      await deleteFromCloudinary(user.imagePublicId);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        image: null,
        imagePublicId: null
      },
    });

    res.status(200).json({
      message: "Profile image removed successfully",
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};