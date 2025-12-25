import { describe, it, beforeEach, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from "express";
import type { Mock } from '@jest/globals';

// Create mock objects before importing modules
const mockPrisma = {
  user: {
    findUnique: jest.fn() as unknown as Mock,
    update: jest.fn() as unknown as Mock,
    delete: jest.fn() as unknown as Mock,
  },
};

// Mock the modules
jest.unstable_mockModule('../../lib/prismaClient', () => ({
  default: mockPrisma,
}));

// Now import the controller (this must happen after mocking)
const {
  getUserById,
  updateUserProfile,
  deleteUserAccount,
} = await import("../user.controller");

describe("User Controller", () => {
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
    mockPrisma.user.update.mockClear();
    mockPrisma.user.delete.mockClear();
  });

  describe("getUserById", () => {
    it("should get user by ID successfully", async () => {
      const mockUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        imagel: "https://example.com/image.jpg",
        createdAt: new Date(),
      };

      req.user = { userId: "user-123" };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await getUserById(req as Request, res as Response, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          imagel: true,
          createdAt: true,
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        user: mockUser,
      });
    });

    it("should return error if user is not authenticated", async () => {
      req.user = undefined;

      await getUserById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unauthorized",
          statusCode: 401,
        })
      );
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should return error if user not found", async () => {
      req.user = { userId: "nonexistent-user" };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await getUserById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User not found",
          statusCode: 404,
        })
      );
    });

    it("should handle database errors", async () => {
      req.user = { userId: "user-123" };

      const dbError = new Error("Database connection failed");
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(dbError);

      await getUserById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile successfully", async () => {
      const mockUpdatedUser = {
        id: "user-123",
        firstName: "Jane",
        lastName: "Smith",
        email: "john@example.com",
        createdAt: new Date(),
      };

      req.user = { userId: "user-123" };
      req.body = {
        firstName: "Jane",
        lastName: "Smith",
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await updateUserProfile(req as Request, res as Response, next);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          firstName: "Jane",
          lastName: "Smith",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "User profile updated successfully",
        user: mockUpdatedUser,
      });
    });

    it("should return error if user is not authenticated", async () => {
      req.user = undefined;
      req.body = {
        firstName: "Jane",
        lastName: "Smith",
      };

      await updateUserProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unauthorized",
          statusCode: 401,
        })
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should update profile with partial data", async () => {
      const mockUpdatedUser = {
        id: "user-123",
        firstName: "Jane",
        lastName: "Doe",
        email: "john@example.com",
        createdAt: new Date(),
      };

      req.user = { userId: "user-123" };
      req.body = {
        firstName: "Jane",
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await updateUserProfile(req as Request, res as Response, next);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          firstName: "Jane",
          lastName: undefined,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should handle database errors", async () => {
      req.user = { userId: "user-123" };
      req.body = {
        firstName: "Jane",
        lastName: "Smith",
      };

      const dbError = new Error("Database update failed");
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(dbError);

      await updateUserProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it("should handle user not found during update", async () => {
      req.user = { userId: "nonexistent-user" };
      req.body = {
        firstName: "Jane",
        lastName: "Smith",
      };

      const notFoundError = new Error("Record to update not found");
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(notFoundError);

      await updateUserProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });
  });

  describe("deleteUserAccount", () => {
    it("should delete user account successfully", async () => {
      req.user = { userId: "user-123" };

      (mockPrisma.user.delete as jest.Mock).mockResolvedValue({
        id: "user-123",
      });

      await deleteUserAccount(req as Request, res as Response, next);

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "User account deleted successfully",
      });
    });

    it("should return error if user is not authenticated", async () => {
      req.user = undefined;

      await deleteUserAccount(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Unauthorized",
          statusCode: 401,
        })
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      req.user = { userId: "user-123" };

      const dbError = new Error("Database delete failed");
      (mockPrisma.user.delete as jest.Mock).mockRejectedValue(dbError);

      await deleteUserAccount(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it("should handle user not found during deletion", async () => {
      req.user = { userId: "nonexistent-user" };

      const notFoundError = new Error("Record to delete does not exist");
      (mockPrisma.user.delete as jest.Mock).mockRejectedValue(notFoundError);

      await deleteUserAccount(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(notFoundError);
    });
  });
});
