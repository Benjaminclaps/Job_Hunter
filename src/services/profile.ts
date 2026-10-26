import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { documents, experiences, preferences, profiles, skills } from "@/db/schema";
import { profileEditorSchema } from "@/lib/schemas";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";
import { DEFAULT_PROFILE_ID, ensureDefaults } from "./defaults";

export function getFullProfile(options: { includeDocumentText?: boolean } = {}) {
  ensureDefaults();
  const { db } = getDatabase();
  const documentSelection = {
    id: documents.id,
    kind: documents.kind,
    originalName: documents.originalName,
    mimeType: documents.mimeType,
    reviewed: documents.reviewed,
    createdAt: documents.createdAt,
  };
  return {
    profile: db.select().from(profiles).where(eq(profiles.id, DEFAULT_PROFILE_ID)).get(),
    experiences: db.select().from(experiences).where(eq(experiences.profileId, DEFAULT_PROFILE_ID)).all(),
    skills: db.select().from(skills).where(eq(skills.profileId, DEFAULT_PROFILE_ID)).all(),
    preferences: db.select().from(preferences).where(eq(preferences.profileId, DEFAULT_PROFILE_ID)).all(),
    documents: options.includeDocumentText === false
      ? db.select(documentSelection).from(documents).where(eq(documents.profileId, DEFAULT_PROFILE_ID)).all()
      : db.select({ ...documentSelection, extractedText: documents.extractedText }).from(documents).where(eq(documents.profileId, DEFAULT_PROFILE_ID)).all(),
  };
}

export function updateProfile(input: unknown) {
  ensureDefaults();
  const parsed = profileEditorSchema.parse(input);
  const { skillNames, experienceItems, ...profileFields } = parsed;
  const { db } = getDatabase();
  const existingSkills = db.select().from(skills).where(eq(skills.profileId, DEFAULT_PROFILE_ID)).all();
  const categories = new Map(existingSkills.map((skill) => [skill.name.toLocaleLowerCase("es"), skill.category]));
  db.transaction((tx) => {
    tx.update(profiles).set({ ...profileFields, updatedAt: nowIso() }).where(eq(profiles.id, DEFAULT_PROFILE_ID)).run();
    tx.delete(skills).where(eq(skills.profileId, DEFAULT_PROFILE_ID)).run();
    for (const name of [...new Set(skillNames)]) {
      tx.insert(skills).values({ id: randomUUID(), profileId: DEFAULT_PROFILE_ID, name, category: categories.get(name.toLocaleLowerCase("es")) ?? "general" }).run();
    }
    tx.delete(experiences).where(eq(experiences.profileId, DEFAULT_PROFILE_ID)).run();
    for (const experience of experienceItems) {
      tx.insert(experiences).values({ id: randomUUID(), profileId: DEFAULT_PROFILE_ID, ...experience }).run();
    }
  });
  recordActivity({ kind: "profile.updated", title: "Perfil profesional actualizado", entityType: "profile", entityId: DEFAULT_PROFILE_ID, actor: "user" });
  return getFullProfile();
}
