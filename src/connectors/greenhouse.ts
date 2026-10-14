import type { Company } from "@/db/schema";
import { fetchJson, inferWorkplaceMode, stripHtml } from "./shared";
import type { JobConnector, NormalizedJob } from "./types";

type GreenhouseResponse = {
  jobs: Array<{
    id: number;
    title: string;
    absolute_url: string;
    updated_at?: string;
    content?: string;
    location?: { name?: string };
    departments?: Array<{ name?: string }>;
  }>;
};

export const greenhouseConnector: JobConnector = {
  kind: "greenhouse",
  async fetchJobs(company: Company): Promise<NormalizedJob[]> {
    if (!company.atsBoardToken) throw new Error("La empresa no tiene token de Greenhouse.");
    const token = encodeURIComponent(company.atsBoardToken);
    const data = await fetchJson<GreenhouseResponse>(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
    return data.jobs.map((job) => ({
      externalId: String(job.id),
      title: job.title,
      category: job.departments?.[0]?.name,
      location: job.location?.name,
      workplaceMode: inferWorkplaceMode(job.location?.name, job.title, job.content),
      description: stripHtml(job.content),
      requirements: [],
      responsibilities: [],
      originalUrl: job.absolute_url,
      sourceUpdatedAt: job.updated_at,
      rawPayload: job as unknown as Record<string, unknown>,
    }));
  },
};
