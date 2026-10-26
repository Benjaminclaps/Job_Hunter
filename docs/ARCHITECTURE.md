# Arquitectura local

```text
Codex en terminal ─┐
                  ├─ CLI / servicios compartidos ─ SQLite local
Dashboard Next.js ┘              │
                                 ├─ documentos locales
                                 └─ backups locales

APIs públicas ATS ─ conectores ─ normalización y deduplicación
```

`src/connectors` solo recupera y normaliza publicaciones. `src/services` concentra reglas de negocio, validación y eventos. `src/db` define la persistencia. `src/cli` y `src/app` son adaptadores del mismo núcleo.

SQLite funciona con WAL y un tiempo de espera de cinco segundos. Así, la CLI puede escribir mientras el dashboard consulta. El dashboard hace polling moderado; no depende de que Codex siga abierto.

El polling devuelve una vista ligera: no transfiere descripciones completas ni texto extraído del CV. La ficha carga descripción y requisitos solo al abrir una oferta. `profile:show` agrega ejemplos recientes de feedback y conteos históricos por motivo para que Codex evite recomendar ofertas equivalentes a las descartadas.

La clave de deduplicación combina fuente, empresa e identificador externo. Las actualizaciones conservan `first_seen_at`, refrescan `last_seen_at` y mantienen las evaluaciones históricas.
