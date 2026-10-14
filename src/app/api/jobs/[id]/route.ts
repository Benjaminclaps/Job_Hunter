import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { saveApplication } from "@/services/applications";
import { getJobDetail } from "@/services/dashboard";
import { saveFeedback } from "@/services/feedback";
import { updateJob } from "@/services/job-actions";

export const dynamic = "force-dynamic";

export function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return context.params.then(({ id }) => {
    try {
      const detail = getJobDetail(id);
      return detail ? NextResponse.json(detail) : NextResponse.json({ error: "Oferta no encontrada." }, { status: 404 });
    } catch (error) {
      return apiError(error);
    }
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    if (body.action === "feedback") return NextResponse.json(saveFeedback(id, body.feedback));
    if (body.action === "application") return NextResponse.json(saveApplication({ jobId: id, ...body.application }));
    return NextResponse.json(updateJob(id, { status: body.status, personalNotes: body.personalNotes }));
  } catch (error) {
    return apiError(error);
  }
}
