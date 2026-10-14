# Job Hunter AI

Aplicación local para buscar prácticas públicas, analizarlas con Codex desde la terminal y gestionar postulaciones en un dashboard. No usa OpenAI API, Supabase, Vercel ni servicios cloud propios.

## Inicio rápido en VS Code

Requisitos ya verificados en este Mac: Node.js 22+, npm, Git y SQLite.

```bash
npm install
cp .env.example .env.local   # opcional: personaliza las rutas
npm run db:migrate
```

Abre dos terminales dentro de esta carpeta.

Terminal 1, dashboard:

```bash
npm run dev
```

Luego abre [http://127.0.0.1:3000](http://127.0.0.1:3000).

Terminal 2, conversación:

```bash
codex
```

Puedes pedirle a Codex, por ejemplo:

> Busca prácticas nuevas que contengan Growth, guarda los resultados y dime cuáles quedaron pendientes de evaluación.

> Evalúa hasta 10 ofertas pendientes según mi perfil, importa las evaluaciones y confirma los registros actualizados.

Codex leerá `AGENTS.md` y utilizará `npm run jh -- ...`. El dashboard consulta SQLite por separado y se actualiza cada diez segundos, incluso si Codex está cerrado.

## Flujo diario

```bash
# Buscar en los job boards configurados
npm run jh -- scan --query growth --json

# Ver el perfil y las ofertas pendientes
npm run jh -- profile:show --json
npm run jh -- jobs:pending --limit 10 --json

# Importar el JSON preparado por Codex
npm run jh -- evaluations:import /ruta/evaluaciones.json --json

# Revisar estado y crear un backup
npm run jh -- status --json
npm run jh -- backup --json
```

El contrato exacto de evaluación está en [docs/EVALUATION_SCHEMA.md](docs/EVALUATION_SCHEMA.md).

## Fuentes

La watchlist inicial incluye:

- Microsoft: seguimiento manual hasta crear un conector oficial compatible.
- Uplane: Ashby público.
- Yuno: Lever público.

Los tokens de Uplane y Yuno fueron verificados contra sus endpoints públicos. Puedes editar la watchlist desde Companies o la CLI:

```bash
npm run jh -- companies:add --name "Empresa" --provider greenhouse --board token-publico
```

Proveedores soportados: `greenhouse`, `lever`, `ashby` y `manual`. Una oferta suelta se importa desde JSON:

```json
{
  "companyName": "Empresa",
  "title": "Nombre exacto del cargo",
  "originalUrl": "https://sitio-oficial.example/jobs/id",
  "description": "Descripción copiada desde la fuente oficial",
  "location": "Santiago, Chile",
  "workplaceMode": "hybrid",
  "requirements": [],
  "responsibilities": []
}
```

```bash
npm run jh -- jobs:import /ruta/oferta.json --json
```

## Datos locales

Rutas predeterminadas:

```text
~/Documents/JobHunter/data/job-hunter.sqlite
~/Documents/JobHunter/data/backups/
~/Documents/JobHunter/documents/
```

Se pueden cambiar con `JOB_HUNTER_DATA_DIR`, `JOB_HUNTER_DB_PATH` y `JOB_HUNTER_DOCUMENTS_DIR`. SQLite usa WAL para permitir que la CLI escriba mientras el dashboard lee.

La base, backups, documentos y variables locales están excluidos de Git. Los CV originales nunca se modifican; la aplicación guarda una copia local y extrae texto para revisión.

## Comandos completos

```bash
npm run jh -- db:migrate
npm run jh -- status --json
npm run jh -- profile:show --json
npm run jh -- companies:list --json
npm run jh -- companies:add --name "Empresa" --provider ashby --board token
npm run jh -- scan --json
npm run jh -- scan --company slug --query growth --json
npm run jh -- jobs:list --limit 100 --json
npm run jh -- jobs:pending --limit 15 --json
npm run jh -- jobs:show UUID --json
npm run jh -- jobs:import archivo.json --json
npm run jh -- jobs:set-status UUID --status archived --json
npm run jh -- evaluations:import archivo.json --json
npm run jh -- feedback:add UUID --sentiment interest --explanation "Motivo" --json
npm run jh -- applications:list --json
npm run jh -- applications:set UUID --stage preparing --notes "Próximo paso" --json
npm run jh -- settings:show --json
npm run jh -- settings:import configuracion.json --json
npm run jh -- backup --json
```

## Calidad

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Las pruebas unitarias usan bases temporales y datos identificados como sintéticos. La prueba E2E valida que una oferta importada permanece tras recargar el dashboard.

## Alcance actual

Las fases 1, 2 y 3 están implementadas como MVP: persistencia, perfil, dashboard, CLI, watchlist, tres conectores, importación manual, deduplicación, evaluación validada, ranking, feedback y actualización automática.

Quedan para fases posteriores el comparador avanzado, launchd, Ollama, MCP local y notificaciones. Ollama no se descarga ni activa automáticamente.
