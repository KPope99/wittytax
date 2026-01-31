import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

let prisma: PrismaClient;

function initPrisma(): PrismaClient {
  if (prisma) return prisma;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const useTurso = process.env.NODE_ENV === 'production' || !!tursoUrl;

  if (useTurso && tursoUrl) {
    console.log('Initializing Turso connection to:', tursoUrl);

    // Prisma 7 adapter expects config object directly
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoToken,
    });

    prisma = new PrismaClient({ adapter });
    console.log('🚀 Connected to Turso database');
  } else {
    prisma = new PrismaClient();
    console.log('💾 Connected to local SQLite database');
  }

  return prisma;
}

// Initialize immediately since dotenv loads first via ts-node
initPrisma();

export { prisma };
