import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import path from 'path';

const dbPath = process.env.DATABASE_URL || 'file:' + path.join(__dirname, '..', 'prisma', 'wittytax.db');

const libsql = createClient({
  url: dbPath,
});

const adapter = new PrismaLibSql(libsql);

export const prisma = new PrismaClient({ adapter });
