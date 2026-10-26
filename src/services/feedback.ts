import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { feedback, jobs } from "@/db/schema";
import { feedbackInputSchema } from "@/lib/schemas";
import { dismissalReasonLabels } from "@/lib/feedback-reasons";
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
  const reasonLabel = parsed.reasonCode ? dismissalReasonLabels[parsed.reasonCode] : undefined;
  recordActivity({
    kind: "feedback.created",
    title: reasonLabel ? `Oferta descartada: ${reasonLabel}` : `Preferencia registrada: ${parsed.sentiment}`,
    entityType: "job",
    entityId: jobId,
    actor: "user",
    metadata: { sentiment: parsed.sentiment, reasonCode: parsed.reasonCode ?? null, explanation: parsed.explanation ?? null },
  });
  return { ok: true, status, reasonCode: parsed.reasonCode ?? null };
}

export function getFeedbackLearningContext(limit = 30) {
  const { sqlite } = getDatabase();
  const rejectionCount = sqlite.prepare(`
    SELECT COUNT(*) AS count FROM feedback
    WHERE sentiment IN ('not_interested', 'not_eligible')
  `).get() as { count: number };
  const rejectionReasons = sqlite.prepare(`
    SELECT reason_code, COUNT(*) AS count FROM feedback
    WHERE sentiment IN ('not_interested', 'not_eligible')
    GROUP BY reason_code ORDER BY count DESC
  `).all() as Array<{ reason_code: string | null; count: number }>;
  const decisions = sqlite.prepare(`
    SELECT f.sentiment, f.reason_code, f.explanation, f.created_at,
      j.title, j.category, j.location, j.workplace_mode, j.employment_type,
      c.name AS company_name,
      (SELECT e.professional_category FROM job_evaluations e
       WHERE e.job_id = j.id ORDER BY e.evaluated_at DESC LIMIT 1) AS professional_category
    FROM feedback f
    JOIN jobs j ON j.id = f.job_id
    JOIN companies c ON c.id = j.company_id
    ORDER BY f.created_at DESC
    LIMIT ?
  `).all(Math.max(1, Math.min(100, Math.floor(limit)))) as Array<Record<string, unknown>>;

  const rejected = decisions.filter((decision) => decision.sentiment === "not_interested" || decision.sentiment === "not_eligible");
  const positive = decisions.filter((decision) => decision.sentiment === "interest" || decision.sentiment === "strong_interest");
  const rejectedExamples = rejected.map((decision) => {
    const explanation = typeof decision.explanation === "string" ? decision.explanation.trim() : "";
    const hasUsefulReason = Boolean(decision.reason_code) || (explanation.length > 0 && explanation !== "Descartada desde el dashboard");
    return { ...decision, legacyReasonMissing: !hasUsefulReason };
  });

  return {
    rejectedCount: rejectionCount.count,
    repeatedRejectionReasons: rejectionReasons
      .map(({ reason_code, count }) => {
        const reasonCode = reason_code ?? "unspecified";
        return { reasonCode, reason: dismissalReasonLabels[reasonCode] ?? reasonCode, count };
      })
      .filter(({ reasonCode, count }) => count > 1 && reasonCode !== "other" && reasonCode !== "unspecified")
      .sort((a, b) => b.count - a.count),
    rejectedExamples,
    positiveExamples: positive,
  };
}
