import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, like, or } from "drizzle-orm";
import { getDatabase } from "@/db";
import { companies, jobSearchRuns, jobs, sources } from "@/db/schema";
import type { NormalizedJob } from "@/connectors";
import { manualJobInputSchema, type ManualJobInput } from "@/lib/schemas";
import { nowIso, toSlug } from "@/lib/utils";
import { validatePublicUrlSyntax } from "@/lib/url-safety";
import { recordActivity } from "./activity";
import { ensureDefaults } from "./defaults";

function fingerprint(sourceKind: string, companySlug: string, externalId: string, url: string): string {
  return createHash("sha256").update(`${sourceKind}|${companySlug}|${externalId || url}`).digest("hex");
}

export function upsertNormalizedJobs(input: {
  companyId: string;
  sourceId: string;
  sourceKind: string;
  companySlug: string;
  searchRunId?: string;
  items: NormalizedJob[];
}): { inserted: number; updated: number; jobIds: string[] } {
  const { db } = getDatabase();
  const now = nowIso();
  let inserted = 0;
  let updated = 0;
  const jobIds: string[] = [];

  db.transaction((tx) => {
    for (const item of input.items) {
      validatePublicUrlSyntax(item.originalUrl);
      const hash = fingerprint(input.sourceKind, input.companySlug, item.externalId, item.originalUrl);
      const existing = tx.select({ id: jobs.id }).from(jobs).where(eq(jobs.fingerprint, hash)).get();
      if (existing) {
        tx.update(jobs).set({
          title: item.title,
          category: item.category,
          location: item.location,
          workplaceMode: item.workplaceMode,
          employmentType: item.employmentType,
          description: item.description,
          requirements: item.requirements,
          responsibilities: item.responsibilities,
          originalUrl: item.originalUrl,
          publishedAt: item.publishedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          lastSeenAt: now,
          rawPayload: item.rawPayload,
          updatedAt: now,
        }).where(eq(jobs.id, existing.id)).run();
        jobIds.push(existing.id);
        updated += 1;
      } else {
        const id = randomUUID();
        tx.insert(jobs).values({
          id,
          companyId: input.companyId,
          sourceId: input.sourceId,
          externalId: item.externalId,
          fingerprint: hash,
          title: item.title,
          category: item.category,
          location: item.location,
          workplaceMode: item.workplaceMode,
          employmentType: item.employmentType,
          description: item.description,
          requirements: item.requirements,
          responsibilities: item.responsibilities,
          originalUrl: item.originalUrl,
          publishedAt: item.publishedAt,
          sourceUpdatedAt: item.sourceUpdatedAt,
          firstSeenAt: now,
          lastSeenAt: now,
          rawPayload: item.rawPayload,
        }).run();
        jobIds.push(id);
        inserted += 1;
      }
    }
    if (input.searchRunId) {
      for (const jobId of jobIds) {
        tx.insert(jobSearchRuns).values({ jobId, searchRunId: input.searchRunId }).onConflictDoNothing().run();
      }
    }
  });
  return { inserted, updated, jobIds };
}

export function importManualJob(input: ManualJobInput | unknown) {
  ensureDefaults();
  const parsed = manualJobInputSchema.parse(input);
  validatePublicUrlSyntax(parsed.originalUrl);
  const { db } = getDatabase();
  const slug = toSlug(parsed.companyName);
  let company = db.select().from(companies).where(eq(companies.slug, slug)).get();
  if (!company) {
    const id = randomUUID();
    db.insert(companies).values({ id, name: parsed.companyName, slug, atsProvider: "manual", watchlisted: false }).run();
    company = db.select().from(companies).where(eq(companies.id, id)).get();
  }
  const source = db.select().from(sources).where(eq(sources.kind, "manual")).get();
  if (!company || !source) throw new Error("No se pudo inicializar la importación manual.");
  const result = upsertNormalizedJobs({
    companyId: company.id,
    sourceId: source.id,
    sourceKind: "manual",
    companySlug: company.slug,
    items: [{
      externalId: parsed.originalUrl,
      title: parsed.title,
      category: parsed.category,
      location: parsed.location,
      workplaceMode: parsed.workplaceMode,
      employmentType: parsed.employmentType,
      description: parsed.description,
      requirements: parsed.requirements,
      responsibilities: parsed.responsibilities,
      originalUrl: parsed.originalUrl,
      publishedAt: parsed.publishedAt,
      rawPayload: { importedManually: true },
    }],
  });
  const job = db.select().from(jobs).where(eq(jobs.id, result.jobIds[0])).get();
  if (result.inserted) recordActivity({ kind: "job.imported", title: `Oferta importada: ${parsed.title}`, entityType: "job", entityId: job?.id, actor: "user" });
  return job;
}

export function getJob(id: string) {
  ensureDefaults();
  return getDatabase().db.select().from(jobs).where(eq(jobs.id, id)).get();
}

export function listRawJobs(options: { status?: string; search?: string; limit?: number } = {}) {
  ensureDefaults();
  const { db } = getDatabase();
  const clauses = [];
  if (options.status) clauses.push(eq(jobs.status, options.status as "new" | "saved" | "dismissed" | "applied" | "archived"));
  if (options.search) clauses.push(or(like(jobs.title, `%${options.search}%`), like(jobs.description, `%${options.search}%`))!);
  return db.select().from(jobs).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(jobs.firstSeenAt)).limit(options.limit ?? 100).all();
}
