import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { applications, jobs } from "@/db/schema";
import { applicationInputSchema } from "@/lib/schemas";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";
import { ensureDefaults } from "./defaults";

export function listApplications() {
  ensureDefaults();
  const { sqlite } = getDatabase();
  return sqlite.prepare(`
    SELECT a.*, j.title, j.original_url, c.name AS company_name
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN companies c ON c.id = j.company_id
    ORDER BY a.updated_at DESC
  `).all();
}

export function saveApplication(input: unknown) {
  ensureDefaults();
  const parsed = applicationInputSchema.parse(input);
  const { db } = getDatabase();
  const job = db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, parsed.jobId)).get();
  if (!job) throw new Error("La oferta no existe.");
  const existing = db.select().from(applications).where(eq(applications.jobId, parsed.jobId)).get();
  const now = nowIso();
  const appliedAt = parsed.stage === "applied" && parsed.appliedAt === undefined
    ? existing?.appliedAt ?? now
    : parsed.appliedAt;
  const values = { ...parsed, ...(appliedAt !== undefined ? { appliedAt } : {}), updatedAt: now };
  if (existing) {
    db.update(applications).set(values).where(eq(applications.id, existing.id)).run();
  } else {
    db.insert(applications).values({ id: randomUUID(), ...values }).run();
  }
  if (parsed.stage === "applied" || parsed.stage === "interview" || parsed.stage === "offer") {
    db.update(jobs).set({ status: "applied", updatedAt: now }).where(eq(jobs.id, parsed.jobId)).run();
  }
  recordActivity({ kind: "application.updated", title: `Postulación movida a ${parsed.stage}`, entityType: "job", entityId: parsed.jobId, actor: "user" });
  return db.select().from(applications).where(eq(applications.jobId, parsed.jobId)).orderBy(desc(applications.updatedAt)).get();
}
