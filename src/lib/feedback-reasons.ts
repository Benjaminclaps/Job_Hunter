export const dismissalReasons = [
  { code: "outside_focus", label: "No se alinea con mis áreas de interés", sentiment: "not_interested" },
  { code: "not_internship", label: "No es una práctica o el nivel no corresponde", sentiment: "not_interested" },
  { code: "website_unavailable", label: "La web o el enlace no funciona", sentiment: "not_interested" },
  { code: "expired", label: "La oferta caducó o ya fue cerrada", sentiment: "not_interested" },
  { code: "already_applied_at_company", label: "Ya postulé a otro cargo en esta empresa", sentiment: "not_interested" },
  { code: "location", label: "La ubicación no me sirve", sentiment: "not_interested" },
  { code: "workplace_mode", label: "La modalidad no me sirve", sentiment: "not_interested" },
  { code: "duration", label: "La duración o las fechas no me sirven", sentiment: "not_interested" },
  { code: "low_learning", label: "Poco aprendizaje o tareas muy repetitivas", sentiment: "not_interested" },
  { code: "eligibility_gap", label: "No cumplo un requisito importante", sentiment: "not_eligible" },
  { code: "conditions", label: "Las condiciones o compensación no me sirven", sentiment: "not_interested" },
  { code: "company_fit", label: "No me interesa la empresa o su industria", sentiment: "not_interested" },
  { code: "other", label: "Otro motivo", sentiment: "not_interested" },
] as const;

export const dismissalReasonLabels = Object.fromEntries(
  dismissalReasons.map(({ code, label }) => [code, label]),
) as Record<string, string>;
