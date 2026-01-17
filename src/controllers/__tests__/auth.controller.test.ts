import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from "express";

// Create mock functions that will be shared between default and named exports
const hashMock = jest.fn() as any;
const compareMock = jest.fn() as any;
const hashTokenMock = jest.fn() as any;


const mockPrisma = {
  user: {
    findUnique: jest.fn() as any,
    create: jest.fn() as any,
    update: jest.fn() as any,
  },
  refreshToken: {
    create: jest.fn() as any,
    updateMany: jest.fn() as any,
    update: jest.fn() as any,
    findFirst: jest.fn() as any,
  },
  otp: {
    create: jest.fn() as any,
    findFirst: jest.fn() as any,
    update: jest.fn() as any,
    deleteMany: jest.fn() as any,
  },
  passwordResetToken: {
    create: jest.fn() as any,
    findFirst: jest.fn() as any,
    delete: jest.fn() as any,
  },
};

const mockBcrypt = {
  hash: hashMock,
  compare: compareMock,
};

const mockJwt = {
  signAccessToken: jest.fn().mockReturnValue("mock-access-token"),
  signRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
  verifyAccessToken: jest.fn().mockReturnValue({ userId: "user-123" }),
  verifyRefreshToken: jest.fn().mockReturnValue({ userId: "user-123" }),
};


// Mock the modules
jest.unstable_mockModule('../../lib/prismaClient', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt,
  ...mockBcrypt,
}));

jest.unstable_mockModule('../../utils/jwt', () => mockJwt);

// Mock Email service
const sendPasswordResetEmailMock = jest.fn() as any;
const sendPasswordResetConfirmationMock = jest.fn() as any;
jest.unstable_mockModule('../../services/EmailService', () => ({
  sendPasswordResetEmail: sendPasswordResetEmailMock,
  sendPasswordResetConfirmation: sendPasswordResetConfirmationMock,
}));

// Now import the controller (this must happen after mocking)
const {
  login,
  logout,
  register,
  getUserProfile,
  changeUserPassword,
  refreshToken,
  hashToken,
} = await import("../auth.controller.js");

describe("Auth Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    req = {
      body: {},
      user: undefined,
    };
    res = {
      status: statusMock,
      json: jsonMock,
    } as any;
    next = jest.fn();

    // Clear all mocks before each test
    mockPrisma.user.findUnique.mockClear();
    mockPrisma.user.create.mockClear();
    mockPrisma.user.update.mockClear();
    mockPrisma.refreshToken.create.mockClear();
    mockPrisma.refreshToken.updateMany.mockClear();
    mockPrisma.refreshToken.update.mockClear();
    mockPrisma.refreshToken.findFirst.mockClear();
    mockPrisma.otp.create.mockClear();
    mockPrisma.otp.findFirst.mockClear();
    mockPrisma.otp.update.mockClear();
    mockPrisma.otp.deleteMany.mockClear();
    mockPrisma.passwordResetToken.create.mockClear();
    mockPrisma.passwordResetToken.findFirst.mockClear();
    mockPrisma.passwordResetToken.delete.mockClear();
    hashMock.mockClear();
    compareMock.mockClear();
    mockJwt.signAccessToken.mockClear();
    mockJwt.signRefreshToken.mockClear();
    mockJwt.verifyAccessToken.mockClear();
    mockJwt.verifyRefreshToken.mockClear();
    sendPasswordResetEmailMock.mockClear();
    sendPasswordResetConfirmationMock.mockClear();

  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const mockUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        passwordHash: "hashedPassword",
        isAdmin: false,
      };

      req.body = {
        firstName: "John",
        lastName: "Doe",
        email: "John@Example.com",
        password: "password123",
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      hashMock.mockResolvedValue("hashedPassword");
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: "token-123" });

      await register(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "John@Example.com" },
      });
      expect(hashMock).toHaveBeenCalledWith("password123", 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          firstName: "John",
          lastName: "Doe",
          email: "John@Example.com",
          passwordHash: "hashedPassword",
        },
      });
      expect(mockJwt.signAccessToken).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockJwt.signRefreshToken).toHaveBeenCalledWith({ userId: "user-123" });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "user-123",
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          isAdmin: false,
        },
      });
    });

    it("should return error if required fields are missing", async () => {
      req.body = {
        firstName: "John",
        email: "john@example.com",
      };

      await register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "All fields are required",
          statusCode: 400,
        })
      );
    });

    it("should return error if password is too short", async () => {
      req.body = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "short",
      };

      await register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Password must be at least 8 characters",
          statusCode: 400,
        })
      );
    });

    it("should return error if user already exists", async () => {
      req.body = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: "existing-user",
        email: "john@example.com",
      });

      await register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(Error)
      );
      // Verify the error message
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg.message).toBe("Email already registered");
      expect(errorArg.statusCode).toBe(409);
    });

    it("should handle database errors", async () => {
      req.body = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
      };

      const dbError = new Error("Database error");
      (mockPrisma.user.findUnique as any).mockRejectedValue(dbError);

      await register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("forgotPassword", () => {
    it("returns 400 when email missing", async () => {
      const { forgotPassword } = await import("../auth.controller.js");
      req.body = {};

      await forgotPassword(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Email is required", statusCode: 400 })
      );
    });

    it("calls next with 200 generic message when user not found", async () => {
      const { forgotPassword } = await import("../auth.controller.js");
      req.body = { email: "absent@example.com" };
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await forgotPassword(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/email is registered/i),
          statusCode: 200,
        })
      );
    });

    it("deletes old OTPs, stores hashed OTP, and sends email", async () => {
      const { forgotPassword } = await import("../auth.controller.js");
      req.body = { email: "user@example.com" };
      (mockPrisma.user.findUnique as any).mockResolvedValue({ id: "u1", email: "user@example.com" });

      // Make OTP deterministic: 6-digit 123456
      const spy = jest.spyOn(Math, "random").mockReturnValue(0.123456);

      await forgotPassword(req as Request, res as Response, next);

      expect(mockPrisma.otp.deleteMany).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
      // Check hashed OTP stored (sha256 of "123456")
      const createArgs = (mockPrisma.otp.create as any).mock.calls[0][0];
      expect(createArgs.data.email).toBe("user@example.com");
      expect(createArgs.data.otpHash).toHaveLength(64); // sha256 hex length
      expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
      // 6-digit OTP from Math.random() = 0.123456
      // floor(100000 + 0.123456 * 900000) => "211110"
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith("user@example.com", "211110");
      expect(statusMock).toHaveBeenCalledWith(200);
      spy.mockRestore();
    });
  });

  describe("verifyOtp", () => {
    it("returns 400 when email or otp missing", async () => {
      const { verifyOtp } = await import("../auth.controller.js");
      req.body = { email: "user@example.com" };
      await verifyOtp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Email and OTP are required", statusCode: 400 })
      );
    });

    it("returns 400 for invalid or expired OTP", async () => {
      const { verifyOtp } = await import("../auth.controller.js");
      req.body = { email: "user@example.com", otp: "999999" };
      (mockPrisma.otp.findFirst as any).mockResolvedValue(null);

      await verifyOtp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or expired OTP", statusCode: 400 })
      );
    });

    it("consumes OTP, creates reset token, returns success", async () => {
      const { verifyOtp } = await import("../auth.controller.js");
      req.body = { email: "user@example.com", otp: "123456" };
      (mockPrisma.otp.findFirst as any).mockResolvedValue({ id: "otp1" });
      (mockPrisma.user.findUnique as any).mockResolvedValue({ id: "u1", email: "user@example.com" });
      (mockPrisma.passwordResetToken.create as any).mockResolvedValue({ id: "prt1" });

      await verifyOtp(req as Request, res as Response, next);

      expect(mockPrisma.otp.update).toHaveBeenCalledWith({ where: { id: "otp1" }, data: { consumed: true } });
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: "u1",
          token: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: "OTP verified successfully" });
    });

    it("returns 404 when user not found after OTP", async () => {
      const { verifyOtp } = await import("../auth.controller.js");
      req.body = { email: "missing@example.com", otp: "123456" };
      (mockPrisma.otp.findFirst as any).mockResolvedValue({ id: "otp1" });
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await verifyOtp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "User not found", statusCode: 404 })
      );
    });
  });

  describe("resetPassword", () => {
    it("returns 400 when token or password missing", async () => {
      const { resetPassword } = await import("../auth.controller.js");
      req.body = { token: "t" };
      await resetPassword(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Token and new password required", statusCode: 400 })
      );
    });

    it("returns 400 when password too short", async () => {
      const { resetPassword } = await import("../auth.controller.js");
      req.body = { token: "t", newPassword: "123" };
      await resetPassword(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Password must be at least 6 chars", statusCode: 400 })
      );
    });

    it("returns 400 when reset token invalid or expired", async () => {
      const { resetPassword } = await import("../auth.controller.js");
      req.body = { token: "t", newPassword: "newpass123" };
      (mockPrisma.passwordResetToken.findFirst as any).mockResolvedValue(null);

      await resetPassword(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or expired reset token", statusCode: 400 })
      );
    });

    it("updates user password, deletes token, sends confirmation", async () => {
      const { resetPassword } = await import("../auth.controller.js");
      req.body = { token: "plaintexttoken", newPassword: "newpass123" };
      const tokenRecord = {
        id: "prt1",
        userId: "u1",
        user: { email: "user@example.com" },
      };
      (mockPrisma.passwordResetToken.findFirst as any).mockResolvedValue(tokenRecord);
      hashMock.mockResolvedValue("hashedNewPassword");

      await resetPassword(req as Request, res as Response, next);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { passwordHash: "hashedNewPassword" },
      });
      expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: "prt1" } });
      expect(sendPasswordResetConfirmationMock).toHaveBeenCalledWith("user@example.com");
      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: "Password reset successful." });
    });
  });

  describe("login", () => {
    it("should login user successfully with valid credentials", async () => {
      const mockUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        passwordHash: "hashedPassword",
        isAdmin: false,
      };

      req.body = {
        email: "john@example.com",
        password: "password123",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compareMock as any).mockResolvedValue(true);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: "token-123" });

      await login(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(compareMock).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(mockJwt.signAccessToken).toHaveBeenCalledWith({ userId: "user-123" });
      expect(mockJwt.signRefreshToken).toHaveBeenCalledWith({ userId: "user-123" });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "user-123",
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
          isAdmin: false,
        },
      });
    });

    it("should return error if email or password is missing", async () => {
      req.body = {
        email: "john@example.com",
      };

      await login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email and password are required",
          statusCode: 400,
        })
      );
    });

    it("should return error if user does not exist", async () => {
      req.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid email or password",
          statusCode: 401,
        })
      );
    });

    it("should return error if password is invalid", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        passwordHash: "hashedPassword",
      };

      req.body = {
        email: "john@example.com",
        password: "wrongpassword",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compareMock as any).mockResolvedValue(false);

      await login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid email or password",
          statusCode: 401,
        })
      );
    });

    it("should handle database errors", async () => {
      req.body = {
        email: "john@example.com",
        password: "password123",
      };

      const dbError = new Error("Database error");
      (mockPrisma.user.findUnique as any).mockRejectedValue(dbError);

      await login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      // The controller expects req.body to be the refreshToken string directly
      req.body = "some-refresh-token";

      // Mock updateMany to resolve successfully
      (mockPrisma.refreshToken.updateMany as any).mockResolvedValue({ count: 1 });

      await logout(req as Request, res as Response, next);

      // Verify updateMany was called
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Logout successful",
      });
    });

    it("should handle errors", async () => {
      // The controller expects req.body to be a string (refreshToken)
      // An empty string or falsy value should trigger the error
      req.body = "";

      await logout(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.any(Error)
      );
      // Verify the error message
      const errorArg = (next as any).mock.calls[0][0];
      expect(errorArg.message).toBe("Refresh token is required");
      expect(errorArg.statusCode).toBe(400);
    });
  });

  describe("getUserProfile", () => {
    it("should get user profile successfully", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        imageUrl: "https://example.com/image.jpg",
      };

      req.user = { userId: "user-123" };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);

      await getUserProfile(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
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
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        user: mockUser,
      });
    });

    it("should return error if user is not authenticated", async () => {
      req.user = undefined;

      await getUserProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unauthorized",
          statusCode: 401,
        })
      );
    });

    it("should return error if user not found", async () => {
      req.user = { userId: "nonexistent-user" };

      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await getUserProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not found",
          statusCode: 404,
        })
      );
    });

    it("should handle database errors", async () => {
      req.user = { userId: "user-123" };

      const dbError = new Error("Database error");
      (mockPrisma.user.findUnique as any).mockRejectedValue(dbError);

      await getUserProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("changeUserPassword", () => {
    it("should change password successfully", async () => {
      const mockUser = {
        id: "user-123",
        passwordHash: "oldHashedPassword",
      };

      req.user = { userId: "user-123" };
      req.body = {
        password: "oldPassword",
        newPassword: "newPassword123",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compareMock as any).mockResolvedValue(true);
      (hashMock as any).mockResolvedValue("newHashedPassword");
      (mockPrisma.user.update as any).mockResolvedValue({});

      await changeUserPassword(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(compareMock).toHaveBeenCalledWith("oldPassword", "oldHashedPassword");
      expect(hashMock).toHaveBeenCalledWith("newPassword123", 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { passwordHash: "newHashedPassword" },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Password changed successfully",
      });
    });

    it("should return error if user is not authenticated", async () => {
      req.user = undefined;
      req.body = {
        password: "oldPassword",
        newPassword: "newPassword123",
      };

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unauthorized",
          statusCode: 401,
        })
      );
    });

    it("should return error if passwords are missing", async () => {
      req.user = { userId: "user-123" };
      req.body = {
        password: "oldPassword",
      };

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Current and new passwords are required",
          statusCode: 400,
        })
      );
    });

    it("should return error if user not found", async () => {
      req.user = { userId: "user-123" };
      req.body = {
        password: "oldPassword",
        newPassword: "newPassword123",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not found",
          statusCode: 404,
        })
      );
    });

    it("should return error if current password is incorrect", async () => {
      const mockUser = {
        id: "user-123",
        passwordHash: "oldHashedPassword",
      };

      req.user = { userId: "user-123" };
      req.body = {
        password: "wrongPassword",
        newPassword: "newPassword123",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compareMock as any).mockResolvedValue(false);

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Current password is incorrect",
          statusCode: 401,
        })
      );
    });

    it("should return error if new password is too short", async () => {
      const mockUser = {
        id: "user-123",
        passwordHash: "oldHashedPassword",
      };

      req.user = { userId: "user-123" };
      req.body = {
        password: "oldPassword",
        newPassword: "short",
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      (compareMock as any).mockResolvedValue(true);

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "New password must be at least 8 characters",
          statusCode: 400,
        })
      );
    });

    it("should handle database errors", async () => {
      req.user = { userId: "user-123" };
      req.body = {
        password: "oldPassword",
        newPassword: "newPassword123",
      };

      const dbError = new Error("Database error");
      (mockPrisma.user.findUnique as any).mockRejectedValue(dbError);

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("refreshToken", () => {
    it("should return error if refresh token is missing", async () => {
      req.body = {};

      await refreshToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Refresh token is required",
          statusCode: 400,
        })
      );
    });

    it("should return error if refresh token is empty", async () => {
      req.body = { refreshToken: "" };

      await refreshToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Refresh token is required",
          statusCode: 400,
        })
      );
    });

    it("should handle invalid refresh token", async () => {
      req.body = { refreshToken: "invalid-token" };

      const tokenError = new Error("Invalid token");
      (mockJwt.verifyRefreshToken as any).mockImplementationOnce(() => {
        throw tokenError;
      });

      await refreshToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(tokenError);
    });

    it("should revoke all user tokens if token not found in DB", async () => {
      req.body = { refreshToken: "valid-token" };

      (mockJwt.verifyRefreshToken as any).mockReturnValue({ userId: "user-123" });
      (mockPrisma.refreshToken.findFirst as any).mockResolvedValue(null);
      (mockPrisma.refreshToken.updateMany as any).mockResolvedValue({ count: 5 });

      await refreshToken(req as Request, res as Response, next);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        data: { revokedAt: expect.any(Date) },
      });

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Refresh token reuse detected",
          statusCode: 401,
        })
      );
    });

    it("should successfully rotate refresh token", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      const storedToken = {
        id: "stored-token-id",
        tokenHash: "hashed-token",
        userId: "user-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };

      req.body = { refreshToken: "valid-refresh-token" };

      (mockJwt.verifyRefreshToken as any).mockReturnValue({ userId: "user-123" });
      (mockPrisma.refreshToken.findFirst as any).mockResolvedValue(storedToken);
      (mockPrisma.refreshToken.update as any).mockResolvedValue({ id: "stored-token-id" });
      (mockPrisma.refreshToken.create as any).mockResolvedValue({ id: "new-token-id" });

      await refreshToken(req as Request, res as Response, next);

      // Verify token revocation
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "stored-token-id" },
        data: { revokedAt: expect.any(Date) },
      });

      // Verify new token creation
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          tokenHash: expect.any(String),
          userId: "user-123",
          expiresAt: expect.any(Date),
        },
      });

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "user-123",
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
        },
      });
    });

    it("should verify that new refresh token is hashed before storing", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      const storedToken = {
        id: "stored-token-id",
        tokenHash: "hashed-token",
        userId: "user-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };

      req.body = { refreshToken: "valid-refresh-token" };

      (mockJwt.verifyRefreshToken as any).mockReturnValue({ userId: "user-123" });
      (mockPrisma.refreshToken.findFirst as any).mockResolvedValue(storedToken);
      (mockPrisma.refreshToken.update as any).mockResolvedValue({ id: "stored-token-id" });
      (mockPrisma.refreshToken.create as any).mockResolvedValue({ id: "new-token-id" });

      await refreshToken(req as Request, res as Response, next);

      // Get the call arguments for create
      const createCallArgs = (mockPrisma.refreshToken.create as any).mock.calls[0][0];

      // Verify that tokenHash is a hashed version of the token (not the token itself)
      expect(createCallArgs.data.tokenHash).not.toBe("mock-refresh-token");
      expect(createCallArgs.data.tokenHash).toEqual(hashToken("mock-refresh-token"));
    });

    it("should handle database errors during token lookup", async () => {
      req.body = { refreshToken: "valid-token" };

      const dbError = new Error("Database error");
      (mockJwt.verifyRefreshToken as any).mockReturnValue({ userId: "user-123" });
      (mockPrisma.refreshToken.findFirst as any).mockRejectedValue(dbError);

      await refreshToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it("should handle database errors during token creation", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      const storedToken = {
        id: "stored-token-id",
        tokenHash: "hashed-token",
        userId: "user-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };

      req.body = { refreshToken: "valid-refresh-token" };

      const createError = new Error("Create error");
      (mockJwt.verifyRefreshToken as any).mockReturnValue({ userId: "user-123" });
      (mockPrisma.refreshToken.findFirst as any).mockResolvedValue(storedToken);
      (mockPrisma.refreshToken.update as any).mockResolvedValue({ id: "stored-token-id" });
      (mockPrisma.refreshToken.create as any).mockRejectedValue(createError);

      await refreshToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(createError);
    });

    it("should handle database errors during token update/revocation", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      const storedToken = {
        id: "stored-token-id",
        tokenHash: "hashed-token",
        userId: "user-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: mockUser,
      };

      req.body = { refreshToken: "valid-refresh-token" };

      const updateError = new Error("Update error");
      (mockJwt.verifyRefreshToken as any).mockReturnValue({ userId: "user-123" });
      (mockPrisma.refreshToken.findFirst as any).mockResolvedValue(storedToken);
      (mockPrisma.refreshToken.update as any).mockRejectedValue(updateError);

      await refreshToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(updateError);
    });
  });
});