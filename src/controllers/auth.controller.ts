import prisma from "../lib/prismaClient.js";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { signToken } from "../utils/jwt.js";
import bcrypt from 'bcrypt';
import { verifyGoogleToken } from "../services/google.service.js";
import { findOrCreateOAuthUser } from "../services/auth.service.js";
import { verifyFacebookToken } from "../services/facebook.service.js";


export const register = async (req: Request, res: Response, next: NextFunction) => {
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

    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return next(new AppError("User already exists", 400));
    }


    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = signToken({ userId: user.id })


    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const login = async (req: Request, res: Response, next: Function) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return next(new AppError("Email and password are required", 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return next(new AppError("Invalid email or password", 401));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    const token = signToken({ userId: user.id })

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    next(error);
  }
}
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Since JWT is stateless, we cannot truly invalidate it server-side
    // Client should delete the token
    res.status(200).json({
      message: "Logout successful. Please delete your token on client-side.",
    });
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        imageUrl: true,
      },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { password, newPassword } = req.body;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!password || !newPassword) {
      return next(new AppError("Current and new passwords are required", 400));
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      return next(new AppError("User not found", 404));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError("Current password is incorrect", 401));
    }

    if (newPassword.length < 8) {
      return next(new AppError("New password must be at least 8 characters", 400));
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHashedPassword },
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};




export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError("Token is required", 400));
    }
    const googleUser = await verifyGoogleToken(token);

    const user = await findOrCreateOAuthUser({
      provider: "google",
      ...googleUser,
    });

    const jwtToken = signToken({ userId: user.id });

    res.status(200).json({
      message: "Login successful",
      token: jwtToken,
      user
    });
  } catch (error) {
    next(error);
  }
};




export const facebookLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError("Token is required", 400));
    }
    const facebookUser = await verifyFacebookToken(token);

    const user = await findOrCreateOAuthUser({
      provider: "facebook",
      ...facebookUser,
    });

    const jwtToken = signToken({ userId: user.id });

    res.status(200).json({
      message: "Login successful",
      token: jwtToken,
      user
    });
  } catch (error) {
    next(error);
  }
}