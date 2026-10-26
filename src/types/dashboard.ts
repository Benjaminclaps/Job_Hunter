export type DashboardJob = {
  id: string;
  title: string;
  company_name: string;
  category: string | null;
  location: string | null;
  workplace_mode: string;
  employment_type: string | null;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  original_url: string;
  published_at: string | null;
  first_seen_at: string;
  status: string;
  personal_notes: string;
  source_kind: string;
  calculated_score: number | null;
  assessment_status: string | null;
  segment: string | null;
  eligibility: string | null;
  professional_category: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  missing_requirements: string[] | null;
  learning_potential: string | null;
  justification: string | null;
  recommendation: string | null;
  confidence: number | null;
  unknowns: string[] | null;
  professional_alignment: number | null;
  learning_potential_score: number | null;
  experience_compatibility: number | null;
  conditions_and_duration: number | null;
  career_projection: number | null;
};

export type DashboardSnapshot = {
  generatedAt: string;
  stats: {
    total_jobs: number;
    new_jobs: number;
    pending_jobs: number;
    high_match_jobs: number;
    active_applications: number;
    last_scan_at: string | null;
  };
  jobs: DashboardJob[];
  companies: Array<Record<string, unknown>>;
  applications: Array<Record<string, unknown>>;
  profile: {
    profile: Record<string, unknown>;
    experiences: Array<Record<string, unknown>>;
    skills: Array<Record<string, unknown>>;
    preferences: Array<Record<string, unknown>>;
    documents: Array<Record<string, unknown>>;
  };
  activity: Array<Record<string, unknown>>;
  searchRuns: Array<Record<string, unknown>>;
  settings: {
    weights: Record<string, number>;
    thresholds: Record<string, number>;
  };
};

export type DashboardView = "overview" | "discover" | "recommended" | "applications" | "companies" | "profile" | "activity" | "settings";
