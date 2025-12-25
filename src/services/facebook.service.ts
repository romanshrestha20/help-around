import axios from 'axios';

export interface FacebookUserPayload {
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    image?: string;
}

export const verifyFacebookToken = async (token: string): Promise<FacebookUserPayload> => {
    const response = await axios.get(`https://graph.facebook.com/me`, {
        params: {
            access_token: token,
            fields: 'id,first_name,last_name,email,picture'
        }
    });

    const data = response.data;

    if (!data || !data.id) {
        throw new Error("Invalid Facebook token");
    }

    return {
        providerId: data.id,
        email: data.email || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        image: data.picture?.data?.url,
    };
};