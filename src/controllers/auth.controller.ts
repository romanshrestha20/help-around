import prisma from "../lib/prismaClient.js";
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError.js";
import { verifyAccessToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import bcrypt from 'bcrypt';
import { verifyGoogleToken } from "../services/google.service.js";
import { findOrCreateOAuthUser } from "../services/auth.service.js";
import { verifyFacebookToken } from "../services/facebook.service.js";
import crypto from "crypto";
import { sendPasswordResetConfirmation, sendPasswordResetEmail } from "../services/EmailService.js";



export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};



export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {

    // Validate input
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError("Refresh token is required", 400));

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return next(new AppError("Invalid refresh token", 401));

    const userId = decoded.userId;


    // Find stored refresh token
    const tokenHash = hashToken(refreshToken);

    // Check for token reuse
    const storedToken = await prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    // If token not found, possible reuse
    if (!storedToken) {
      // Token reuse detected → revoke all
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      return next(new AppError("Refresh token reuse detected", 401));
    }

    // Revoke current refresh token
    await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { revokedAt: new Date() } });

    // Issue new tokens
    const newAccessToken = signAccessToken({ userId });
    const newRefreshToken = signRefreshToken({ userId });

    // Store new refresh token 
    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Respond with new tokens and user info
    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        // keep minimal fields to match test expectations
      },
    });
  } catch (error) {
    next(error);
  }
};


export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {

    // Validate input
    const { firstName, lastName, email, password, dateOfBirth, gender } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password || !dateOfBirth || !gender) {
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
        dateOfBirth: new Date(dateOfBirth),
        gender,
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        image: user.image,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
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




// export const logout = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return next(new AppError("Refresh token is required", 400));
//     }


//     await prisma.refreshToken.updateMany({
//       where: {
//         tokenHash: hashToken(refreshToken)
//       },
//       data: {
//         revokedAt: new Date(),
//       }
//     });

//     res.status(200).json({ message: "Logout successful" });
//   } catch (error) {
//     next(error);
//   }
// };


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


export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get email from request body
    const { email } = req.body;

    // Basic validation
    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new AppError("If that email is registered, you will receive a password reset email shortly", 200));
    }

    // Delete old Otps
    await prisma.otp.deleteMany({
      where: { email: user.email },
    });

    // Generate OTP (6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

    // const otpHashed = crypto
    //   .createHash("sha256")
    //   .update(otp)
    //   .digest("hex");

    // Hash OTP before storing
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Store OTP in the database with expiration (e.g., 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    await prisma.otp.create({
      data: {
        email: user.email,
        otpHash: otpHash,
        expiresAt,
      },
    });

    // Send email with random 6-digit token
    await sendPasswordResetEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "If that email exists, an OTP has been sent.",
    });
  } catch (error) {
    next(error);
  }

};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    console.log('Verify OTP request body:', req.body);

    // Basic validation
    if (!email || !otp) {
      return next(new AppError("Email and OTP are required", 400));
    }

    // Hash OTP before comparing
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Check if OTP exists and is not expired and not consumed
    const storedOtp = await prisma.otp.findFirst({
      where: {
        email,
        otpHash,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedOtp) {
      return next(new AppError("Invalid or expired OTP", 400));
    }

    // Mark OTP as consumed
    await prisma.otp.update({
      where: { id: storedOtp.id },
      data: { consumed: true },
    });

    // Generate reset token
    const resetTokenPlain = crypto.randomBytes(32).toString("hex");
    const resetTokenHashed = crypto
      .createHash("sha256")
      .update(resetTokenPlain)
      .digest("hex");


    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Store reset token in the database with expiration (e.g., 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetTokenHashed,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    console.log('Reset password request body:', req.body);

    // Basic validation
    if (!token || !newPassword)
      return next(new AppError("Token and new password required", 400));

    if (newPassword.length < 6)
      return next(new AppError("Password must be at least 6 chars", 400));

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord)
      return next(new AppError("Invalid or expired reset token", 400));

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: hashedPassword },
    });

    await prisma.passwordResetToken.delete({
      where: { id: tokenRecord.id },
    });

    await sendPasswordResetConfirmation(tokenRecord.user.email);

    return res.json({
      success: true,
      message: "Password reset successful.",
    });
  } catch (error) {
    next(error);
  }
};


export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { token, email, name } = req.body;
    console.log('Google login request body:', req.body);
    console.log('Token received:', token);

    // Development mode: allow testing with email directly (check ALLOW_DEV_OAUTH env var)
    const allowDevOAuth = process.env.ALLOW_DEV_OAUTH === 'true';
    if (!token && allowDevOAuth) {
      if (!email) {
        console.error('Token or email missing. Body received:', JSON.stringify(req.body));
        return next(new AppError("Token is required. For development, you can also provide email and name.", 400));
      }

      console.log('Development mode: Using email instead of token');
      // Create a mock Google user object for testing
      const googleUser = {
        id: email.split('@')[0],
        email: email,
        name: name || email.split('@')[0],
        picture: '',
        providerId: email.split('@')[0],
        username: email.split('@')[0],
        dateOfBirth: null,
      };

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
      return res.status(200).json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    }

    // Production mode: require valid token
    if (!token) {
      console.error('Token missing. Body received:', JSON.stringify(req.body));
      return next(new AppError("Token is required. Please provide a valid Google token in the request body.", 400));
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
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
      }
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