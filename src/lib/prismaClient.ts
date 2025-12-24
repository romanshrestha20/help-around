import { PrismaClient } from "../../prisma/generated/client.js";  // use .js for ESM

const prisma = new PrismaClient();

export default prisma;