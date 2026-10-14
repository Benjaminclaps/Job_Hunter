import type { Company } from "@/db/schema";

export type WorkplaceMode = "onsite" | "hybrid" | "remote" | "unknown";

export type NormalizedJob = {
  externalId: string;
  title: string;
  category?: string;
  location?: string;
  workplaceMode: WorkplaceMode;
  employmentType?: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  originalUrl: string;
  publishedAt?: string;
  sourceUpdatedAt?: string;
  rawPayload: Record<string, unknown>;
};

export interface JobConnector {
  readonly kind: "greenhouse" | "lever" | "ashby";
  fetchJobs(company: Company): Promise<NormalizedJob[]>;
}
