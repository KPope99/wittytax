import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

let prisma: PrismaClient;

function initPrisma(): PrismaClient {
  if (prisma) return prisma;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, Turso is required
  if (isProduction && !tursoUrl) {
    throw new Error('TURSO_DATABASE_URL is required in production');
  }

  if (tursoUrl) {
    console.log('Initializing Turso connection to:', tursoUrl);

    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoToken,
    });

    prisma = new PrismaClient({ adapter });
    console.log('🚀 Connected to Turso database');
  } else {
    // Local SQLite for development only
    prisma = new PrismaClient();
    console.log('💾 Connected to local SQLite database');
  }

  return prisma;
}

// Initialize immediately since dotenv loads first via ts-node
initPrisma();

export { prisma };
