import express from "express";
import request from "supertest";
import { googleLogin, facebookLogin } from "./auth.controller.js";

import { jest } from "@jest/globals";

jest.mock("../services/google.service.js", () => ({
  verifyGoogleToken: jest.fn(async () => ({
    email: "google.user@example.com",
    firstName: "Google",
    lastName: "User",
  })),
}));

jest.mock("../services/facebook.service.js", () => ({
  verifyFacebookToken: jest.fn(async () => ({
    email: "facebook.user@example.com",
    firstName: "Facebook",
    lastName: "User",
  })),
}));

jest.mock("../services/auth.service.js", () => ({
  findOrCreateOAuthUser: jest.fn(async ({ provider, email, firstName, lastName }) => ({
    id: "user-123",
    email,
    firstName,
    lastName,
    isAdmin: false,
    provider,
  })),
}));

jest.mock("../utils/jwt.js", () => ({
  signToken: jest.fn(() => "mock.jwt.token"),
}));

// Import mocks for assertions
import { findOrCreateOAuthUser } from "../services/auth.service.js";
import { verifyGoogleToken } from "../services/google.service.js";
import { verifyFacebookToken } from "../services/facebook.service.js";
import { signToken } from "../utils/jwt.js";

const makeApp = () => {
  const app = express();
  app.use(express.json());

  app.post("/auth/google", googleLogin);
  app.post("/auth/facebook", facebookLogin);

  // Minimal error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err?.statusCode || 500).json({ message: err?.message || "Internal Server Error" });
  });

  return app;
};

describe("Auth OAuth controllers", () => {
  test("Google login: 400 when token missing", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/google").send({}); // no token
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Token is required/i);
  });

  test("Google login: 200 with token, returns user and jwt", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/google").send({ token: "valid-google-token" });

    expect(res.status).toBe(200);
    expect(verifyGoogleToken).toHaveBeenCalled();
    expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    );
    expect(signToken).toHaveBeenCalledWith({ userId: "user-123" });

    expect(res.body).toMatchObject({
      message: "Login successful",
      token: "mock.jwt.token",
      user: expect.objectContaining({
        id: "user-123",
        email: "google.user@example.com",
      }),
    });
  });

  test("Facebook login: 400 when token missing", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/facebook").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Token is required/i);
  });

  test("Facebook login: 200 with token, returns user and jwt", async () => {
    const app = makeApp();
    const res = await request(app).post("/auth/facebook").send({ token: "valid-facebook-token" });

    expect(res.status).toBe(200);
    expect(verifyFacebookToken).toHaveBeenCalled();
    expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "facebook" })
    );
    expect(signToken).toHaveBeenCalledWith({ userId: "user-123" });

    expect(res.body).toMatchObject({
      message: "Login successful",
      token: "mock.jwt.token",
      user: expect.objectContaining({
        id: "user-123",
        email: "facebook.user@example.com",
      }),
    });
  });
});