import prisma from "../lib/prismaClient.js";
import { Request, Response, NextFunction } from "express";

interface OAuthUser {
    provider: "google" | "facebook";
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    image?: string;
}


export const findOrCreateOAuthUser = async (oauthUser: OAuthUser) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: oauthUser.email },
    });

    if (existingUser) {
        return existingUser;
    }

    const newUser = await prisma.user.create({
        data: {
            firstName: oauthUser.firstName || "",
            lastName: oauthUser.lastName || "",
            email: oauthUser.email,
            image: oauthUser.image,
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            isVerified: true,
        },
    });
    return newUser;
}

export const linkOAuthProviderToUser = async (userId: string, oauthUser: OAuthUser) => {
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!existingUser) {
        throw new Error("User not found");
    }

    if (existingUser.provider) {
        throw new Error("User already linked to an OAuth provider");
    }

    const providerInUse = await prisma.user.findFirst({
        where: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
        },
    });

    if (providerInUse) {
        throw new Error("OAuth account already linked to another user");
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
        },
    });
    return user;
}

export const removeOAuthProviderFromUser = async (userId: string) => {

    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!existingUser) {
        throw new Error("User not found");
    }

    if (!existingUser.provider) {
        throw new Error("User is not linked to any OAuth provider");
    }

    if (!existingUser.passwordHash) {
        throw new Error("Cannot remove OAuth provider from a user without a password set");
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            provider: null,
            providerId: null,
        },
    });
    return user;
}
