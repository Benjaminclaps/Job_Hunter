import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getScoringSettings, updateScoringSettings } from "@/services/settings";

export const dynamic = "force-dynamic";

export function GET() {
  try { return NextResponse.json(getScoringSettings()); }
  catch (error) { return apiError(error); }
}

export async function PUT(request: NextRequest) {
  try { return NextResponse.json(updateScoringSettings(await request.json())); }
  catch (error) { return apiError(error); }
}
