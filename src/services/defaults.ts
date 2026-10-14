import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { companies, preferences, profiles, settings, skills, sources } from "@/db/schema";

export const DEFAULT_PROFILE_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_WEIGHTS = {
  professionalAlignment: 30,
  learningPotential: 25,
  experienceCompatibility: 20,
  conditionsAndDuration: 15,
  careerProjection: 10,
} as const;

export const DEFAULT_THRESHOLDS = {
  excellent: 90,
  veryInteresting: 75,
  consider: 60,
} as const;

const initialSkills = [
  ["Meta Ads", "marketing"],
  ["Adquisición de clientes", "growth"],
  ["Embudos comerciales", "sales"],
  ["CRM", "operations"],
  ["Generación de leads", "growth"],
  ["Automatizaciones", "technology"],
  ["Desarrollo de herramientas internas", "technology"],
  ["Construcción de aplicaciones con IA", "technology"],
  ["Next.js", "technology"],
  ["Supabase", "technology"],
  ["Vercel", "technology"],
  ["GitHub", "technology"],
  ["Codex", "technology"],
  ["Coordinación operativa", "operations"],
] as const;

const initialPreferences = [
  ["role", "Growth", 3], ["role", "Business Development", 3], ["role", "Revenue Operations", 3],
  ["role", "Marketing & Sales", 3], ["role", "Go-to-Market", 3], ["role", "Sales Operations", 3],
  ["role", "Estrategia comercial", 3], ["role", "Product Operations", 2], ["role", "Customer Success estratégico", 2],
  ["role", "Partnerships", 2], ["role", "Performance Marketing", 2], ["role", "Business Analytics", 2],
  ["role", "Community Management", 1], ["company_type", "SaaS B2B", 3], ["company_type", "IA", 3],
  ["company_type", "Fintech", 3], ["location", "Santiago", 3], ["workplace", "Remoto", 3], ["workplace", "Híbrido", 3],
] as const;

export function ensureDefaults(): void {
  const { db } = getDatabase();
  const existingProfile = db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, DEFAULT_PROFILE_ID)).get();
  if (!existingProfile) {
    db.insert(profiles).values({
      id: DEFAULT_PROFILE_ID,
      interests: ["Aprendizaje significativo", "Estrategia comercial", "Crecimiento de empresas tecnológicas"],
      objectives: ["Práctica de aproximadamente 6 meses", "Responsabilidades reales", "Posibilidad de contratación posterior"],
      restrictions: ["Residir en Chile", "No inventar experiencia ni habilidades"],
    }).run();
    for (const [name, category] of initialSkills) {
      db.insert(skills).values({ id: randomUUID(), profileId: DEFAULT_PROFILE_ID, name, category }).run();
    }
    for (const [kind, value, priority] of initialPreferences) {
      db.insert(preferences).values({ id: randomUUID(), profileId: DEFAULT_PROFILE_ID, kind, value, priority }).run();
    }
    for (const company of [
      { name: "Microsoft", slug: "microsoft", priority: 3, watchlisted: true, atsProvider: "manual" as const, atsBoardToken: null },
      { name: "Uplane", slug: "uplane", priority: 3, watchlisted: true, atsProvider: "ashby" as const, atsBoardToken: "uplane" },
      { name: "Yuno", slug: "yuno", priority: 3, watchlisted: true, atsProvider: "lever" as const, atsBoardToken: "yuno" },
    ]) {
      db.insert(companies).values({ id: randomUUID(), ...company }).run();
    }
  }
  for (const source of [
    { kind: "greenhouse" as const, name: "Greenhouse Job Board", baseUrl: "https://boards-api.greenhouse.io" },
    { kind: "lever" as const, name: "Lever Postings", baseUrl: "https://api.lever.co" },
    { kind: "ashby" as const, name: "Ashby Job Board", baseUrl: "https://api.ashbyhq.com" },
    { kind: "manual" as const, name: "Importación manual", baseUrl: null },
  ]) {
    db.insert(sources).values({ id: randomUUID(), ...source }).onConflictDoNothing().run();
  }
  db.insert(settings).values({ key: "evaluation_weights", value: DEFAULT_WEIGHTS }).onConflictDoNothing().run();
  db.insert(settings).values({ key: "score_thresholds", value: DEFAULT_THRESHOLDS }).onConflictDoNothing().run();
}
