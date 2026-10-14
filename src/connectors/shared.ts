import type { WorkplaceMode } from "./types";

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function inferWorkplaceMode(...values: Array<string | null | undefined>): WorkplaceMode {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (/hybrid|híbrido|hibrido/.test(text)) return "hybrid";
  if (/remote|remoto|anywhere/.test(text)) return "remote";
  if (/on-site|onsite|presencial|in office/.test(text)) return "onsite";
  return "unknown";
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "JobHunterAI/0.1 (local personal tool)" },
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`La fuente respondió HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}
