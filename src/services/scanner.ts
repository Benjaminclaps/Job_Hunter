import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getConnector } from "@/connectors";
import { getDatabase } from "@/db";
import { companies, searchRuns, sources } from "@/db/schema";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";
import { ensureDefaults } from "./defaults";
import { upsertNormalizedJobs } from "./jobs";
import type { NormalizedJob } from "@/connectors";

export type ScanResult = {
  company: string;
  status: "completed" | "failed";
  discovered: number;
  inserted: number;
  updated: number;
  error?: string;
};

export function matchesScanQuery(job: NormalizedJob, queryValue: string): boolean {
  const query = queryValue.trim().toLocaleLowerCase("es");
  if (!query) return true;
  if (["intern", "internship", "practica", "práctica"].includes(query)) {
    const structured = `${job.title} ${job.category ?? ""} ${job.employmentType ?? ""}`.toLocaleLowerCase("es");
    return /\b(intern|internship|internships|trainee|co-op|practica|práctica)\b/i.test(structured);
  }
  const searchable = `${job.title} ${job.category ?? ""} ${job.location ?? ""} ${job.description}`.toLocaleLowerCase("es");
  return searchable.includes(query);
}

export async function scanWatchlist(options: { company?: string; query?: string } = {}): Promise<ScanResult[]> {
  ensureDefaults();
  const { db } = getDatabase();
  const watchlist = db.select().from(companies).where(
    options.company
      ? and(eq(companies.watchlisted, true), eq(companies.slug, options.company))
      : eq(companies.watchlisted, true),
  ).all().filter((company) => company.atsProvider && company.atsProvider !== "manual");

  if (watchlist.length === 0) {
    throw new Error("No hay empresas con un conector automático configurado en la watchlist.");
  }

  const results: ScanResult[] = [];
  for (const company of watchlist) {
    const source = db.select().from(sources).where(eq(sources.kind, company.atsProvider!)).get();
    if (!source) continue;
    const runId = randomUUID();
    const startedAt = nowIso();
    db.insert(searchRuns).values({ id: runId, sourceId: source.id, companyId: company.id, status: "running", startedAt }).run();
    try {
      const allJobs = await getConnector(company.atsProvider!).fetchJobs(company);
      const query = options.query?.trim();
      const selected = query
        ? allJobs.filter((job) => matchesScanQuery(job, query))
        : allJobs;
      const saved = upsertNormalizedJobs({
        companyId: company.id,
        sourceId: source.id,
        sourceKind: company.atsProvider!,
        companySlug: company.slug,
        searchRunId: runId,
        items: selected,
      });
      const finishedAt = nowIso();
      db.update(searchRuns).set({
        status: "completed",
        discoveredCount: selected.length,
        insertedCount: saved.inserted,
        updatedCount: saved.updated,
        finishedAt,
        updatedAt: finishedAt,
      }).where(eq(searchRuns.id, runId)).run();
      db.update(companies).set({ lastScannedAt: finishedAt, lastScanStatus: "completed", lastScanError: null, updatedAt: finishedAt }).where(eq(companies.id, company.id)).run();
      db.update(sources).set({ lastSuccessAt: finishedAt, lastError: null, updatedAt: finishedAt }).where(eq(sources.id, source.id)).run();
      results.push({ company: company.name, status: "completed", discovered: selected.length, inserted: saved.inserted, updated: saved.updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      const finishedAt = nowIso();
      db.update(searchRuns).set({ status: "failed", errorCount: 1, error: message, finishedAt, updatedAt: finishedAt }).where(eq(searchRuns.id, runId)).run();
      db.update(companies).set({ lastScannedAt: finishedAt, lastScanStatus: "failed", lastScanError: message, updatedAt: finishedAt }).where(eq(companies.id, company.id)).run();
      db.update(sources).set({ lastErrorAt: finishedAt, lastError: message, updatedAt: finishedAt }).where(eq(sources.id, source.id)).run();
      results.push({ company: company.name, status: "failed", discovered: 0, inserted: 0, updated: 0, error: message });
    }
  }

  const inserted = results.reduce((sum, result) => sum + result.inserted, 0);
  recordActivity({
    kind: "scan.completed",
    title: `Búsqueda finalizada: ${inserted} ofertas nuevas`,
    detail: `${results.filter((result) => result.status === "completed").length}/${results.length} fuentes completadas.`,
    actor: "cli",
    metadata: { results },
  });
  return results;
}
