import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolveDatabasePath } from "@/lib/config";
import * as schema from "./schema";

type DatabaseState = {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const globalForDatabase = globalThis as typeof globalThis & {
  jobHunterDatabase?: DatabaseState;
};

export function getDatabase(): DatabaseState {
  if (globalForDatabase.jobHunterDatabase) return globalForDatabase.jobHunterDatabase;

  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });

  const sqlite = new Database(databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  migrate(drizzle(sqlite, { schema }), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });

  const state = { sqlite, db: drizzle(sqlite, { schema }) };
  globalForDatabase.jobHunterDatabase = state;
  return state;
}

export function closeDatabase(): void {
  globalForDatabase.jobHunterDatabase?.sqlite.close();
  delete globalForDatabase.jobHunterDatabase;
}
