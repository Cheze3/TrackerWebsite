import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

prisma.$connect().catch((err) => {
  console.error('Failed to connect to the database:', err);
  process.exit(1);
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;