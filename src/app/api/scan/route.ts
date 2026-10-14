import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { scanWatchlist } from "@/services/scanner";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await scanWatchlist({ company: body.company, query: body.query }));
  } catch (error) {
    return apiError(error);
  }
}
