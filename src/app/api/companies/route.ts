import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { createCompany, listCompanies } from "@/services/companies";
import { ensureDefaults } from "@/services/defaults";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    ensureDefaults();
    return NextResponse.json(listCompanies());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureDefaults();
    return NextResponse.json(createCompany(await request.json()), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
