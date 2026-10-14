import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { settings } from "@/db/schema";
import { scoringSettingsSchema } from "@/lib/schemas";
import { nowIso } from "@/lib/utils";
import { recordActivity } from "./activity";
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, ensureDefaults } from "./defaults";

export function getScoringSettings() {
  ensureDefaults();
  const { db } = getDatabase();
  return {
    weights: (db.select({ value: settings.value }).from(settings).where(eq(settings.key, "evaluation_weights")).get()?.value ?? DEFAULT_WEIGHTS),
    thresholds: (db.select({ value: settings.value }).from(settings).where(eq(settings.key, "score_thresholds")).get()?.value ?? DEFAULT_THRESHOLDS),
  };
}

export function updateScoringSettings(input: unknown) {
  ensureDefaults();
  const parsed = scoringSettingsSchema.parse(input);
  const { db } = getDatabase();
  const updatedAt = nowIso();
  db.transaction((tx) => {
    tx.update(settings).set({ value: parsed.weights, updatedAt }).where(eq(settings.key, "evaluation_weights")).run();
    tx.update(settings).set({ value: parsed.thresholds, updatedAt }).where(eq(settings.key, "score_thresholds")).run();
  });
  recordActivity({ kind: "settings.updated", title: "Pesos y umbrales actualizados", actor: "user" });
  return parsed;
}
