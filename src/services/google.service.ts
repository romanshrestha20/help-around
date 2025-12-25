import { OAuth2Client } from "google-auth-library";


const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/auth/google/callback"
);

export interface GoogleUserPayload {
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    image?: string;
}


export const verifyGoogleToken = async (token: string): Promise<GoogleUserPayload> => {

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
        throw new Error("Invalid Google token");
    }

    return {
        providerId: payload.sub,
        email: payload.email || "",
        firstName: payload.given_name || "",
        lastName: payload.family_name || "",
        image: payload.picture,
    };
};