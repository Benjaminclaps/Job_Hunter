import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { importManualJob, listRawJobs } from "@/services/jobs";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    return NextResponse.json(listRawJobs({
      status: params.get("status") ?? undefined,
      search: params.get("search") ?? undefined,
      limit: Number(params.get("limit") ?? 100),
    }));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(importManualJob(await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
