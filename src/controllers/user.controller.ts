import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prismaClient.js";
import AppError from "../utils/appError.js";


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
        imagel: true,
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
    const { firstName, lastName } = req.body;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }



    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
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