import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ESM-safe mocking using unstable_mockModule BEFORE importing router
await jest.unstable_mockModule("../../services/google.service.js", () => ({
    verifyGoogleToken: jest.fn(async (_token: string) => ({
        providerId: "google-123",
        email: "google.user@example.com",
        firstName: "Google",
        lastName: "User",
        image: "https://example.com/google.png",
    })),
}));

await jest.unstable_mockModule("../../services/facebook.service.js", () => ({
    verifyFacebookToken: jest.fn(async (_token: string) => ({
        providerId: "facebook-123",
        email: "facebook.user@example.com",
        firstName: "Facebook",
        lastName: "User",
        image: "https://example.com/facebook.png",
    })),
}));

await jest.unstable_mockModule("../../services/auth.service.js", () => ({
    findOrCreateOAuthUser: jest.fn(async ({ provider, email, firstName, lastName }) => ({
        id: "user-123",
        email,
        firstName,
        lastName,
        isAdmin: false,
        provider,
    })),
}));

await jest.unstable_mockModule("../../utils/jwt.js", () => ({
    signToken: jest.fn(() => "mock.jwt.token"),
    verifyToken: jest.fn((token: string) => ({ userId: "user-123", token })),
}));

// Dynamically import mocks for assertions and the router under test
const { verifyGoogleToken } = await import("../../services/google.service.js");
const { verifyFacebookToken } = await import("../../services/facebook.service.js");
const { findOrCreateOAuthUser } = await import("../../services/auth.service.js");
const { signToken } = await import("../../utils/jwt.js");
const { default: authRouter } = await import("../../routes/auth.route.js");

const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use("/auth", authRouter);

    // Minimal error handler compatible with AppError
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err?.statusCode || 500).json({ message: err?.message || "Internal Server Error" });
    });
    return app;
};

describe("OAuth login routes", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("POST /auth/google returns 400 when token missing", async () => {
        const app = makeApp();
        const res = await request(app).post("/auth/google").send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Token is required/i);
    });

    test("POST /auth/google returns 200 with user and jwt", async () => {
        const app = makeApp();
        const res = await request(app).post("/auth/google").send({ token: "valid-google-token" });
        // Debug output for failures
        if (res.status !== 200) {
            // eslint-disable-next-line no-console
            console.log("Google login response:", res.status, res.body);
        }

        expect(res.status).toBe(200);
        expect(verifyGoogleToken).toHaveBeenCalledWith("valid-google-token");
        expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
            expect.objectContaining({ provider: "GOOGLE", email: "google.user@example.com" })
        );
        expect(signToken).toHaveBeenCalledWith({ userId: "user-123" });

        expect(res.body).toMatchObject({
            message: "Login successful",
            token: "mock.jwt.token",
            user: expect.objectContaining({ id: "user-123", email: "google.user@example.com" }),
        });
    });

    test("POST /auth/facebook returns 400 when token missing", async () => {
        const app = makeApp();
        const res = await request(app).post("/auth/facebook").send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Token is required/i);
    });

    test("POST /auth/facebook returns 200 with user and jwt", async () => {
        const app = makeApp();
        const res = await request(app).post("/auth/facebook").send({ token: "valid-facebook-token" });
        if (res.status !== 200) {
            // eslint-disable-next-line no-console
            console.log("Facebook login response:", res.status, res.body);
        }

        expect(res.status).toBe(200);
        expect(verifyFacebookToken).toHaveBeenCalledWith("valid-facebook-token");
        expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
            expect.objectContaining({ provider: "FACEBOOK", email: "facebook.user@example.com" })
        );
        expect(signToken).toHaveBeenCalledWith({ userId: "user-123" });

        expect(res.body).toMatchObject({
            message: "Login successful",
            token: "mock.jwt.token",
            user: expect.objectContaining({ id: "user-123", email: "facebook.user@example.com" }),
        });
    });
});
