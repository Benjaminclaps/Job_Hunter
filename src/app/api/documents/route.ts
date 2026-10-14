import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { storeDocument } from "@/services/documents";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    return NextResponse.json(await storeDocument(file), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
