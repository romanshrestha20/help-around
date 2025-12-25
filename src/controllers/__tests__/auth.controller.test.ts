import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from "express";
import type { Mock } from '@jest/globals';

// Create mock functions that will be shared between default and named exports
const hashMock = jest.fn() as unknown as Mock;
const compareMock = jest.fn() as unknown as Mock;


const mockPrisma = {
  user: {
    findUnique: jest.fn() as unknown as Mock,
    create: jest.fn() as unknown as Mock,
    update: jest.fn() as unknown as Mock,
  },
};

const mockBcrypt = {
  hash: hashMock,
  compare: compareMock,
  default: {
    hash: hashMock,
    compare: compareMock,
  },
};

const mockJwt = {
  signToken: jest.fn() as unknown as Mock,
};

// Mock the modules
jest.unstable_mockModule('../../lib/prismaClient', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('bcrypt', () => ({
  default: mockBcrypt.default,
  ...mockBcrypt,
}));

jest.unstable_mockModule('../../utils/jwt', () => mockJwt);

// Now import the controller (this must happen after mocking)
const {
  login,
  logout,
  register,
  getUserProfile,
  changeUserPassword,
} = await import("../auth.controller");

describe("Auth Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: Mock;
  let statusMock: Mock;

  beforeEach(() => {
    jsonMock = jest.fn() as unknown as Mock;
    statusMock = jest.fn().mockReturnValue({ json: jsonMock }) as unknown as Mock;
    
    req = {
      body: {},
      user: undefined,
    };
    res = {
      status: statusMock,
      json: jsonMock,
    };
    next = jest.fn();

    // Clear all mocks before each test
    mockPrisma.user.findUnique.mockClear();
    mockPrisma.user.create.mockClear();
    mockPrisma.user.update.mockClear();
    hashMock.mockClear();
    compareMock.mockClear();
    mockJwt.signToken.mockClear();
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
      mockJwt.signToken.mockReturnValue("mock-token");

      await register(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(hashMock).toHaveBeenCalledWith("password123", 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          passwordHash: "hashedPassword",
        },
      });
      expect(mockJwt.signToken).toHaveBeenCalledWith({ userId: "user-123" });
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "User registered successfully",
        token: "mock-token",
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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: "john@example.com",
      });

      await register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User already exists",
          statusCode: 400,
        })
      );
    });

    it("should handle database errors", async () => {
      req.body = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
      };

      const dbError = new Error("Database error");
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(dbError);

      await register(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (compareMock as jest.Mock).mockResolvedValue(true);
      (mockJwt.signToken as jest.Mock).mockReturnValue("mock-token");

      await login(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(compareMock).toHaveBeenCalledWith("password123", "hashedPassword");
      expect(mockJwt.signToken).toHaveBeenCalledWith({ userId: "user-123" });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Login successful",
        token: "mock-token",
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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (compareMock as jest.Mock).mockResolvedValue(false);

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
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(dbError);

      await login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      await logout(req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Logout successful. Please delete your token on client-side.",
      });
    });

    it("should handle errors", async () => {
      const error = new Error("Unexpected error");
      statusMock.mockImplementation(() => {
        throw error;
      });

      await logout(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

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
          imageUrl: true,
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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(dbError);

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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (compareMock as jest.Mock).mockResolvedValue(true);
      (hashMock as jest.Mock).mockResolvedValue("newHashedPassword");
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (compareMock as jest.Mock).mockResolvedValue(false);

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

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (compareMock as jest.Mock).mockResolvedValue(true);

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
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(dbError);

      await changeUserPassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});