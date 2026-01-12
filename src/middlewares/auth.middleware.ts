import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js"
import AppError from '../utils/appError.js'


export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError("Authorization header missing or malformed", 401));
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);
        req.user = decoded;

        next();
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }
        return next(new AppError("Unauthorized access", 401));
    }

};



