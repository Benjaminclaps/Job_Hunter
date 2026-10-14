import { getDatabase } from "@/db";
import { ensureDefaults } from "./defaults";
import { getFullProfile } from "./profile";
import { listApplications } from "./applications";
import { listCompanies } from "./companies";
import { getScoringSettings } from "./settings";

type JsonRecord = Record<string, unknown>;

function parseJsonFields<T extends JsonRecord>(row: T, fields: string[]): T {
  const result: JsonRecord = { ...row };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      try { result[field] = JSON.parse(result[field] as string); } catch { /* Preserve malformed legacy data. */ }
    }
  }
  return result as T;
}

function withoutRawPayload<T extends JsonRecord>(row: T): T {
  const result = { ...row };
  delete result.raw_payload;
  return result;
}

export function getDashboardSnapshot() {
  ensureDefaults();
  const { sqlite } = getDatabase();
  const stats = sqlite.prepare(`
    SELECT
      COUNT(*) AS total_jobs,
      COALESCE(SUM(CASE WHEN datetime(first_seen_at) >= datetime('now', '-7 days') AND status NOT IN ('dismissed', 'archived') THEN 1 ELSE 0 END), 0) AS new_jobs,
      COALESCE(SUM(CASE WHEN status = 'new' AND NOT EXISTS (SELECT 1 FROM job_evaluations e WHERE e.job_id = jobs.id) THEN 1 ELSE 0 END), 0) AS pending_jobs,
      COALESCE(SUM(CASE WHEN status NOT IN ('dismissed', 'archived') AND EXISTS (
        SELECT 1 FROM job_evaluations e WHERE e.job_id = jobs.id AND e.segment IN ('excellent', 'very_interesting')
        AND e.evaluated_at = (SELECT MAX(e2.evaluated_at) FROM job_evaluations e2 WHERE e2.job_id = jobs.id)
      ) THEN 1 ELSE 0 END), 0) AS high_match_jobs,
      (SELECT COUNT(*) FROM applications WHERE stage IN ('preparing', 'applied', 'interview', 'offer')) AS active_applications,
      (SELECT MAX(finished_at) FROM search_runs) AS last_scan_at
    FROM jobs
  `).get() as JsonRecord;

  const jobRows = sqlite.prepare(`
    WITH latest_evaluation AS (
      SELECT e.*
      FROM job_evaluations e
      WHERE e.evaluated_at = (
        SELECT MAX(e2.evaluated_at) FROM job_evaluations e2 WHERE e2.job_id = e.job_id
      )
    )
    SELECT
      j.*, c.name AS company_name, c.logo_url, s.kind AS source_kind,
      e.id AS evaluation_id, e.assessment_status, e.calculated_score, e.segment,
      e.eligibility, e.professional_category, e.strengths, e.weaknesses,
      e.missing_requirements, e.learning_potential, e.justification,
      e.recommendation, e.confidence, e.unknowns, e.evidence, e.evaluated_at,
      e.professional_alignment, e.learning_potential_score, e.experience_compatibility,
      e.conditions_and_duration, e.career_projection
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    JOIN sources s ON s.id = j.source_id
    LEFT JOIN latest_evaluation e ON e.job_id = j.id
    ORDER BY CASE WHEN e.calculated_score IS NULL THEN 1 ELSE 0 END, e.calculated_score DESC, j.first_seen_at DESC
    LIMIT 300
  `).all() as JsonRecord[];

  const activities = sqlite.prepare(`
    SELECT * FROM activity_events ORDER BY created_at DESC LIMIT 60
  `).all() as JsonRecord[];
  const runs = sqlite.prepare(`
    SELECT r.*, c.name AS company_name, s.name AS source_name
    FROM search_runs r
    LEFT JOIN companies c ON c.id = r.company_id
    LEFT JOIN sources s ON s.id = r.source_id
    ORDER BY r.started_at DESC LIMIT 30
  `).all() as JsonRecord[];

  return {
    generatedAt: new Date().toISOString(),
    stats,
    jobs: jobRows.map((row) => withoutRawPayload(parseJsonFields(row, ["requirements", "responsibilities", "strengths", "weaknesses", "missing_requirements", "unknowns", "evidence"]))),
    companies: listCompanies(),
    applications: listApplications(),
    profile: getFullProfile(),
    activity: activities.map((row) => parseJsonFields(row, ["metadata"])),
    searchRuns: runs,
    settings: getScoringSettings(),
  };
}

export function getJobDetail(id: string) {
  ensureDefaults();
  const { sqlite } = getDatabase();
  const job = sqlite.prepare(`
    SELECT j.*, c.name AS company_name, c.website AS company_website, c.logo_url, s.kind AS source_kind
    FROM jobs j JOIN companies c ON c.id = j.company_id JOIN sources s ON s.id = j.source_id
    WHERE j.id = ?
  `).get(id) as JsonRecord | undefined;
  if (!job) return undefined;
  const evaluations = sqlite.prepare(`SELECT * FROM job_evaluations WHERE job_id = ? ORDER BY evaluated_at DESC`).all(id) as JsonRecord[];
  const feedback = sqlite.prepare(`SELECT * FROM feedback WHERE job_id = ? ORDER BY created_at DESC`).all(id) as JsonRecord[];
  const application = sqlite.prepare(`SELECT * FROM applications WHERE job_id = ?`).get(id) as JsonRecord | undefined;
  return {
    job: withoutRawPayload(parseJsonFields(job, ["requirements", "responsibilities"])),
    evaluations: evaluations.map((row) => parseJsonFields(row, ["strengths", "weaknesses", "missing_requirements", "unknowns", "evidence", "weights_snapshot"])),
    feedback,
    application,
  };
}
