import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { jobs } from "@/db/schema";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";

type JobStatus = "new" | "saved" | "dismissed" | "applied" | "archived";

export function updateJob(id: string, input: { status?: JobStatus; personalNotes?: string }) {
  const { db } = getDatabase();
  const existing = db.select().from(jobs).where(eq(jobs.id, id)).get();
  if (!existing) throw new Error("La oferta no existe.");
  if (input.personalNotes !== undefined && input.personalNotes.length > 10_000) throw new Error("Las notas superan el máximo permitido.");
  db.update(jobs).set({ ...input, updatedAt: nowIso() }).where(eq(jobs.id, id)).run();
  recordActivity({ kind: "job.updated", title: `Oferta actualizada: ${existing.title}`, entityType: "job", entityId: id, actor: "user", metadata: input });
  return db.select().from(jobs).where(eq(jobs.id, id)).get();
}
