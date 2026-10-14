import { z } from "zod";

export const sourceKindSchema = z.enum(["greenhouse", "lever", "ashby", "manual"]);

export const companyInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.string().url().optional(),
  industry: z.string().trim().max(100).optional(),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  watchlisted: z.boolean().default(true),
  atsProvider: sourceKindSchema.optional(),
  atsBoardToken: z.string().trim().min(1).max(200).optional(),
}).superRefine((value, ctx) => {
  if (value.atsProvider && value.atsProvider !== "manual" && !value.atsBoardToken) {
    ctx.addIssue({
      code: "custom",
      path: ["atsBoardToken"],
      message: "El token del job board es obligatorio para este proveedor.",
    });
  }
});

export const manualJobInputSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(220),
  originalUrl: z.string().url(),
  description: z.string().max(100_000).default(""),
  location: z.string().trim().max(200).optional(),
  workplaceMode: z.enum(["onsite", "hybrid", "remote", "unknown"]).default("unknown"),
  employmentType: z.string().trim().max(100).optional(),
  publishedAt: z.string().datetime().optional(),
  category: z.string().trim().max(100).optional(),
  requirements: z.array(z.string().max(500)).max(100).default([]),
  responsibilities: z.array(z.string().max(500)).max(100).default([]),
});

export const dimensionSchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  evidence: z.string().trim().min(10).max(2_000),
});

export const evaluationInputSchema = z.object({
  jobId: z.string().uuid(),
  method: z.enum(["codex_cli", "rules", "ollama"]).default("codex_cli"),
  evaluator: z.string().trim().min(2).max(100).default("Codex CLI"),
  assessmentStatus: z.enum(["scored", "insufficient"]),
  dimensions: z.object({
    professionalAlignment: dimensionSchema,
    learningPotential: dimensionSchema,
    experienceCompatibility: dimensionSchema,
    conditionsAndDuration: dimensionSchema,
    careerProjection: dimensionSchema,
  }),
  eligibility: z.enum(["eligible", "likely", "unclear", "ineligible"]),
  professionalCategory: z.string().trim().min(2).max(120),
  strengths: z.array(z.string().trim().min(2).max(500)).max(12),
  weaknesses: z.array(z.string().trim().min(2).max(500)).max(12),
  missingRequirements: z.array(z.string().trim().min(2).max(500)).max(12),
  learningPotential: z.string().trim().min(10).max(2_000),
  justification: z.string().trim().min(20).max(4_000),
  recommendation: z.enum(["priority", "apply", "consider", "review", "skip"]),
  confidence: z.number().min(0).max(1),
  unknowns: z.array(z.string().trim().min(2).max(500)).max(20),
}).superRefine((value, ctx) => {
  const scores = Object.values(value.dimensions).map((dimension) => dimension.score);
  if (value.assessmentStatus === "scored" && scores.some((score) => score === null)) {
    ctx.addIssue({ code: "custom", path: ["dimensions"], message: "Una evaluación puntuada necesita las cinco puntuaciones." });
  }
  if (value.assessmentStatus === "insufficient" && scores.some((score) => score !== null)) {
    ctx.addIssue({ code: "custom", path: ["dimensions"], message: "Con información insuficiente, las puntuaciones deben ser null." });
  }
});

export const evaluationImportSchema = z.union([
  evaluationInputSchema,
  z.object({ evaluations: z.array(evaluationInputSchema).min(1).max(100) }),
]);

export const feedbackInputSchema = z.object({
  sentiment: z.enum(["strong_interest", "interest", "not_interested", "not_eligible"]),
  reasonCode: z.string().trim().max(100).optional(),
  explanation: z.string().trim().max(2_000).optional(),
});

export const applicationInputSchema = z.object({
  jobId: z.string().uuid(),
  stage: z.enum(["interesting", "preparing", "applied", "interview", "offer", "rejected", "dismissed"]),
  appliedAt: z.string().datetime().nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5_000).default(""),
});

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  headline: z.string().trim().max(250),
  location: z.string().trim().max(160),
  summary: z.string().max(5_000),
  education: z.array(z.string().max(1_000)).max(20),
  projects: z.array(z.string().max(1_000)).max(30),
  languages: z.array(z.string().max(200)).max(20),
  interests: z.array(z.string().max(300)).max(30),
  objectives: z.array(z.string().max(500)).max(30),
  restrictions: z.array(z.string().max(500)).max(30),
});

export const profileEditorSchema = profileInputSchema.extend({
  skillNames: z.array(z.string().trim().min(1).max(120)).max(100),
  experienceItems: z.array(z.object({
    title: z.string().trim().min(2).max(160),
    organization: z.string().trim().max(160).optional(),
    description: z.string().trim().max(2_000).default(""),
  })).max(40),
});

export const scoringSettingsSchema = z.object({
  weights: z.object({
    professionalAlignment: z.number().min(0).max(100),
    learningPotential: z.number().min(0).max(100),
    experienceCompatibility: z.number().min(0).max(100),
    conditionsAndDuration: z.number().min(0).max(100),
    careerProjection: z.number().min(0).max(100),
  }),
  thresholds: z.object({
    excellent: z.number().min(0).max(100),
    veryInteresting: z.number().min(0).max(100),
    consider: z.number().min(0).max(100),
  }),
}).superRefine((value, ctx) => {
  const total = Object.values(value.weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 100) > 0.001) ctx.addIssue({ code: "custom", path: ["weights"], message: "Los pesos deben sumar 100." });
  if (!(value.thresholds.excellent > value.thresholds.veryInteresting && value.thresholds.veryInteresting > value.thresholds.consider)) {
    ctx.addIssue({ code: "custom", path: ["thresholds"], message: "Los umbrales deben estar en orden descendente." });
  }
});

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;
export type ManualJobInput = z.infer<typeof manualJobInputSchema>;
