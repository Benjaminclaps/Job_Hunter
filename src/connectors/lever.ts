import type { Company } from "@/db/schema";
import { fetchJson, inferWorkplaceMode, stripHtml } from "./shared";
import type { JobConnector, NormalizedJob } from "./types";

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  categories?: {
    department?: string;
    team?: string;
    location?: string;
    commitment?: string;
    allLocations?: string[];
  };
  workplaceType?: string;
};

export const leverConnector: JobConnector = {
  kind: "lever",
  async fetchJobs(company: Company): Promise<NormalizedJob[]> {
    if (!company.atsBoardToken) throw new Error("La empresa no tiene token de Lever.");
    const token = encodeURIComponent(company.atsBoardToken);
    const data = await fetchJson<LeverJob[]>(`https://api.lever.co/v0/postings/${token}?mode=json`);
    return data.map((job) => ({
      externalId: job.id,
      title: job.text,
      category: job.categories?.team ?? job.categories?.department,
      location: job.categories?.allLocations?.join(", ") ?? job.categories?.location,
      workplaceMode: inferWorkplaceMode(job.workplaceType, job.categories?.location),
      employmentType: job.categories?.commitment,
      description: job.descriptionPlain ?? stripHtml(job.description) ?? job.additionalPlain ?? "",
      requirements: [],
      responsibilities: [],
      originalUrl: job.hostedUrl,
      publishedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
      rawPayload: job as unknown as Record<string, unknown>,
    }));
  },
};
