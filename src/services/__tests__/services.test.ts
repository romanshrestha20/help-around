import { jest } from "@jest/globals";

// Mock Prisma client used by services
const mockPrisma = {
    oAuthAccount: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
};

await jest.unstable_mockModule("../../lib/prismaClient.js", () => ({
    default: mockPrisma,
}));

// Mock axios for Facebook service
const axiosGet = jest.fn();
await jest.unstable_mockModule("axios", () => ({
    default: { get: axiosGet },
}));

// Mock google-auth-library for Google service
const verifyIdToken = jest.fn();
await jest.unstable_mockModule("google-auth-library", () => ({
    OAuth2Client: class {
        constructor(..._args: unknown[]) { }
        verifyIdToken = verifyIdToken;
    },
}));

// Import services AFTER mocks
const { findOrCreateOAuthUser, linkOAuthProviderToUser, removeOAuthProviderFromUser } = await import("../auth.service.js");
const { verifyGoogleToken } = await import("../google.service.js");
const { verifyFacebookToken } = await import("../facebook.service.js");

describe("auth.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("findOrCreateOAuthUser returns existing linked user if OAuth account exists", async () => {
        const existingUser = { id: "u1", email: "a@b.com" };
        mockPrisma.oAuthAccount.findUnique.mockResolvedValue({ id: "oa1", user: existingUser });

        const user = await findOrCreateOAuthUser({
            provider: "GOOGLE",
            providerId: "pid-1",
            email: "a@b.com",
            firstName: "A",
            lastName: "B",
        });

        expect(mockPrisma.oAuthAccount.findUnique).toHaveBeenCalled();
        expect(user).toBe(existingUser);
        expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("findOrCreateOAuthUser links existing user by email when OAuth account missing", async () => {
        mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
        const existingUser = { id: "u2", email: "c@d.com" };
        mockPrisma.user.findUnique.mockResolvedValue(existingUser);
        mockPrisma.oAuthAccount.create.mockResolvedValue({ id: "oa2" });

        const user = await findOrCreateOAuthUser({
            provider: "FACEBOOK",
            providerId: "pid-2",
            email: "c@d.com",
            firstName: "C",
            lastName: "D",
        });

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "c@d.com" } });
        expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith({
            data: { provider: "FACEBOOK", providerId: "pid-2", userId: "u2" },
        });
        expect(user).toBe(existingUser);
    });

    test("findOrCreateOAuthUser creates user then OAuth account when neither exists", async () => {
        mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue(null);
        const createdUser = { id: "u3", email: "e@f.com" };
        mockPrisma.user.create.mockResolvedValue(createdUser);
        mockPrisma.oAuthAccount.create.mockResolvedValue({ id: "oa3" });

        const user = await findOrCreateOAuthUser({
            provider: "GOOGLE",
            providerId: "pid-3",
            email: "e@f.com",
            firstName: "E",
            lastName: "F",
            image: "img",
        });

        expect(mockPrisma.user.create).toHaveBeenCalled();
        expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith({
            data: { provider: "GOOGLE", providerId: "pid-3", userId: "u3" },
        });
        expect(user).toBe(createdUser);
    });

    test("linkOAuthProviderToUser throws when OAuth already exists", async () => {
        mockPrisma.oAuthAccount.findUnique.mockResolvedValue({ id: "oa1" });
        await expect(
            linkOAuthProviderToUser("u1", { provider: "GOOGLE", providerId: "pid", email: "x@y.com" })
        ).rejects.toThrow(/already linked/i);
    });

    test("linkOAuthProviderToUser creates OAuth when user exists and not linked", async () => {
        mockPrisma.oAuthAccount.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue({ id: "u5" });
        mockPrisma.oAuthAccount.create.mockResolvedValue({ id: "oa5" });

        const res = await linkOAuthProviderToUser("u5", { provider: "FACEBOOK", providerId: "pid5", email: "z@z.com" });
        expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith({
            data: { provider: "FACEBOOK", providerId: "pid5", userId: "u5" },
        });
        expect(res).toEqual({ id: "oa5" });
    });

    test("removeOAuthProviderFromUser prevents removing last provider without password", async () => {
        mockPrisma.oAuthAccount.findFirst.mockResolvedValue({ id: "oaX", userId: "uX" });
        mockPrisma.oAuthAccount.count.mockResolvedValue(1);
        mockPrisma.user.findUnique.mockResolvedValue({ id: "uX", passwordHash: null });

        await expect(removeOAuthProviderFromUser("uX", "GOOGLE")).rejects.toThrow(/last login method/i);
    });

    test("removeOAuthProviderFromUser deletes when multiple providers or password present", async () => {
        mockPrisma.oAuthAccount.findFirst.mockResolvedValue({ id: "oaY", userId: "uY" });
        mockPrisma.oAuthAccount.count.mockResolvedValue(2);
        mockPrisma.user.findUnique.mockResolvedValue({ id: "uY", passwordHash: null });
        mockPrisma.oAuthAccount.delete.mockResolvedValue({ id: "oaY" });

        await removeOAuthProviderFromUser("uY", "FACEBOOK");
        expect(mockPrisma.oAuthAccount.delete).toHaveBeenCalledWith({ where: { id: "oaY" } });
    });
});

describe("google.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("verifyGoogleToken returns mapped payload", async () => {
        verifyIdToken.mockResolvedValue({
            getPayload: () => ({
                sub: "sub123",
                email: "g@example.com",
                given_name: "G",
                family_name: "Ex",
                picture: "pic",
            }),
        });

        const res = await verifyGoogleToken("valid.token.parts");
        expect(res).toEqual({
            providerId: "sub123",
            email: "g@example.com",
            firstName: "G",
            lastName: "Ex",
            image: "pic",
        });
    });

    test("verifyGoogleToken throws on invalid payload", async () => {
        verifyIdToken.mockResolvedValue({ getPayload: () => null });
        await expect(verifyGoogleToken("bad.token")).rejects.toThrow(/invalid google token/i);
    });
});

describe("facebook.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("verifyFacebookToken returns mapped payload", async () => {
        axiosGet.mockResolvedValue({
            data: {
                id: "fb123",
                email: "f@example.com",
                first_name: "F",
                last_name: "Bk",
                picture: { data: { url: "pic" } },
            },
        });

        const res = await verifyFacebookToken("valid-token");
        expect(res).toEqual({
            providerId: "fb123",
            email: "f@example.com",
            firstName: "F",
            lastName: "Bk",
            image: "pic",
        });
    });

    test("verifyFacebookToken throws on invalid token", async () => {
        axiosGet.mockResolvedValue({ data: {} });
        await expect(verifyFacebookToken("bad-token")).rejects.toThrow(/invalid facebook token/i);
    });
});

