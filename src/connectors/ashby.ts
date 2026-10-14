import type { Company } from "@/db/schema";
import { fetchJson, inferWorkplaceMode, stripHtml } from "./shared";
import type { JobConnector, NormalizedJob } from "./types";

type AshbyResponse = {
  jobs: Array<{
    id?: string;
    title: string;
    location?: string;
    department?: string;
    team?: string;
    employmentType?: string;
    isRemote?: boolean;
    publishedAt?: string;
    jobUrl: string;
    applyUrl?: string;
    descriptionPlain?: string;
    descriptionHtml?: string;
  }>;
};

export const ashbyConnector: JobConnector = {
  kind: "ashby",
  async fetchJobs(company: Company): Promise<NormalizedJob[]> {
    if (!company.atsBoardToken) throw new Error("La empresa no tiene token de Ashby.");
    const token = encodeURIComponent(company.atsBoardToken);
    const data = await fetchJson<AshbyResponse>(`https://api.ashbyhq.com/posting-api/job-board/${token}`);
    return data.jobs.map((job) => ({
      externalId: job.id ?? job.jobUrl,
      title: job.title,
      category: job.team ?? job.department,
      location: job.location,
      workplaceMode: job.isRemote ? "remote" : inferWorkplaceMode(job.location, job.descriptionPlain),
      employmentType: job.employmentType,
      description: job.descriptionPlain ?? stripHtml(job.descriptionHtml),
      requirements: [],
      responsibilities: [],
      originalUrl: job.jobUrl,
      publishedAt: job.publishedAt,
      rawPayload: job as unknown as Record<string, unknown>,
    }));
  },
};
