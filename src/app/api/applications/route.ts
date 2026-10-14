import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { listApplications, saveApplication } from "@/services/applications";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(listApplications());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(saveApplication(await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
