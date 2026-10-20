import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client/edge';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL || '';
const adapter = new PrismaNeon({ connectionString });

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
