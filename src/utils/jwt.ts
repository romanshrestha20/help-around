import jwt from 'jsonwebtoken';
import AppError from './appError.js';
import 'dotenv/config';
import { Verify } from 'node:crypto';



export interface JwtPayload {
    userId: string;
}
// Access Token
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '1h';

// Refresh Token
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const REFRESH_EXPIRY = '7d';

if (!JWT_SECRET) throw new AppError("JWT_SECRET is not defined in environment variables", 500);
if (!REFRESH_SECRET) throw new AppError("REFRESH_SECRET is not defined in environment variables", 500);




// Sign Access Token
export const signAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRY });
};


// Verify Access Token
export const verifyAccessToken = (token: string): JwtPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET as string) as JwtPayload;
        if (typeof decoded !== 'object' || !("userId" in decoded)) {
            throw new AppError('Invalid token payload', 401);
        }

        return decoded as JwtPayload;
    } catch (error) {
        throw new AppError('Invalid or expired token', 401);
    }
}


// Sign Refresh Token
export const signRefreshToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, REFRESH_SECRET as string, { expiresIn: REFRESH_EXPIRY });
};

// Verify Refresh Token
export const verifyRefreshToken = (token: string): JwtPayload => {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET as string) as JwtPayload;
        if (typeof decoded !== 'object' || !("userId" in decoded)) {
            throw new AppError('Invalid token payload', 401);
        }

        return decoded as JwtPayload;
    } catch (error) {
        throw new AppError('Invalid or expired token', 401);
    }
}



