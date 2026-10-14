import os from "node:os";
import path from "node:path";

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

export function resolveDataDirectory(): string {
  const configured = process.env.JOB_HUNTER_DATA_DIR;
  return path.resolve(/*turbopackIgnore: true*/ expandHome(configured ?? path.join(os.homedir(), "Documents", "JobHunter", "data")));
}

export function resolveDatabasePath(): string {
  const configured = process.env.JOB_HUNTER_DB_PATH;
  return path.resolve(/*turbopackIgnore: true*/ expandHome(configured ?? path.join(resolveDataDirectory(), "job-hunter.sqlite")));
}

export function resolveDocumentsDirectory(): string {
  const configured = process.env.JOB_HUNTER_DOCUMENTS_DIR;
  return path.resolve(/*turbopackIgnore: true*/
    expandHome(configured ?? path.join(os.homedir(), "Documents", "JobHunter", "documents")),
  );
}

export function resolveBackupsDirectory(): string {
  return path.join(resolveDataDirectory(), "backups");
}

export const refreshIntervalMs = Math.max(
  3_000,
  Number(process.env.NEXT_PUBLIC_REFRESH_MS ?? 10_000),
);
