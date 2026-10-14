import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { companies } from "@/db/schema";
import { companyInputSchema } from "@/lib/schemas";
import { nowIso, toSlug } from "@/lib/utils";
import { recordActivity } from "./activity";

export function listCompanies() {
  return getDatabase().db.select().from(companies).orderBy(asc(companies.name)).all();
}

export function createCompany(input: unknown) {
  const parsed = companyInputSchema.parse(input);
  const { db } = getDatabase();
  const slug = toSlug(parsed.name);
  const existing = db.select().from(companies).where(eq(companies.slug, slug)).get();
  if (existing) {
    db.update(companies).set({ ...parsed, updatedAt: nowIso() }).where(eq(companies.id, existing.id)).run();
    recordActivity({ kind: "company.updated", title: `Empresa actualizada: ${parsed.name}`, entityType: "company", entityId: existing.id, actor: "user" });
    return db.select().from(companies).where(eq(companies.id, existing.id)).get();
  }

  const id = randomUUID();
  db.insert(companies).values({ id, slug, ...parsed }).run();
  recordActivity({ kind: "company.created", title: `Empresa agregada: ${parsed.name}`, entityType: "company", entityId: id, actor: "user" });
  return db.select().from(companies).where(eq(companies.id, id)).get();
}
