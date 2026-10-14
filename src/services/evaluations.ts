import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { jobEvaluations, jobs, settings } from "@/db/schema";
import { evaluationImportSchema, type EvaluationInput } from "@/lib/schemas";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, ensureDefaults } from "./defaults";

type Weights = typeof DEFAULT_WEIGHTS;
type Thresholds = typeof DEFAULT_THRESHOLDS;

function setting<T>(key: string, fallback: T): T {
  const row = getDatabase().db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get();
  return (row?.value as T | undefined) ?? fallback;
}

export function calculateScore(input: EvaluationInput, weights: Weights): number | null {
  if (input.assessmentStatus === "insufficient") return null;
  const entries = [
    [input.dimensions.professionalAlignment.score, weights.professionalAlignment],
    [input.dimensions.learningPotential.score, weights.learningPotential],
    [input.dimensions.experienceCompatibility.score, weights.experienceCompatibility],
    [input.dimensions.conditionsAndDuration.score, weights.conditionsAndDuration],
    [input.dimensions.careerProjection.score, weights.careerProjection],
  ] as const;
  if (entries.some(([score]) => score === null)) return null;
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round((entries.reduce((sum, [score, weight]) => sum + score! * weight, 0) / totalWeight) * 10) / 10;
}

export function segmentScore(score: number | null, thresholds: Thresholds = DEFAULT_THRESHOLDS) {
  if (score === null) return "review_needed" as const;
  if (score >= thresholds.excellent) return "excellent" as const;
  if (score >= thresholds.veryInteresting) return "very_interesting" as const;
  if (score >= thresholds.consider) return "consider" as const;
  return "low_priority" as const;
}

export function importEvaluations(raw: unknown) {
  ensureDefaults();
  const parsed = evaluationImportSchema.parse(raw);
  const evaluations = "evaluations" in parsed ? parsed.evaluations : [parsed];
  const { db } = getDatabase();
  const weights = setting<Weights>("evaluation_weights", DEFAULT_WEIGHTS);
  const thresholds = setting<Thresholds>("score_thresholds", DEFAULT_THRESHOLDS);
  const now = nowIso();
  const ids: string[] = [];

  db.transaction((tx) => {
    for (const input of evaluations) {
      const job = tx.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, input.jobId)).get();
      if (!job) throw new Error(`No existe la oferta ${input.jobId}.`);
      const score = calculateScore(input, weights);
      const id = randomUUID();
      tx.insert(jobEvaluations).values({
        id,
        jobId: input.jobId,
        method: input.method,
        evaluator: input.evaluator,
        assessmentStatus: input.assessmentStatus,
        professionalAlignment: input.dimensions.professionalAlignment.score,
        learningPotentialScore: input.dimensions.learningPotential.score,
        experienceCompatibility: input.dimensions.experienceCompatibility.score,
        conditionsAndDuration: input.dimensions.conditionsAndDuration.score,
        careerProjection: input.dimensions.careerProjection.score,
        calculatedScore: score,
        segment: segmentScore(score, thresholds),
        eligibility: input.eligibility,
        professionalCategory: input.professionalCategory,
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        missingRequirements: input.missingRequirements,
        learningPotential: input.learningPotential,
        justification: input.justification,
        recommendation: input.recommendation,
        confidence: input.confidence,
        unknowns: input.unknowns,
        evidence: {
          professionalAlignment: input.dimensions.professionalAlignment.evidence,
          learningPotential: input.dimensions.learningPotential.evidence,
          experienceCompatibility: input.dimensions.experienceCompatibility.evidence,
          conditionsAndDuration: input.dimensions.conditionsAndDuration.evidence,
          careerProjection: input.dimensions.careerProjection.evidence,
        },
        weightsSnapshot: weights,
        evaluatedAt: now,
      }).run();
      ids.push(id);
    }
  });

  recordActivity({ kind: "evaluation.imported", title: `${ids.length} evaluaciones guardadas`, actor: "codex", metadata: { evaluationIds: ids } });
  return { imported: ids.length, evaluationIds: ids };
}

export function pendingJobs(limit = 15) {
  ensureDefaults();
  const { sqlite } = getDatabase();
  return sqlite.prepare(`
    SELECT
      j.id, j.title, j.category, j.location, j.workplace_mode, j.employment_type,
      j.description, j.requirements, j.responsibilities, j.original_url,
      j.published_at, j.first_seen_at, j.status,
      c.name AS company_name, s.kind AS source_kind
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    JOIN sources s ON s.id = j.source_id
    WHERE NOT EXISTS (SELECT 1 FROM job_evaluations e WHERE e.job_id = j.id)
      AND j.status NOT IN ('dismissed', 'archived')
    ORDER BY j.first_seen_at DESC
    LIMIT ?
  `).all(limit).map((row) => {
    const item = row as Record<string, unknown>;
    for (const key of ["requirements", "responsibilities"]) {
      if (typeof item[key] === "string") item[key] = JSON.parse(item[key] as string);
    }
    return item;
  });
}

export function evaluationHistory(jobId: string) {
  ensureDefaults();
  return getDatabase().db.select().from(jobEvaluations).where(eq(jobEvaluations.jobId, jobId)).orderBy(desc(jobEvaluations.evaluatedAt)).all();
}
