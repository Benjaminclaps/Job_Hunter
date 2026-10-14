import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "@/db";
import { resolveBackupsDirectory } from "@/lib/config";
import { recordActivity } from "./activity";

export async function createBackup(): Promise<string> {
  const directory = resolveBackupsDirectory();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(directory, `job-hunter-${timestamp}.sqlite`);
  await getDatabase().sqlite.backup(destination);
  fs.chmodSync(destination, 0o600);
  recordActivity({ kind: "backup.created", title: "Backup local creado", detail: destination, actor: "cli" });
  return destination;
}
