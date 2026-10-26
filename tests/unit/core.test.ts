import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "job-hunter-unit-"));
process.env.JOB_HUNTER_DATA_DIR = testDirectory;

const database = await import("@/db");
const defaults = await import("@/services/defaults");
const jobService = await import("@/services/jobs");
const evaluationService = await import("@/services/evaluations");
const dashboardService = await import("@/services/dashboard");
const settingsService = await import("@/services/settings");
const applicationService = await import("@/services/applications");
const feedbackService = await import("@/services/feedback");

describe("núcleo local", () => {
  let jobId: string;

  beforeAll(() => defaults.ensureDefaults());

  afterAll(() => {
    database.closeDatabase();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it("persiste una oferta manual y elimina duplicados", () => {
    const input = {
      companyName: "Empresa de prueba aislada",
      title: "Growth Intern — dato sintético de test",
      originalUrl: "https://example.com/jobs/growth-intern-test",
      description: "Fixture sintético para verificar persistencia y deduplicación.",
      location: "Santiago, Chile",
      workplaceMode: "hybrid" as const,
      requirements: ["Ser estudiante"],
      responsibilities: ["Analizar un embudo"],
    };
    const first = jobService.importManualJob(input);
    const second = jobService.importManualJob({ ...input, description: "Descripción actualizada del fixture sintético." });
    expect(first?.id).toBe(second?.id);
    expect(jobService.listRawJobs()).toHaveLength(1);
    expect(jobService.listRawJobs()[0].description).toContain("actualizada");
    jobId = first!.id;
  });

  it("calcula el resultado ponderado en código y conserva evidencia", () => {
    const result = evaluationService.importEvaluations({
      jobId,
      method: "codex_cli",
      evaluator: "Codex test",
      assessmentStatus: "scored",
      dimensions: {
        professionalAlignment: { score: 90, evidence: "El cargo del fixture menciona Growth de forma explícita." },
        learningPotential: { score: 80, evidence: "La responsabilidad sintética permite analizar un embudo." },
        experienceCompatibility: { score: 70, evidence: "El perfil declara adquisición de clientes y CRM." },
        conditionsAndDuration: { score: 60, evidence: "La ubicación es Santiago pero la duración es desconocida." },
        careerProjection: { score: 50, evidence: "El fixture no informa conversión a un cargo permanente." },
      },
      eligibility: "likely",
      professionalCategory: "Growth",
      strengths: ["Alineación temática"],
      weaknesses: ["Duración desconocida"],
      missingRequirements: [],
      learningPotential: "Permite practicar análisis de adquisición y embudos comerciales.",
      justification: "Buen encaje temático con condiciones incompletas que deben confirmarse.",
      recommendation: "apply",
      confidence: 0.75,
      unknowns: ["Duración"],
    });
    expect(result.imported).toBe(1);
    const snapshot = dashboardService.getDashboardSnapshot();
    expect(snapshot.jobs[0].calculated_score).toBe(75);
    expect(snapshot.jobs[0].segment).toBe("very_interesting");
    expect(snapshot.jobs[0].evidence).toMatchObject({ professionalAlignment: expect.stringContaining("Growth") });
  });

  it("rechaza porcentajes cuando se declara información insuficiente", () => {
    expect(() => evaluationService.importEvaluations({
      jobId,
      method: "codex_cli",
      evaluator: "Codex test",
      assessmentStatus: "insufficient",
      dimensions: {
        professionalAlignment: { score: 50, evidence: "Texto suficientemente largo para probar la validación." },
        learningPotential: { score: null, evidence: "Texto suficientemente largo para probar la validación." },
        experienceCompatibility: { score: null, evidence: "Texto suficientemente largo para probar la validación." },
        conditionsAndDuration: { score: null, evidence: "Texto suficientemente largo para probar la validación." },
        careerProjection: { score: null, evidence: "Texto suficientemente largo para probar la validación." },
      },
      eligibility: "unclear",
      professionalCategory: "Growth",
      strengths: [], weaknesses: [], missingRequirements: [],
      learningPotential: "No hay información suficiente para estimar aprendizaje.",
      justification: "La publicación no contiene suficientes datos verificables para puntuar.",
      recommendation: "review", confidence: 0.2, unknowns: ["Responsabilidades"],
    })).toThrow(/puntuaciones deben ser null/i);
  });

  it("valida que los pesos configurables sumen 100", () => {
    expect(() => settingsService.updateScoringSettings({
      weights: { professionalAlignment: 40, learningPotential: 40, experienceCompatibility: 40, conditionsAndDuration: 15, careerProjection: 10 },
      thresholds: { excellent: 90, veryInteresting: 75, consider: 60 },
    })).toThrow(/pesos deben sumar 100/i);
  });

  it("marca la oferta como postulada y persiste su etapa", () => {
    const application = applicationService.saveApplication({ jobId, stage: "applied", notes: "" });
    const detail = dashboardService.getJobDetail(jobId);
    expect(application?.stage).toBe("applied");
    expect(application?.appliedAt).toBeTruthy();
    expect(detail?.job.status).toBe("applied");
    expect(detail?.application?.stage).toBe("applied");
  });

  it("conserva motivos específicos para enlaces caídos y ofertas vencidas", () => {
    feedbackService.saveFeedback(jobId, { sentiment: "not_interested", reasonCode: "website_unavailable" });
    feedbackService.saveFeedback(jobId, { sentiment: "not_interested", reasonCode: "expired" });
    const context = JSON.stringify(feedbackService.getFeedbackLearningContext().rejectedExamples);
    expect(context).toContain("website_unavailable");
    expect(context).toContain("expired");
  });
});
