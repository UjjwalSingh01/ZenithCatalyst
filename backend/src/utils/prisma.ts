import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Determine if SSL is needed based on the connection string.
// Cloud providers (Aiven, Supabase, Neon, etc.) require SSL.
// Docker / local Postgres typically does not.
const rawUrl = process.env.DATABASE_URL ?? '';
const needsSsl = /sslmode=|\.aivencloud\.com|\.supabase\.co|\.neon\.tech/i.test(rawUrl);

// Strip sslmode from the connection string — newer pg versions treat
// sslmode=require as verify-full, which rejects Aiven's self-signed certs.
// We handle SSL entirely via the Pool config instead.
const connectionString = rawUrl.replace(/[?&]sslmode=[^&]*/g, '');

const pool = new pg.Pool({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

const adapter = new PrismaPg(pool);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
