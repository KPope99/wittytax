import "dotenv/config";
import path from "path";
import { defineConfig } from "prisma/config";

// For Prisma CLI operations (migrate, db push), use local SQLite
// The runtime adapter handles Turso connection in the application
const localDbUrl = "file:" + path.join(__dirname, "prisma", "wittytax.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: localDbUrl,
  },
});
