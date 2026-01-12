import prisma from "../lib/prismaClient.js";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { verifyAccessToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import bcrypt from 'bcrypt';
import { verifyGoogleToken } from "../services/google.service.js";
import { findOrCreateOAuthUser } from "../services/auth.service.js";
import { verifyFacebookToken } from "../services/facebook.service.js";
import crypto from "crypto";



export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};



export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {

    // Validate input
    const { firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      return next(new AppError("All fields are required", 400));
    }

    if (password.length < 8) {
      return next(new AppError("Password must be at least 8 characters", 400));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError("Email already registered", 409));
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
      },
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Respond with tokens and user info
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    // Handle errors
    next(error);
  }
};


export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Email and password are required", 400));
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Respond with tokens and user info
    res.status(200).json({
      accessToken,
      refreshToken,
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




export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400));
    }


    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken)
      },
      data: {
        revokedAt: new Date(),
      }
    });

    res.status(200).json({ message: "Logout successful" });
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
        image: true,
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
    // Get user ID from authenticated request
    const userId = req.user?.userId;
    // Get new password from request body
    const { password, newPassword } = req.body;

    // Basic validation
    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!password || !newPassword) {
      return next(new AppError("Current and new passwords are required", 400));
    }
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      return next(new AppError("User not found", 404));
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new AppError("Current password is incorrect", 401));
    }

    // Validate new password
    if (newPassword.length < 8) {
      return next(new AppError("New password must be at least 8 characters", 400));
    }

    // Hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password in the database
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHashedPassword },
    });

    // Respond with success message
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};





export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { token } = req.body;

    // Basic validation
    if (!token) {
      return next(new AppError("Token is required", 400));
    }
    // Verify Google token
    const googleUser = await verifyGoogleToken(token);

    // Find or create user
    const user = await findOrCreateOAuthUser({
      provider: "GOOGLE",
      ...googleUser,
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });



    // Respond with tokens and user info
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user
    });
  } catch (error) {
    next(error);
  }
};




// Facebook Login Controller
export const facebookLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { token } = req.body;

    // Basic validation
    if (!token) {
      return next(new AppError("Token is required", 400));
    }
    // Verify Facebook token
    const facebookUser = await verifyFacebookToken(token);

    // Find or create user
    const user = await findOrCreateOAuthUser({
      provider: "FACEBOOK",
      ...facebookUser,
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user
    });
  } catch (error) {
    next(error);
  }

}