import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// @prisma/adapter-libsql serializes every query through a mutex that is
// scoped per PrismaClient instance (see async-mutex usage in the adapter's
// source) — a single shared PrismaClient can only run one query at a time,
// regardless of how many concurrent requests Node is handling. Measured
// under concurrent load: a single instance plateaus around 3 req/sec with
// multi-second latency; a small pool of independent instances (each with
// its own mutex) gave ~3.5x throughput and roughly halved latency, since
// their queries genuinely run in parallel instead of queuing.
//
// `prisma` (this single instance) stays the one used for writes and
// transactions, where executing every statement through the same adapter
// matters for correctness. `getReadClient()` round-robins across a
// separate pool, for read-heavy endpoints where that ordering guarantee
// isn't needed.
const READ_POOL_SIZE = 5;

let prisma: PrismaClient;
let readPool: PrismaClient[] = [];
let readPoolIndex = 0;

function createPrismaClient(tursoUrl?: string, tursoToken?: string): PrismaClient {
  if (tursoUrl) {
    const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
    return new PrismaClient({ adapter });
  }
  // Local SQLite for development only
  return new PrismaClient();
}

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
  }

  prisma = createPrismaClient(tursoUrl, tursoToken);
  console.log(tursoUrl ? '🚀 Connected to Turso database' : '💾 Connected to local SQLite database');

  readPool = Array.from({ length: READ_POOL_SIZE }, () => createPrismaClient(tursoUrl, tursoToken));

  return prisma;
}

/** Round-robins across a pool of independent PrismaClient instances, for
 * read-heavy endpoints that don't need the single shared instance's
 * ordering guarantee. Do not use this for writes or multi-statement
 * transactions — use `prisma` for those. */
function getReadClient(): PrismaClient {
  const client = readPool[readPoolIndex % readPool.length];
  readPoolIndex++;
  return client;
}

// Initialize immediately since dotenv loads first via ts-node
initPrisma();

export { prisma, getReadClient };
