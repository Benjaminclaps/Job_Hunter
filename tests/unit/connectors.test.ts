import { afterEach, describe, expect, it, vi } from "vitest";
import { ashbyConnector } from "@/connectors/ashby";
import { greenhouseConnector } from "@/connectors/greenhouse";
import { leverConnector } from "@/connectors/lever";
import type { Company } from "@/db/schema";
import { isChileCompatible, matchesScanQuery } from "@/services/scanner";

function company(provider: Company["atsProvider"]): Company {
  return {
    id: "company", name: "Empresa fixture", slug: "empresa-fixture", website: null, logoUrl: null,
    description: null, industry: null, priority: 2, watchlisted: true, atsProvider: provider,
    atsBoardToken: "board-token", lastScannedAt: null, lastScanStatus: null, lastScanError: null,
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  };
}

function mockJson(value: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } })));
}

afterEach(() => vi.unstubAllGlobals());

describe("conectores ATS", () => {
  it("no confunde intern con internal en búsquedas de prácticas", () => {
    const base = { externalId: "1", category: "IT", location: "Remote", workplaceMode: "remote" as const, employmentType: "Full time", requirements: [], responsibilities: [], originalUrl: "https://example.com/job", publishedAt: undefined, sourceUpdatedAt: undefined, rawPayload: {} };
    expect(matchesScanQuery({ ...base, title: "Senior IT Engineer", description: "Own internal technology systems." }, "intern")).toBe(false);
    expect(matchesScanQuery({ ...base, title: "Growth Intern", description: "Work with founders." }, "intern")).toBe(true);
  });

  it("normaliza Greenhouse y limpia HTML", async () => {
    mockJson({ jobs: [{ id: 1, title: "Growth Intern", absolute_url: "https://example.com/greenhouse/1", content: "<p>Aprende &amp; crece</p>", location: { name: "Santiago (Hybrid)" }, departments: [{ name: "Growth" }] }] });
    const [job] = await greenhouseConnector.fetchJobs(company("greenhouse"));
    expect(job).toMatchObject({ externalId: "1", category: "Growth", workplaceMode: "hybrid", description: "Aprende & crece" });
  });

  it("normaliza Lever", async () => {
    mockJson([{ id: "lever-1", text: "Revenue Operations Intern", hostedUrl: "https://example.com/lever/1", descriptionPlain: "Descripción", workplaceType: "remote", categories: { team: "Revenue", location: "Chile", commitment: "Internship" } }]);
    const [job] = await leverConnector.fetchJobs(company("lever"));
    expect(job).toMatchObject({ externalId: "lever-1", category: "Revenue", workplaceMode: "remote", employmentType: "Internship" });
  });

  it("normaliza Ashby", async () => {
    mockJson({ jobs: [{ id: "ashby-1", title: "Business Development Intern", jobUrl: "https://example.com/ashby/1", descriptionPlain: "Descripción", location: "Santiago", isRemote: false, department: "Commercial" }] });
    const [job] = await ashbyConnector.fetchJobs(company("ashby"));
    expect(job).toMatchObject({ externalId: "ashby-1", category: "Commercial", location: "Santiago" });
  });

  it("filtra ofertas para permitir únicamente vacantes en Chile o compatibles", () => {
    expect(isChileCompatible({ location: "Santiago, Chile", workplaceMode: "hybrid" })).toBe(true);
    expect(isChileCompatible({ location: "Las Condes", workplaceMode: "onsite" })).toBe(true);
    expect(isChileCompatible({ location: "Chile / México", workplaceMode: "remote" })).toBe(true);
    expect(isChileCompatible({ location: "LATAM", workplaceMode: "remote" })).toBe(true);
    expect(isChileCompatible({ location: "Madrid", workplaceMode: "onsite" })).toBe(false);
    expect(isChileCompatible({ location: "Sao Paulo / SP / Brazil", workplaceMode: "hybrid" })).toBe(false);
    expect(isChileCompatible({ location: "Mexico City (Remote)", workplaceMode: "remote" })).toBe(false);
    expect(isChileCompatible({ location: "Berlin", workplaceMode: "hybrid" })).toBe(false);
  });
});
