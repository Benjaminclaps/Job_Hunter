import { ZodError } from "zod";
import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Datos inválidos.", issues: error.issues }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Error interno.";
  return NextResponse.json({ error: message }, { status: 500 });
}
