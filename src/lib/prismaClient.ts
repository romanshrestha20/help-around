import { PrismaClient } from "../../prisma/generated/client.js";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;