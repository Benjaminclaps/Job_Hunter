import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getFullProfile, updateProfile } from "@/services/profile";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getFullProfile());
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json(updateProfile(await request.json()));
  } catch (error) {
    return apiError(error);
  }
}
