import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getDashboardSnapshot } from "@/services/dashboard";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getDashboardSnapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
