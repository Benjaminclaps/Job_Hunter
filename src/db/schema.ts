import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
};

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull().default("Benjamin Claps"),
  headline: text("headline").notNull().default("Estudiante universitario buscando práctica profesional"),
  location: text("location").notNull().default("Santiago, Chile"),
  summary: text("summary").notNull().default(""),
  education: text("education", { mode: "json" }).$type<string[]>().notNull().default([]),
  projects: text("projects", { mode: "json" }).$type<string[]>().notNull().default([]),
  languages: text("languages", { mode: "json" }).$type<string[]>().notNull().default([]),
  interests: text("interests", { mode: "json" }).$type<string[]>().notNull().default([]),
  objectives: text("objectives", { mode: "json" }).$type<string[]>().notNull().default([]),
  restrictions: text("restrictions", { mode: "json" }).$type<string[]>().notNull().default([]),
  ...timestamps,
});

export const experiences = sqliteTable(
  "experiences",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    organization: text("organization"),
    description: text("description").notNull().default(""),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
    ...timestamps,
  },
  (table) => [index("experiences_profile_idx").on(table.profileId)],
);

export const skills = sqliteTable(
  "skills",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("general"),
    level: text("level").notNull().default("self_reported"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("skills_profile_name_idx").on(table.profileId, table.name),
    index("skills_profile_idx").on(table.profileId),
  ],
);

export const preferences = sqliteTable(
  "preferences",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    priority: integer("priority").notNull().default(2),
    source: text("source").notNull().default("explicit"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("preferences_profile_kind_value_idx").on(table.profileId, table.kind, table.value),
    index("preferences_profile_idx").on(table.profileId),
  ],
);

export const companies = sqliteTable(
  "companies",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    website: text("website"),
    logoUrl: text("logo_url"),
    description: text("description"),
    industry: text("industry"),
    priority: integer("priority").notNull().default(2),
    watchlisted: integer("watchlisted", { mode: "boolean" }).notNull().default(true),
    atsProvider: text("ats_provider", { enum: ["greenhouse", "lever", "ashby", "manual"] }),
    atsBoardToken: text("ats_board_token"),
    lastScannedAt: text("last_scanned_at"),
    lastScanStatus: text("last_scan_status"),
    lastScanError: text("last_scan_error"),
    ...timestamps,
  },
  (table) => [uniqueIndex("companies_slug_idx").on(table.slug), index("companies_watchlist_idx").on(table.watchlisted)],
);

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["greenhouse", "lever", "ashby", "manual"] }).notNull(),
    name: text("name").notNull(),
    baseUrl: text("base_url"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    lastSuccessAt: text("last_success_at"),
    lastErrorAt: text("last_error_at"),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [uniqueIndex("sources_kind_idx").on(table.kind)],
);

export const searchRuns = sqliteTable(
  "search_runs",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),
    status: text("status", { enum: ["running", "completed", "partial", "failed"] }).notNull(),
    discoveredCount: integer("discovered_count").notNull().default(0),
    insertedCount: integer("inserted_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [index("search_runs_started_idx").on(table.startedAt)],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "restrict" }),
    externalId: text("external_id"),
    fingerprint: text("fingerprint").notNull(),
    title: text("title").notNull(),
    category: text("category"),
    location: text("location"),
    workplaceMode: text("workplace_mode", { enum: ["onsite", "hybrid", "remote", "unknown"] }).notNull().default("unknown"),
    employmentType: text("employment_type"),
    description: text("description").notNull().default(""),
    requirements: text("requirements", { mode: "json" }).$type<string[]>().notNull().default([]),
    responsibilities: text("responsibilities", { mode: "json" }).$type<string[]>().notNull().default([]),
    originalUrl: text("original_url").notNull(),
    publishedAt: text("published_at"),
    sourceUpdatedAt: text("source_updated_at"),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    status: text("status", { enum: ["new", "saved", "dismissed", "applied", "archived"] }).notNull().default("new"),
    personalNotes: text("personal_notes").notNull().default(""),
    rawPayload: text("raw_payload", { mode: "json" }).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("jobs_fingerprint_idx").on(table.fingerprint),
    index("jobs_company_idx").on(table.companyId),
    index("jobs_status_idx").on(table.status),
    index("jobs_published_idx").on(table.publishedAt),
  ],
);

export const jobEvaluations = sqliteTable(
  "job_evaluations",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    method: text("method", { enum: ["codex_cli", "rules", "ollama"] }).notNull(),
    evaluator: text("evaluator").notNull(),
    assessmentStatus: text("assessment_status", { enum: ["scored", "insufficient"] }).notNull(),
    professionalAlignment: real("professional_alignment"),
    learningPotentialScore: real("learning_potential_score"),
    experienceCompatibility: real("experience_compatibility"),
    conditionsAndDuration: real("conditions_and_duration"),
    careerProjection: real("career_projection"),
    calculatedScore: real("calculated_score"),
    segment: text("segment", { enum: ["excellent", "very_interesting", "consider", "low_priority", "review_needed"] }).notNull(),
    eligibility: text("eligibility", { enum: ["eligible", "likely", "unclear", "ineligible"] }).notNull(),
    professionalCategory: text("professional_category").notNull(),
    strengths: text("strengths", { mode: "json" }).$type<string[]>().notNull().default([]),
    weaknesses: text("weaknesses", { mode: "json" }).$type<string[]>().notNull().default([]),
    missingRequirements: text("missing_requirements", { mode: "json" }).$type<string[]>().notNull().default([]),
    learningPotential: text("learning_potential").notNull(),
    justification: text("justification").notNull(),
    recommendation: text("recommendation", { enum: ["priority", "apply", "consider", "review", "skip"] }).notNull(),
    confidence: real("confidence").notNull(),
    unknowns: text("unknowns", { mode: "json" }).$type<string[]>().notNull().default([]),
    evidence: text("evidence", { mode: "json" }).$type<Record<string, string>>().notNull(),
    weightsSnapshot: text("weights_snapshot", { mode: "json" }).$type<Record<string, number>>().notNull(),
    evaluatedAt: text("evaluated_at").notNull(),
    ...timestamps,
  },
  (table) => [index("job_evaluations_job_idx").on(table.jobId, table.evaluatedAt)],
);

export const feedback = sqliteTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    sentiment: text("sentiment", { enum: ["strong_interest", "interest", "not_interested", "not_eligible"] }).notNull(),
    reasonCode: text("reason_code"),
    explanation: text("explanation"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("feedback_job_idx").on(table.jobId, table.createdAt)],
);

export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "restrict" }),
    stage: text("stage", {
      enum: ["interesting", "preparing", "applied", "interview", "offer", "rejected", "dismissed"],
    }).notNull().default("interesting"),
    appliedAt: text("applied_at"),
    nextActionAt: text("next_action_at"),
    notes: text("notes").notNull().default(""),
    ...timestamps,
  },
  (table) => [uniqueIndex("applications_job_idx").on(table.jobId), index("applications_stage_idx").on(table.stage)],
);

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["cv", "cover_letter", "other"] }).notNull(),
    originalName: text("original_name").notNull(),
    storedPath: text("stored_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sha256: text("sha256").notNull(),
    extractedText: text("extracted_text").notNull().default(""),
    reviewed: integer("reviewed", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("documents_profile_idx").on(table.profileId, table.createdAt)],
);

export const activityEvents = sqliteTable(
  "activity_events",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    title: text("title").notNull(),
    detail: text("detail"),
    actor: text("actor").notNull().default("system"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("activity_events_created_idx").on(table.createdAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const jobSearchRuns = sqliteTable(
  "job_search_runs",
  {
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    searchRunId: text("search_run_id").notNull().references(() => searchRuns.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.searchRunId] })],
);

export type Job = typeof jobs.$inferSelect;
export type JobEvaluation = typeof jobEvaluations.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Application = typeof applications.$inferSelect;
