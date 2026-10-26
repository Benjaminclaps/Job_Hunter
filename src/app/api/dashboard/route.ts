import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getDashboardSnapshot } from "@/services/dashboard";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getDashboardSnapshot({ includeJobDetails: false, includeDocumentText: false }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
