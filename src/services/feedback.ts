import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { feedback, jobs } from "@/db/schema";
import { feedbackInputSchema } from "@/lib/schemas";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";

export function saveFeedback(jobId: string, input: unknown) {
  const parsed = feedbackInputSchema.parse(input);
  const { db } = getDatabase();
  const job = db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) throw new Error("La oferta no existe.");
  db.insert(feedback).values({ id: randomUUID(), jobId, ...parsed }).run();
  const status = parsed.sentiment === "not_interested" || parsed.sentiment === "not_eligible" ? "dismissed" : "saved";
  db.update(jobs).set({ status, updatedAt: nowIso() }).where(eq(jobs.id, jobId)).run();
  recordActivity({ kind: "feedback.created", title: `Preferencia registrada: ${parsed.sentiment}`, entityType: "job", entityId: jobId, actor: "user" });
  return { ok: true, status };
}
