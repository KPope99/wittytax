import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || 'mysql://root@localhost:3306/wittytax';
const url = new URL(databaseUrl.replace('mysql://', 'http://'));

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password || undefined,
  database: url.pathname.slice(1),
  connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });
