import jwt from 'jsonwebtoken';
import AppError from './appError.js';
import 'dotenv/config';



export interface JwtPayload {
    userId: string;
}

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
    throw new AppError("JWT_SECRET is not defined in environment variables", 500);
}


// Function to sign a JWT token with a payload
export const signToken = (token: JwtPayload): string => {
    return jwt.sign(token, JWT_SECRET as string, { expiresIn: '1h' });
};

// Function to verify a JWT token and return the decoded payload
export const verifyToken = (token: string): JwtPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET as string) as JwtPayload;
        if (typeof decoded !== 'object' || !("userId" in decoded)) {
            throw new AppError('Invalid token payload', 401);
        }

        return decoded as JwtPayload;
    } catch (error) {
        throw new AppError('Invalid or expired token', 401);
    }
};

