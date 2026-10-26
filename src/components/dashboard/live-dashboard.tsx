"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, BriefcaseBusiness, Building2, Check, ChevronRight, CircleAlert,
  Clock3, Copy, FileText, LoaderCircle, MapPin, Plus, RefreshCw, Search, Sparkles,
  Star, Upload, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dismissalReasons } from "@/lib/feedback-reasons";
import { formatDate } from "@/lib/utils";
import type { DashboardJob, DashboardSnapshot, DashboardView } from "@/types/dashboard";

const refreshMs = Math.max(3_000, Number(process.env.NEXT_PUBLIC_REFRESH_MS ?? 10_000));

const viewCopy: Record<DashboardView, [string, string]> = {
  overview: ["Overview", "Tu espacio de oportunidades, actualizado desde SQLite."],
  discover: ["Discover", "Explora, filtra y gestiona todas las ofertas guardadas."],
  recommended: ["Recommended", "Oportunidades evaluadas y ordenadas por compatibilidad."],
  applications: ["Applications", "Seguimiento claro de cada postulación y próximo paso."],
  companies: ["Companies", "Empresas y job boards públicos incluidos en tu búsqueda."],
  profile: ["My Profile", "La información que Codex usa para evaluar oportunidades."],
  activity: ["Activity", "Historial verificable de búsquedas, evaluaciones y cambios."],
  settings: ["Settings", "Configuración local, pesos y criterios del sistema."],
};

const segments: Record<string, { label: string; tone: "green" | "blue" | "amber" | "red" | "neutral" }> = {
  excellent: { label: "Excelente", tone: "green" },
  very_interesting: { label: "Muy interesante", tone: "blue" },
  consider: { label: "Considerar", tone: "amber" },
  low_priority: { label: "Baja prioridad", tone: "red" },
  review_needed: { label: "Revisión necesaria", tone: "neutral" },
};

const eligibilityLabels: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  eligible: { label: "Elegible", tone: "green" },
  likely: { label: "Probable", tone: "green" },
  unclear: { label: "Por confirmar", tone: "amber" },
  ineligible: { label: "No elegible", tone: "red" },
};

function isActiveJob(job: DashboardJob) {
  return !["dismissed", "archived"].includes(job.status);
}

function isPendingJob(job: DashboardJob) {
  if (!isActiveJob(job) || job.status === "applied") return false;
  if (["new", "saved"].includes(job.status)) return true;
  return job.calculated_score !== null && job.recommendation !== "skip";
}

function comparePendingJobs(a: DashboardJob, b: DashboardJob) {
  const statusPriority = (job: DashboardJob) => job.status === "new" ? 0 : job.status === "saved" ? 1 : 2;
  const priorityDifference = statusPriority(a) - statusPriority(b);
  if (priorityDifference !== 0) return priorityDifference;
  if (["new", "saved"].includes(a.status) && ["new", "saved"].includes(b.status)) {
    return Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at);
  }
  return (b.calculated_score ?? -1) - (a.calculated_score ?? -1)
    || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at);
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "La operación no pudo completarse.");
  return body as T;
}

export function LiveDashboard({ view }: { view: DashboardView }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [selectedJob, setSelectedJob] = useState<DashboardJob | null>(null);
  const selectedJobIdRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const refreshAgainRef = useRef(false);
  const refreshRef = useRef<(quiet?: boolean, queueIfBusy?: boolean) => Promise<void>>(async () => {});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async (quiet = false, queueIfBusy = false) => {
    if (refreshInFlightRef.current) {
      if (queueIfBusy) refreshAgainRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    if (!quiet) setRefreshing(true);
    try {
      const data = await api<DashboardSnapshot>("/api/dashboard", { cache: "no-store" });
      setSnapshot(data);
      setLastUpdated(new Date());
      setError(null);
      const selectedId = selectedJobIdRef.current;
      if (selectedId) {
        const updatedJob = data.jobs.find((job) => job.id === selectedId);
        if (updatedJob) setSelectedJob(updatedJob);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer la base local.");
    } finally {
      setRefreshing(false);
      refreshInFlightRef.current = false;
      if (refreshAgainRef.current) {
        refreshAgainRef.current = false;
        window.setTimeout(() => void refreshRef.current(true), 0);
      }
    }
  }, []);

  const openJob = useCallback((job: DashboardJob) => {
    selectedJobIdRef.current = job.id;
    setSelectedJob(job);
  }, []);

  const closeJob = useCallback(() => {
    selectedJobIdRef.current = null;
    setSelectedJob(null);
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(false, true), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, refreshMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const [title, subtitle] = viewCopy[view];
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h1><p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p></div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" />{lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : "Conectando…"}</span>
          <Button aria-label="Actualizar" variant="outline" size="icon" onClick={() => void refresh(false, true)} disabled={refreshing}><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      {error && <Card className="mb-5 flex items-center gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700"><CircleAlert className="size-4" />{error}</Card>}
      {!snapshot ? <LoadingState /> : <DashboardContent view={view} snapshot={snapshot} onSelectJob={openJob} onRefresh={() => refresh(true, true)} />}
      {selectedJob && <JobDrawer key={selectedJob.id} job={selectedJob} onClose={closeJob} onRefresh={() => refresh(true, true)} />}
    </div>
  );
}

function LoadingState() {
  return <div className="flex min-h-80 items-center justify-center text-sm text-neutral-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Leyendo la base local…</div>;
}

function DashboardContent({ view, snapshot, onSelectJob, onRefresh }: { view: DashboardView; snapshot: DashboardSnapshot; onSelectJob: (job: DashboardJob) => void; onRefresh: () => void }) {
  if (view === "overview") return <Overview snapshot={snapshot} onSelectJob={onSelectJob} />;
  if (view === "discover") return <Discover snapshot={snapshot} onSelectJob={onSelectJob} onRefresh={onRefresh} />;
  if (view === "recommended") return <Recommended jobs={snapshot.jobs} onSelectJob={onSelectJob} />;
  if (view === "applications") return <Applications snapshot={snapshot} onRefresh={onRefresh} />;
  if (view === "companies") return <Companies snapshot={snapshot} onRefresh={onRefresh} />;
  if (view === "profile") return <Profile snapshot={snapshot} onRefresh={onRefresh} />;
  if (view === "activity") return <ActivityView snapshot={snapshot} />;
  return <SettingsView snapshot={snapshot} onRefresh={onRefresh} />;
}

function Overview({ snapshot, onSelectJob }: { snapshot: DashboardSnapshot; onSelectJob: (job: DashboardJob) => void }) {
  const [applicationFilter, setApplicationFilter] = useState<"pending" | "applied" | "all">("pending");
  const stats = [
    ["Ofertas en historial", snapshot.stats.total_jobs ?? 0, BriefcaseBusiness],
    ["Nuevas esta semana", snapshot.stats.new_jobs ?? 0, Sparkles],
    ["Alta compatibilidad", snapshot.stats.high_match_jobs ?? 0, Star],
    ["Sin evaluar", snapshot.stats.pending_jobs ?? 0, Clock3],
    ["Postulaciones activas", snapshot.stats.active_applications ?? 0, Check],
  ] as const;
  const activeJobs = snapshot.jobs.filter(isActiveJob);
  const pendingJobs = activeJobs.filter(isPendingJob).sort(comparePendingJobs);
  const appliedJobs = activeJobs.filter((job) => job.status === "applied");
  const counts = {
    pending: pendingJobs.length,
    applied: appliedJobs.length,
    all: activeJobs.length,
  };
  const visibleJobs = (applicationFilter === "all" ? activeJobs
    : applicationFilter === "applied" ? appliedJobs
      : pendingJobs);
  const emptyState = applicationFilter === "applied"
    ? { title: "Todavía no hay ofertas postuladas", detail: "Cuando marques una oferta como postulada, podrás encontrarla aquí." }
    : applicationFilter === "pending"
      ? { title: "No quedan ofertas pendientes", detail: "Puedes revisar tus postulaciones o ver todas las oportunidades con los filtros de arriba." }
      : { title: "Todavía no hay oportunidades activas", detail: "Importa ofertas o revisa los filtros de Discover." };
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map(([label, value, Icon]) => <Card key={label} className="p-4"><div className="mb-4 flex items-center justify-between text-neutral-400"><Icon className="size-4" /><span className="text-[11px] uppercase tracking-wider">Local</span></div><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-neutral-500">{label}</p></Card>)}
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
      <Card className="overflow-hidden"><SectionHeader title="Oportunidades" subtitle="Las nuevas aparecen primero en Por postular." /><div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-3 sm:px-5">{([ ["pending", `Por postular (${counts.pending})`], ["applied", `Postuladas (${counts.applied})`], ["all", `Todas (${counts.all})`] ] as const).map(([filter, label]) => <Button key={filter} type="button" size="sm" variant={applicationFilter === filter ? "default" : "outline"} aria-pressed={applicationFilter === filter} onClick={() => setApplicationFilter(filter)}>{label}</Button>)}</div>{visibleJobs.length ? <JobRows jobs={visibleJobs} onSelect={onSelectJob} /> : <EmptyState title={emptyState.title} detail={emptyState.detail} />}</Card>
      <Card><SectionHeader title="Cambios recientes" subtitle="Actividad registrada por las herramientas" /><div className="divide-y divide-neutral-100 px-5">{snapshot.activity.slice(0, 7).map((event) => <div key={String(event.id)} className="py-3.5"><p className="text-sm font-medium text-neutral-800">{String(event.title)}</p><p className="mt-1 text-xs text-neutral-400">{formatDate(String(event.created_at))} · {String(event.actor)}</p></div>)}{!snapshot.activity.length && <EmptyState title="Sin actividad" detail="Los cambios aparecerán aquí." compact />}</div></Card>
    </div>
  </div>;
}

function Discover({ snapshot, onSelectJob, onRefresh }: { snapshot: DashboardSnapshot; onSelectJob: (job: DashboardJob) => void; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("pending");
  const [showImport, setShowImport] = useState(false);
  const filtered = useMemo(() => {
    const matchingJobs = snapshot.jobs.filter((job) => {
      const haystack = `${job.title} ${job.company_name} ${job.category ?? ""} ${job.location ?? ""}`.toLowerCase();
      const matchesStatus = status === "all"
        || (status === "pending" && isPendingJob(job))
        || (status === "active" && isActiveJob(job))
        || (status === "omitted" && job.recommendation === "skip")
        || (!["pending", "active", "all", "omitted"].includes(status) && job.status === status);
      return haystack.includes(search.toLowerCase()) && (mode === "all" || job.workplace_mode === mode) && matchesStatus;
    });
    return status === "pending" ? matchingJobs.sort(comparePendingJobs) : matchingJobs;
  }, [snapshot.jobs, search, mode, status]);
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-neutral-400" /><Input className="pl-9" placeholder="Buscar cargo, empresa, categoría o ciudad…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <FilterSelect value={mode} onChange={setMode} options={[["all", "Todas las modalidades"], ["remote", "Remoto"], ["hybrid", "Híbrido"], ["onsite", "Presencial"], ["unknown", "Sin informar"]]} />
      <FilterSelect value={status} onChange={setStatus} options={[["pending", "Por postular"], ["applied", "Postuladas"], ["active", "Activas"], ["omitted", "Omitidas por Codex"], ["all", "Todos los estados"], ["new", "Nuevas"], ["saved", "Guardadas"], ["dismissed", "Descartadas"]]} />
      <Button type="button" onClick={() => setShowImport((value) => !value)}><Plus className="size-4" />Importar</Button>
    </div>
    {showImport && <ManualImport onDone={() => { setShowImport(false); onRefresh(); }} />}
    <Card className="overflow-hidden"><div className="border-b border-neutral-100 px-5 py-3 text-xs text-neutral-500">{filtered.length} resultados</div>{filtered.length ? <JobRows jobs={filtered} onSelect={onSelectJob} /> : <EmptyState title="No encontramos ofertas con estos filtros" detail="Prueba otra búsqueda o importa una publicación oficial." />}</Card>
  </div>;
}

function Recommended({ jobs, onSelectJob }: { jobs: DashboardJob[]; onSelectJob: (job: DashboardJob) => void }) {
  const groups = ["excellent", "very_interesting", "consider"];
  const evaluated = jobs.filter((job) => job.assessment_status === "scored" && job.recommendation !== "skip" && !["dismissed", "archived"].includes(job.status));
  if (!evaluated.length) return <Card><EmptyState title="Aún no hay ofertas evaluadas" detail="Desde Codex ejecuta jobs:pending, evalúa con evidencia e importa el JSON validado." /></Card>;
  return <div className="space-y-6">{groups.map((group) => {
    const items = evaluated.filter((job) => job.segment === group);
    if (!items.length) return null;
    return <section key={group}><div className="mb-3 flex items-center gap-2"><Badge tone={segments[group].tone}>{segments[group].label}</Badge><span className="text-xs text-neutral-400">{items.length} oportunidades</span></div><Card className="overflow-hidden"><JobRows jobs={items} onSelect={onSelectJob} /></Card></section>;
  })}</div>;
}

function JobRows({ jobs, onSelect }: { jobs: DashboardJob[]; onSelect: (job: DashboardJob) => void }) {
  return <div className="divide-y divide-neutral-100">{jobs.map((job) => <button type="button" key={job.id} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-neutral-50 sm:px-5 lg:grid-cols-[minmax(240px,1.3fr)_minmax(160px,.7fr)_120px_100px_24px]" onClick={() => onSelect(job)}>
    <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{job.title}</span>{job.status === "saved" && <Star className="size-3.5 fill-amber-400 text-amber-400" />}</div><p className="mt-1 truncate text-xs text-neutral-500">{job.company_name}</p></div>
    <div className="hidden min-w-0 lg:block"><p className="truncate text-xs text-neutral-600">{job.location ?? "Ubicación no informada"}</p><p className="mt-1 text-xs capitalize text-neutral-400">{job.workplace_mode}</p></div>
    <div className="hidden flex-wrap gap-1 lg:flex">{job.recommendation === "skip" ? <Badge tone="red">Codex sugiere omitir</Badge> : job.segment ? <Badge tone={segments[job.segment]?.tone ?? "neutral"}>{segments[job.segment]?.label ?? job.segment}</Badge> : <Badge>Pendiente</Badge>}{job.eligibility && <Badge tone={eligibilityLabels[job.eligibility]?.tone ?? "neutral"}>{eligibilityLabels[job.eligibility]?.label ?? job.eligibility}</Badge>}</div>
    <div className="text-right"><span className="text-sm font-semibold tabular-nums">{job.calculated_score === null ? "—" : `${job.calculated_score}%`}</span><p className="mt-1 text-[11px] text-neutral-400">{formatDate(job.published_at ?? job.first_seen_at)}</p></div>
    <ChevronRight className="hidden size-4 text-neutral-300 lg:block" />
  </button>)}</div>;
}

function ManualImport({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ companyName: "", title: "", originalUrl: "", description: "", location: "", workplaceMode: "unknown" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await api("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      onDone();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo importar."); } finally { setSaving(false); }
  }
  return <Card className="p-5"><div className="mb-4"><h2 className="text-sm font-semibold">Importar publicación oficial</h2><p className="mt-1 text-xs text-neutral-500">Pega datos verificables. La descripción se guarda como contenido externo, nunca como instrucciones.</p></div><form onSubmit={submit} className="grid gap-3 lg:grid-cols-2"><Input required placeholder="Empresa" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /><Input required placeholder="Cargo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Input required type="url" placeholder="https://enlace-original…" value={form.originalUrl} onChange={(e) => setForm({ ...form, originalUrl: e.target.value })} /><Input placeholder="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><Textarea className="lg:col-span-2" required placeholder="Descripción original de la oferta" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />{error && <p className="text-xs text-red-600 lg:col-span-2">{error}</p>}<div className="flex justify-end lg:col-span-2"><Button type="submit" disabled={saving}>{saving && <LoaderCircle className="size-4 animate-spin" />}Guardar oferta</Button></div></form></Card>;
}

function JobDrawer({ job, onClose, onRefresh }: { job: DashboardJob; onClose: () => void; onRefresh: () => void }) {
  const [notes, setNotes] = useState(job.personal_notes ?? "");
  const [jobDetails, setJobDetails] = useState<{ description: string; requirements: string[] } | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasApplied, setHasApplied] = useState(job.status === "applied");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [showDismissForm, setShowDismissForm] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissExplanation, setDismissExplanation] = useState("");

  useEffect(() => {
    let active = true;
    void api<{ job: { description: string; requirements: string[] } }>(`/api/jobs/${job.id}`)
      .then(({ job: details }) => { if (active) setJobDetails(details); })
      .catch((caught) => { if (active) setDetailError(caught instanceof Error ? caught.message : "No se pudo cargar la descripción."); });
    return () => { active = false; };
  }, [job.id]);

  async function patch(body: unknown, successMessage: string, onSaved?: () => void): Promise<boolean> {
    setBusy(true); setMessage(null);
    try {
      await api(`/api/jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      onSaved?.();
      setMessageTone("success");
      setMessage(successMessage);
      onRefresh();
      return true;
    } catch (caught) {
      setMessageTone("error");
      setMessage(caught instanceof Error ? caught.message : "No se pudo guardar.");
      return false;
    }
    finally { setBusy(false); }
  }

  async function copyJobLink() {
    setMessage(null);
    try {
      await navigator.clipboard.writeText(`${job.company_name} — ${job.title}\n${job.original_url}`);
      setMessageTone("success");
      setMessage("Enlace copiado.");
    } catch {
      setMessageTone("error");
      setMessage("No pude copiar el enlace. Ábrelo y copia la dirección manualmente.");
    }
  }

  function submitDismissal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = dismissalReasons.find((option) => option.code === dismissReason);
    if (!reason || (reason.code === "other" && dismissExplanation.trim().length < 5)) return;
    void patch({
      action: "feedback",
      feedback: {
        sentiment: reason.sentiment,
        reasonCode: reason.code,
        explanation: dismissExplanation.trim() || undefined,
      },
    }, "Oferta descartada; guardé el motivo para futuras recomendaciones.").then((saved) => { if (saved) setShowDismissForm(false); });
  }
  const dimensions = [
    ["Alineación", job.professional_alignment], ["Aprendizaje", job.learning_potential_score], ["Experiencia", job.experience_compatibility], ["Condiciones", job.conditions_and_duration], ["Proyección", job.career_projection],
  ] as const;
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-neutral-200 bg-white shadow-2xl">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white/95 px-5 py-4 backdrop-blur"><div className="flex items-center gap-2"><Badge>{job.source_kind}</Badge>{hasApplied && <Badge tone="green">Postulada</Badge>}{job.segment && <Badge tone={segments[job.segment]?.tone}>{segments[job.segment]?.label}</Badge>}{job.eligibility && <Badge tone={eligibilityLabels[job.eligibility]?.tone ?? "neutral"}>{eligibilityLabels[job.eligibility]?.label ?? job.eligibility}</Badge>}</div><Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button></div>
    <div className="space-y-7 p-5 sm:p-7">
      <div><p className="text-sm font-medium text-neutral-500">{job.company_name}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{job.title}</h2><div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500"><span className="flex items-center gap-1"><MapPin className="size-3.5" />{job.location ?? "Sin ubicación"}</span><span>{job.workplace_mode}</span><span>{job.employment_type ?? "Tipo no informado"}</span></div></div>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={busy} onClick={() => void patch({ status: "saved" }, "Oferta guardada.")}><Star className="size-4" />Guardar</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void patch({ action: "application", application: { stage: "applied", notes: "" } }, "Postulación guardada. La oferta quedó marcada como postulada.", () => setHasApplied(true))}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{busy ? "Guardando…" : hasApplied ? "Postulada" : "Marcar postulado"}</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void copyJobLink()}><Copy className="size-4" />Copiar</Button><a href={job.original_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">Abrir oferta<ArrowUpRight className="size-3.5" /></a><Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => setShowDismissForm((shown) => !shown)}>{showDismissForm ? "Cancelar descarte" : "Descartar"}</Button></div>
      {showDismissForm && <form onSubmit={submitDismissal} className="space-y-3 rounded-xl border border-red-100 bg-red-50/60 p-4"><div><label htmlFor="dismiss-reason" className="text-sm font-medium">¿Por qué descartas esta oferta?</label><select id="dismiss-reason" required className="mt-2 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm" value={dismissReason} onChange={(event) => setDismissReason(event.target.value)}><option value="" disabled>Elige el motivo principal</option>{dismissalReasons.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}</select></div><label htmlFor="dismiss-explanation" className="block text-xs font-medium text-neutral-600">{dismissReason === "other" ? "Explica el motivo" : "Detalle adicional (opcional)"}</label><Textarea id="dismiss-explanation" value={dismissExplanation} onChange={(event) => setDismissExplanation(event.target.value)} placeholder={dismissReason === "other" ? "Cuéntame por qué…" : "Ayudará a Codex a reconocer ofertas parecidas…"} required={dismissReason === "other"} /><div className="flex justify-end"><Button type="submit" size="sm" variant="danger" disabled={busy || !dismissReason || (dismissReason === "other" && dismissExplanation.trim().length < 5)}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}Guardar motivo</Button></div></form>}
      {message && <p role="status" className={`text-xs ${messageTone === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>}{busy && <p className="flex items-center gap-2 text-xs text-neutral-400"><LoaderCircle className="size-3.5 animate-spin" />Guardando cambio…</p>}
      {job.assessment_status && <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Análisis de Codex</p><p className="mt-2 text-sm font-medium">{job.professional_category}</p></div><div className="text-right"><p className="text-3xl font-semibold tracking-tight">{job.calculated_score === null ? "—" : job.calculated_score}</p><p className="text-[11px] text-neutral-400">compatibilidad</p></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{dimensions.map(([name, score]) => <div key={name} className="rounded-lg bg-white p-2.5 text-center ring-1 ring-neutral-200"><p className="font-semibold">{score ?? "—"}</p><p className="mt-1 text-[10px] text-neutral-400">{name}</p></div>)}</div>{job.justification && <p className="mt-5 text-sm leading-6 text-neutral-700">{job.justification}</p>}</section>}
      <ListSection title="Fortalezas" items={job.strengths} tone="green" /><ListSection title="Debilidades" items={job.weaknesses} tone="amber" /><ListSection title="Requisitos faltantes" items={job.missing_requirements} tone="red" />
      <section><h3 className="mb-3 text-sm font-semibold">Descripción original</h3><p className="whitespace-pre-wrap text-sm leading-7 text-neutral-600">{jobDetails ? jobDetails.description || "La fuente no entregó una descripción." : detailError ?? "Cargando descripción…"}</p></section>
      {!!jobDetails?.requirements.length && <ListSection title="Requisitos" items={jobDetails.requirements} />}
      <section><h3 className="mb-2 text-sm font-semibold">Notas personales</h3><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Entrevistas, contactos, dudas o próximos pasos…" /><div className="mt-2 flex justify-end"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void patch({ personalNotes: notes }, "Notas guardadas.")}>Guardar notas</Button></div></section>
    </div>
  </aside></div>;
}

function ListSection({ title, items, tone = "neutral" }: { title: string; items: string[] | null; tone?: "neutral" | "green" | "amber" | "red" }) {
  if (!items?.length) return null;
  const dot = { neutral: "bg-neutral-400", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" }[tone];
  return <section><h3 className="mb-3 text-sm font-semibold">{title}</h3><ul className="space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-neutral-600"><span className={`mt-2.5 size-1.5 shrink-0 rounded-full ${dot}`} />{item}</li>)}</ul></section>;
}

function Applications({ snapshot, onRefresh }: { snapshot: DashboardSnapshot; onRefresh: () => void }) {
  const stages = [["interesting", "Interesante"], ["preparing", "Preparando"], ["applied", "Postulada"], ["interview", "Entrevista"], ["offer", "Oferta"], ["rejected", "Rechazada"], ["dismissed", "Descartada"]] as const;
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  async function move(jobId: string, stage: string) {
    setUpdatingJobId(jobId);
    setMessage(null);
    try {
      await api("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, stage, notes: "" }) });
      setMessage({ text: `Etapa actualizada: ${stages.find(([value]) => value === stage)?.[1] ?? stage}.`, error: false });
      onRefresh();
    } catch (caught) {
      setMessage({ text: caught instanceof Error ? caught.message : "No se pudo actualizar la etapa.", error: true });
    } finally {
      setUpdatingJobId(null);
    }
  }
  return <div className="space-y-3"><div aria-live="polite" role="status" className={message ? `text-xs ${message.error ? "text-red-600" : "text-emerald-700"}` : "sr-only"}>{message?.text ?? ""}</div><div className="overflow-x-auto pb-4"><div className="grid min-w-[1260px] grid-cols-7 gap-3">{stages.map(([key, label]) => {
    const items = snapshot.applications.filter((item) => item.stage === key);
    return <div key={key}><div className="mb-3 flex items-center justify-between px-1"><h2 className="text-xs font-semibold text-neutral-600">{label}</h2><span className="text-xs text-neutral-400">{items.length}</span></div><div className="space-y-2">{items.map((item) => <Card key={String(item.id)} className="p-3"><p className="text-sm font-medium leading-5">{String(item.title)}</p><p className="mt-1 text-xs text-neutral-500">{String(item.company_name)}</p><select aria-label={`Etapa de ${String(item.title)}`} disabled={updatingJobId === String(item.job_id)} className="mt-3 h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs disabled:opacity-60" value={String(item.stage)} onChange={(e) => void move(String(item.job_id), e.target.value)}>{stages.map(([stage, stageLabel]) => <option key={stage} value={stage}>{stageLabel}</option>)}</select></Card>)}</div></div>;
  })}</div></div></div>;
}

function Companies({ snapshot, onRefresh }: { snapshot: DashboardSnapshot; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function scan() {
    setScanning(true); setMessage(null);
    try { const result = await api<Array<{ inserted: number }>>("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); setMessage(`Búsqueda completa: ${result.reduce((sum, row) => sum + row.inserted, 0)} ofertas nuevas.`); onRefresh(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo buscar."); } finally { setScanning(false); }
  }
  return <div className="space-y-4"><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => void scan()} disabled={scanning}>{scanning ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Buscar ahora</Button><Button onClick={() => setShowForm((value) => !value)}><Plus className="size-4" />Agregar empresa</Button></div>{message && <p className="text-right text-xs text-neutral-500">{message}</p>}{showForm && <CompanyForm onDone={() => { setShowForm(false); onRefresh(); }} />}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{snapshot.companies.map((company) => <Card key={String(company.id)} className="p-5"><div className="flex items-start justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-neutral-100"><Building2 className="size-4 text-neutral-500" /></div><Badge tone={company.lastScanStatus === "failed" ? "red" : company.lastScanStatus === "completed" ? "green" : "neutral"}>{company.lastScanStatus ? String(company.lastScanStatus) : "Sin buscar"}</Badge></div><h2 className="mt-4 text-sm font-semibold">{String(company.name)}</h2><p className="mt-1 text-xs text-neutral-500">{company.atsProvider ? `${String(company.atsProvider)} · ${String(company.atsBoardToken ?? "sin token")}` : "Sin conector"}</p><p className="mt-4 text-[11px] text-neutral-400">Última búsqueda: {formatDate(company.lastScannedAt as string | null)}</p>{Boolean(company.lastScanError) && <p className="mt-2 text-xs text-red-600">{String(company.lastScanError)}</p>}</Card>)}{!snapshot.companies.length && <Card className="sm:col-span-2 xl:col-span-3"><EmptyState title="La watchlist está vacía" detail="Agrega una empresa con Greenhouse, Lever o Ashby para comenzar." /></Card>}</div></div>;
}

function CompanyForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", website: "", atsProvider: "greenhouse", atsBoardToken: "", priority: 2, watchlisted: true });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null); setSaving(true);
    try { await api("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, website: form.website || undefined }) }); onDone(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }
  return <Card className="p-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input required placeholder="Nombre de la empresa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><Input type="url" placeholder="Sitio oficial (opcional)" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /><select className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm" value={form.atsProvider} onChange={(e) => setForm({ ...form, atsProvider: e.target.value })}><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="manual">Manual</option></select><Input required={form.atsProvider !== "manual"} placeholder="Token público del board" value={form.atsBoardToken} onChange={(e) => setForm({ ...form, atsBoardToken: e.target.value })} />{error && <p className="text-xs text-red-600 md:col-span-2 xl:col-span-4">{error}</p>}<div className="flex justify-end md:col-span-2 xl:col-span-4"><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}Guardar empresa</Button></div></form></Card>;
}

function Profile({ snapshot, onRefresh }: { snapshot: DashboardSnapshot; onRefresh: () => void }) {
  const source = snapshot.profile.profile;
  const array = (key: string) => Array.isArray(source[key]) ? (source[key] as string[]).join("\n") : "";
  const [form, setForm] = useState({
    fullName: String(source.fullName ?? ""), headline: String(source.headline ?? ""), location: String(source.location ?? ""), summary: String(source.summary ?? ""),
    education: array("education"), projects: array("projects"), languages: array("languages"), interests: array("interests"), objectives: array("objectives"), restrictions: array("restrictions"),
    skillNames: snapshot.profile.skills.map((skill) => String(skill.name)).join("\n"),
    experiences: snapshot.profile.experiences.map((experience) => [experience.title, experience.organization, experience.description].filter(Boolean).map(String).join(" | ")).join("\n"),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const split = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage(null); setSaving(true);
    const experienceItems = split(form.experiences).map((line) => {
      const [title, organization, ...description] = line.split("|").map((part) => part.trim());
      return { title, organization: organization || undefined, description: description.join(" | ") };
    });
    try { await api("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, education: split(form.education), projects: split(form.projects), languages: split(form.languages), interests: split(form.interests), objectives: split(form.objectives), restrictions: split(form.restrictions), skillNames: split(form.skillNames), experienceItems }) }); setMessage("Perfil guardado."); onRefresh(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0]; if (!file) return;
    const data = new FormData(); data.append("file", file); setMessage("Extrayendo texto del CV…"); setUploading(true);
    try { await api("/api/documents", { method: "POST", body: data }); setMessage("CV guardado localmente. Revisa el texto extraído antes de usarlo."); onRefresh(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo cargar el CV."); }
    finally { setUploading(false); input.value = ""; }
  }
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><Card className="p-5 sm:p-6"><form onSubmit={save} className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field><Field label="Ubicación"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field></div><Field label="Titular"><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></Field><Field label="Resumen"><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2">{(["education", "projects", "languages", "interests", "objectives", "restrictions"] as const).map((key) => <Field key={key} label={({ education: "Estudios", projects: "Proyectos", languages: "Idiomas", interests: "Intereses", objectives: "Objetivos", restrictions: "Restricciones" })[key]} hint="Una entrada por línea"><Textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}<Field label="Habilidades" hint="Una por línea"><Textarea value={form.skillNames} onChange={(e) => setForm({ ...form, skillNames: e.target.value })} /></Field><Field label="Experiencias" hint="Cargo | Organización | Descripción"><Textarea value={form.experiences} onChange={(e) => setForm({ ...form, experiences: e.target.value })} /></Field></div>{message && <p role="status" className="text-xs text-neutral-500">{message}</p>}<div className="flex justify-end"><Button type="submit" disabled={saving || uploading}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}Guardar perfil</Button></div></form></Card><div className="space-y-5"><Card className="p-5"><h2 className="text-sm font-semibold">Habilidades declaradas</h2><div className="mt-3 flex flex-wrap gap-2">{snapshot.profile.skills.map((skill) => <Badge key={String(skill.id)}>{String(skill.name)}</Badge>)}</div></Card><Card className="p-5"><h2 className="text-sm font-semibold">CV y documentos</h2><p className="mt-1 text-xs leading-5 text-neutral-500">El original se guarda fuera del repositorio. La extracción nunca modifica el archivo.</p><label aria-disabled={uploading} className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 p-4 text-xs font-medium text-neutral-600 hover:bg-neutral-50 ${uploading ? "pointer-events-none opacity-60" : ""}`}><Upload className="size-4" />{uploading ? "Procesando CV…" : "Cargar PDF o DOCX"}<input className="hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={upload} disabled={uploading} /></label><div className="mt-3 space-y-2">{snapshot.profile.documents.map((document) => <div key={String(document.id)} className="flex items-center gap-2 rounded-lg bg-neutral-50 p-2.5 text-xs"><FileText className="size-4 text-neutral-400" /><span className="truncate">{String(document.originalName)}</span></div>)}</div></Card></div></div>;
}

function ActivityView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]"><Card><SectionHeader title="Eventos" subtitle="Acciones de usuario, CLI y sistema" /><div className="divide-y divide-neutral-100 px-5">{snapshot.activity.map((event) => <div key={String(event.id)} className="flex gap-3 py-4"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-neutral-300" /><div><p className="text-sm font-medium">{String(event.title)}</p>{Boolean(event.detail) && <p className="mt-1 text-xs leading-5 text-neutral-500">{String(event.detail)}</p>}<p className="mt-1.5 text-[11px] text-neutral-400">{formatDate(String(event.created_at))} · {String(event.actor)}</p></div></div>)}</div></Card><Card><SectionHeader title="Búsquedas" subtitle="Resultado por empresa y fuente" /><div className="divide-y divide-neutral-100 px-5">{snapshot.searchRuns.map((run) => <div key={String(run.id)} className="py-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">{String(run.company_name ?? "Empresa eliminada")}</p><Badge tone={run.status === "completed" ? "green" : run.status === "failed" ? "red" : "neutral"}>{String(run.status)}</Badge></div><p className="mt-2 text-xs text-neutral-500">{String(run.inserted_count)} nuevas · {String(run.updated_count)} actualizadas · {String(run.source_name ?? "Fuente")}</p>{Boolean(run.error) && <p className="mt-2 text-xs text-red-600">{String(run.error)}</p>}</div>)}</div></Card></div>;
}

function SettingsView({ snapshot, onRefresh }: { snapshot: DashboardSnapshot; onRefresh: () => void }) {
  const [weights, setWeights] = useState(snapshot.settings.weights);
  const [thresholds, setThresholds] = useState(snapshot.settings.thresholds);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const weightLabels: Array<[string, string]> = [["professionalAlignment", "Alineación profesional"], ["learningPotential", "Aprendizaje potencial"], ["experienceCompatibility", "Compatibilidad con experiencia"], ["conditionsAndDuration", "Condiciones y duración"], ["careerProjection", "Proyección profesional"]];
  const thresholdLabels: Array<[string, string]> = [["excellent", "Excelente desde"], ["veryInteresting", "Muy interesante desde"], ["consider", "Considerar desde"]];
  async function save() {
    setMessage(null); setSaving(true);
    try { await api("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weights, thresholds }) }); setMessage("Configuración guardada. Las evaluaciones futuras usarán estos valores."); onRefresh(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }
  return <div className="grid gap-5 lg:grid-cols-2"><Card className="p-5"><h2 className="text-sm font-semibold">Evaluación</h2><p className="mt-1 text-xs leading-5 text-neutral-500">El total se calcula en código. Los pesos deben sumar 100.</p><div className="mt-5 space-y-3">{weightLabels.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 text-sm"><span className="text-neutral-600">{label}</span><div className="flex items-center gap-1"><Input className="h-8 w-20 text-right" type="number" min="0" max="100" value={weights[key] ?? 0} onChange={(event) => setWeights({ ...weights, [key]: Number(event.target.value) })} /><span className="text-xs text-neutral-400">%</span></div></label>)}</div><div className="my-5 border-t border-neutral-100" /><h3 className="text-xs font-semibold text-neutral-600">Umbrales</h3><div className="mt-3 space-y-3">{thresholdLabels.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 text-sm"><span className="text-neutral-600">{label}</span><Input className="h-8 w-20 text-right" type="number" min="0" max="100" value={thresholds[key] ?? 0} onChange={(event) => setThresholds({ ...thresholds, [key]: Number(event.target.value) })} /></label>)}</div>{message && <p role="status" className="mt-4 text-xs text-neutral-500">{message}</p>}<div className="mt-4 flex justify-end"><Button type="button" size="sm" disabled={saving} onClick={() => void save()}>{saving && <LoaderCircle className="size-4 animate-spin" />}{saving ? "Guardando…" : "Guardar configuración"}</Button></div></Card><Card className="p-5"><h2 className="text-sm font-semibold">Privacidad y sincronización</h2><div className="mt-4 space-y-3 text-sm text-neutral-600"><p className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />SQLite y documentos en carpetas locales.</p><p className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />Actualización automática cada {refreshMs / 1000} segundos.</p><p className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />Sin APIs de IA con cobro por tokens.</p><p className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />Dashboard disponible sin Codex abierto.</p></div></Card></div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="border-b border-neutral-100 px-5 py-4"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-neutral-400">{subtitle}</p></div>;
}

function EmptyState({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? "py-8" : "py-16"}`}><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-neutral-100"><BriefcaseBusiness className="size-4 text-neutral-400" /></div><p className="text-sm font-medium">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-neutral-500">{detail}</p></div>;
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<readonly [string, string]> }) {
  return <select className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-600 outline-none" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-medium text-neutral-600">{label}{hint && <span className="font-normal text-neutral-400">{hint}</span>}</span>{children}</label>;
}
