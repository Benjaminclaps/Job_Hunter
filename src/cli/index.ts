#!/usr/bin/env node
import fs from "node:fs";
import { Command } from "commander";
import { getDatabase } from "@/db";
import { createBackup } from "@/services/backup";
import { createCompany, listCompanies } from "@/services/companies";
import { getDashboardSnapshot, getJobDetail } from "@/services/dashboard";
import { ensureDefaults } from "@/services/defaults";
import { importEvaluations, pendingJobs } from "@/services/evaluations";
import { saveFeedback } from "@/services/feedback";
import { importManualJob } from "@/services/jobs";
import { updateJob } from "@/services/job-actions";
import { getFullProfile } from "@/services/profile";
import { scanWatchlist } from "@/services/scanner";
import { listApplications, saveApplication } from "@/services/applications";
import { getScoringSettings, updateScoringSettings } from "@/services/settings";

const program = new Command();

function print(value: unknown, json = false): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(value)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

program
  .name("jh")
  .description("Herramientas locales de Job Hunter AI")
  .version("0.1.0");

program.command("db:migrate")
  .description("Aplica migraciones e inicializa el perfil y la configuración")
  .action(() => {
    getDatabase();
    ensureDefaults();
    print({ ok: true, message: "Base de datos migrada e inicializada." });
  });

program.command("status")
  .description("Muestra métricas operativas")
  .option("--json", "Salida JSON compacta")
  .action((options) => {
    const snapshot = getDashboardSnapshot();
    print({ generatedAt: snapshot.generatedAt, ...snapshot.stats }, options.json);
  });

program.command("profile:show")
  .description("Entrega el perfil, habilidades y preferencias")
  .option("--json", "Salida JSON compacta")
  .action((options) => print(getFullProfile(), options.json));

program.command("companies:list")
  .description("Lista la watchlist de empresas")
  .option("--json", "Salida JSON compacta")
  .action((options) => {
    ensureDefaults();
    print(listCompanies(), options.json);
  });

program.command("companies:add")
  .description("Agrega o actualiza una empresa y su job board público")
  .requiredOption("--name <name>", "Nombre de la empresa")
  .option("--website <url>", "Sitio oficial")
  .option("--provider <provider>", "greenhouse, lever, ashby o manual")
  .option("--board <token>", "Token público del job board")
  .option("--priority <number>", "1 baja, 2 media, 3 alta", "2")
  .option("--json", "Salida JSON compacta")
  .action((options) => {
    ensureDefaults();
    const company = createCompany({
      name: options.name,
      website: options.website,
      atsProvider: options.provider,
      atsBoardToken: options.board,
      priority: options.priority,
      watchlisted: true,
    });
    print(company, options.json);
  });

program.command("scan")
  .description("Consulta las empresas configuradas y persiste vacantes públicas")
  .option("--company <slug>", "Limita la búsqueda a una empresa")
  .option("--query <text>", "Filtra los resultados recuperados antes de guardarlos")
  .option("--json", "Salida JSON compacta")
  .action(async (options) => print(await scanWatchlist({ company: options.company, query: options.query }), options.json));

program.command("jobs:list")
  .description("Lista ofertas guardadas")
  .option("--status <status>", "new, saved, dismissed, applied o archived")
  .option("--search <text>", "Busca en cargo y descripción")
  .option("--limit <number>", "Máximo de resultados", "100")
  .option("--full", "Incluye descripciones y análisis completos")
  .option("--json", "Salida JSON compacta")
  .action((options) => {
    const search = String(options.search ?? "").toLocaleLowerCase("es");
    const jobs = getDashboardSnapshot().jobs.filter((job) => {
      const matchesStatus = !options.status || job.status === options.status;
      const matchesSearch = !search || `${job.title} ${job.company_name} ${job.category ?? ""} ${job.description}`.toLocaleLowerCase("es").includes(search);
      return matchesStatus && matchesSearch;
    }).slice(0, Number(options.limit));
    const output = options.full ? jobs : jobs.map((job) => ({
      id: job.id,
      company: job.company_name,
      title: job.title,
      category: job.category,
      location: job.location,
      workplaceMode: job.workplace_mode,
      status: job.status,
      score: job.calculated_score,
      segment: job.segment,
      eligibility: job.eligibility,
      publishedAt: job.published_at,
      originalUrl: job.original_url,
    }));
    print(output, options.json);
  });

program.command("jobs:pending")
  .description("Entrega ofertas todavía no evaluadas")
  .option("--limit <number>", "Máximo de resultados", "15")
  .option("--json", "Salida JSON compacta")
  .action((options) => print(pendingJobs(Number(options.limit)), options.json));

program.command("jobs:show")
  .description("Muestra una oferta con su historial")
  .argument("<id>", "UUID de la oferta")
  .option("--json", "Salida JSON compacta")
  .action((id, options) => {
    const detail = getJobDetail(id);
    if (!detail) throw new Error(`No existe la oferta ${id}.`);
    print(detail, options.json);
  });

program.command("jobs:import")
  .description("Importa una oferta manual desde un archivo JSON validado")
  .argument("<file>", "Archivo JSON con companyName, title, originalUrl y descripción")
  .option("--json", "Salida JSON compacta")
  .action((file, options) => print(importManualJob(readJson(file)), options.json));

program.command("jobs:set-status")
  .description("Cambia el estado de una o varias ofertas sin borrar su historial")
  .argument("<ids...>", "Uno o más UUID de ofertas")
  .requiredOption("--status <status>", "new, saved, dismissed, applied o archived")
  .option("--json", "Salida JSON compacta")
  .action((ids: string[], options) => {
    const allowed = ["new", "saved", "dismissed", "applied", "archived"] as const;
    type AllowedStatus = (typeof allowed)[number];
    if (!allowed.includes(options.status as AllowedStatus)) throw new Error("Estado de oferta inválido.");
    const updated = ids.map((id) => {
      const job = updateJob(id, { status: options.status as AllowedStatus });
      return { id: job?.id, title: job?.title, status: job?.status };
    });
    print({ updated: updated.length, jobs: updated }, options.json);
  });

program.command("evaluations:import")
  .description("Valida y guarda una o varias evaluaciones estructuradas")
  .argument("<file>", "Archivo JSON de evaluación")
  .option("--json", "Salida JSON compacta")
  .action((file, options) => print(importEvaluations(readJson(file)), options.json));

program.command("feedback:add")
  .description("Registra una preferencia explícita sobre una oferta")
  .argument("<jobId>", "UUID de la oferta")
  .requiredOption("--sentiment <value>", "strong_interest, interest, not_interested o not_eligible")
  .option("--reason <code>", "Código breve del motivo")
  .option("--explanation <text>", "Explicación del usuario")
  .option("--json", "Salida JSON compacta")
  .action((jobId, options) => print(saveFeedback(jobId, { sentiment: options.sentiment, reasonCode: options.reason, explanation: options.explanation }), options.json));

program.command("applications:list")
  .description("Lista postulaciones y su etapa")
  .option("--json", "Salida JSON compacta")
  .action((options) => print(listApplications(), options.json));

program.command("applications:set")
  .description("Crea o actualiza una postulación")
  .argument("<jobId>", "UUID de la oferta")
  .requiredOption("--stage <stage>", "interesting, preparing, applied, interview, offer, rejected o dismissed")
  .option("--notes <text>", "Notas")
  .option("--json", "Salida JSON compacta")
  .action((jobId, options) => print(saveApplication({ jobId, stage: options.stage, notes: options.notes ?? "" }), options.json));

program.command("backup")
  .description("Crea una copia consistente de SQLite")
  .option("--json", "Salida JSON compacta")
  .action(async (options) => print({ ok: true, path: await createBackup() }, options.json));

program.command("settings:show")
  .description("Muestra pesos y umbrales de evaluación")
  .option("--json", "Salida JSON compacta")
  .action((options) => print(getScoringSettings(), options.json));

program.command("settings:import")
  .description("Actualiza pesos y umbrales desde un JSON validado")
  .argument("<file>", "Archivo JSON de configuración")
  .option("--json", "Salida JSON compacta")
  .action((file, options) => print(updateScoringSettings(readJson(file)), options.json));

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
});
