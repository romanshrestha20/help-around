import prisma from "../lib/prismaClient.js";
import { Request, Response } from "express";
import AppError from "../utils/appError.js";

export const register = async (req: Request, res: Response, next: Function) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // 1. Validate input
    if (!firstName || !lastName || !email || !password) {
      return next(new AppError("All fields are required", 400));
    }

    if (password.length < 8) {
      return next(
        new AppError("Password must be at least 8 characters", 400)
      );
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const newUser = await prisma.user.create({
      data: { firstName, lastName, email, passwordHash: password },
    });

    return newUser;
  } catch (error) {
    AppError: throw new AppError((error as Error).message, 400);
  }
};
