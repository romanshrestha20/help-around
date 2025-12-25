

import app from './app.js';
import prisma from './lib/prismaClient.js';
import dotenv from 'dotenv';
dotenv.config();


const PORT: number = parseInt(process.env.PORT || "3000", 10);

(async () => {
    try {
        await prisma.$connect();
        console.log("Database connected");
    } catch (err) {
        console.error("Database connection error:", err);
        process.exit(1);
    }
})();
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});