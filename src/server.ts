import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './lib/prismaClient.js';

const PORT: number = parseInt(process.env.PORT || '3004', 10);

(async () => {
    try {
        await prisma.$connect();
        console.log("Database connected");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port http://localhost:${PORT}`);
        });


    } catch (err) {
        console.error("Database connection error:", err);
        process.exit(1);
    }
})();


