import prisma from "../lib/prismaClient.js";
import { Request, Response, NextFunction } from "express";

export interface OAuthUser {
    provider: "GOOGLE" | "FACEBOOK"; // match AuthProvider enum
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    image?: string;
}



export const findOrCreateOAuthUser = async (oauthUser: OAuthUser) => {
    // 1️⃣ Check if OAuth account exists
    const oauthAccount = await prisma.oAuthAccount.findUnique({
        where: {
            provider_providerId: {
                provider: oauthUser.provider,
                providerId: oauthUser.providerId,
            },
        },
        include: { user: true },
    });

    if (oauthAccount) {
        // OAuth account exists → return the linked user
        return oauthAccount.user;
    }

    // 2️⃣ Check if user exists by email
    let user = await prisma.user.findUnique({
        where: { email: oauthUser.email },
    });

    // 3️⃣ Create user if needed
    if (!user) {
        user = await prisma.user.create({
            data: {
            email: oauthUser.email,
            firstName: oauthUser.firstName || "",
            lastName: oauthUser.lastName || "",
            image: oauthUser.image,
            isVerified: true,
        },
    });
  }

    // 4️⃣ Create OAuth account linked to the user
    await prisma.oAuthAccount.create({
        data: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            userId: user.id,
        },
    });

    return user;
};


export const linkOAuthProviderToUser = async (
    userId: string,
    oauthUser: OAuthUser
) => {
    // 1️⃣ Check if OAuth account already exists
    const existingOAuth = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
              provider: oauthUser.provider,
              providerId: oauthUser.providerId,
          },
      },
  });

    if (existingOAuth) {
        throw new Error("OAuth account already linked to another user");
    }

    // 2️⃣ Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // 3️⃣ Create the OAuth account
    return prisma.oAuthAccount.create({
        data: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
          userId,
      },
  });
};


export const removeOAuthProviderFromUser = async (
    userId: string,
    provider: "GOOGLE" | "FACEBOOK"
) => {
    // Find OAuth account
    const oauthAccount = await prisma.oAuthAccount.findFirst({
        where: { userId, provider },
    });

    if (!oauthAccount) {
        throw new Error("OAuth provider not linked");
    }

    //  Count all linked OAuth accounts for this user
    const oauthCount = await prisma.oAuthAccount.count({
        where: { userId },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (oauthCount === 1 && !user?.passwordHash) {
        throw new Error(
            "Cannot remove last login method without a password set"
        );
    }

    // Delete OAuth account
    await prisma.oAuthAccount.delete({ where: { id: oauthAccount.id } });
};
