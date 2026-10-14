import { randomUUID } from "node:crypto";
import { getDatabase } from "@/db";
import { activityEvents } from "@/db/schema";

export function recordActivity(input: {
  kind: string;
  title: string;
  detail?: string;
  entityType?: string;
  entityId?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}): void {
  getDatabase().db.insert(activityEvents).values({
    id: randomUUID(),
    actor: "system",
    ...input,
  }).run();
}
