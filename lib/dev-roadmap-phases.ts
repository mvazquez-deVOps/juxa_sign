/**
 * Estado curado del camino Dev → producción (hoja de ruta /hoja-de-ruta-devs).
 * No se infiere del runtime: actualizar aquí al cerrar hitos (staging, prod).
 */
export type DevRoadmapItemStatus = "done" | "partial" | "todo";

export type DevRoadmapPipelineStep = {
  id: string;
  label: string;
  /** done = ya superado en un entorno real; current = foco típico del equipo; upcoming = pendiente */
  kind: "done" | "current" | "upcoming";
};

export type DevRoadmapPhaseItem = {
  text: string;
  status: DevRoadmapItemStatus;
};

export type DevRoadmapPhase = {
  id: string;
  title: string;
  items: DevRoadmapPhaseItem[];
};

export const devRoadmapCurrentStep = {
  title: "Fase actual: desarrollo en memoria / mock DIGID",
  body:
    "El repo está preparado para trabajar con JUXA_DATA_STORE=memory y DIGID mockeado (lib/data/mode.ts): panel completo, CI con E2E, seed que no exige Postgres. El siguiente salto operativo es Postgres persistente + prisma migrate deploy y luego integración DIGID real en staging (modo T).",
} as const;

export const devRoadmapPipelineSteps: DevRoadmapPipelineStep[] = [
  { id: "dev", label: "Dev (memoria + mock)", kind: "current" },
  { id: "staging", label: "Staging (DIGID T)", kind: "upcoming" },
  { id: "preprod", label: "Pre-prod", kind: "upcoming" },
  { id: "prod", label: "Prod (DIGID P)", kind: "upcoming" },
];

/** Fases 0–7 alineadas al plan de trabajo de la hoja de ruta. */
export const productionPhases: DevRoadmapPhase[] = [
  {
    id: "phase-0",
    title: "Fase 0 — Criterio de salida",
    items: [
      {
        text: "Criterios ponderados en /admin/proyecto según lib/mvp-criteria.ts",
        status: "done",
      },
      {
        text: "Definir qué estados de documento y webhooks son obligatorios para go-live (producto)",
        status: "todo",
      },
    ],
  },
  {
    id: "phase-1",
    title: "Fase 1 — Entorno y secretos",
    items: [
      {
        text: "Plantilla .env.example y docs/despliegue.md con DATABASE_URL, DIGID_*, AUTH_SECRET, etc.",
        status: "done",
      },
      {
        text: "Ejecutar npm run check:env en CI (.github/workflows/ci.yml)",
        status: "todo",
      },
      {
        text: "Política producción: sin DEMO_PASSWORD ni JUXA_DATA_STORE=memory (salvo demo aislada)",
        status: "todo",
      },
    ],
  },
  {
    id: "phase-2",
    title: "Fase 2 — Base de datos",
    items: [
      {
        text: "Migraciones versionadas: npx prisma migrate deploy en cada entorno persistente",
        status: "todo",
      },
      {
        text: "Backups y restauración del Postgres administrado",
        status: "todo",
      },
    ],
  },
  {
    id: "phase-3",
    title: "Fase 3 — Integración DIGID real",
    items: [
      {
        text: "Documentación de URLs y modo T/P en docs/api-digid.md (referencia para configurar entorno)",
        status: "done",
      },
      {
        text: "Desactivar mock (DIGID_MOCK, memoria) y validar credenciales contra sandbox DIGID",
        status: "todo",
      },
      {
        text: "Flujo completo con docs/checklist-pruebas-firma.md en staging",
        status: "todo",
      },
    ],
  },
  {
    id: "phase-4",
    title: "Fase 4 — Webhook y seguridad",
    items: [
      {
        text: "Registrar URL pública …/api/webhooks/digid en DIGID con DIGID_WEBHOOK_SECRET",
        status: "todo",
      },
      {
        text: "Smoke post-deploy: /api/health, webhook de prueba (docs/despliegue.md)",
        status: "partial",
      },
      {
        text: "Revisar middleware.ts y cabeceras en next.config.ts",
        status: "partial",
      },
    ],
  },
  {
    id: "phase-5",
    title: "Fase 5 — Almacenamiento de archivos",
    items: [
      {
        text: "Constancias/PDF: volumen persistente u objeto (S3, etc.) en hosts efímeros",
        status: "todo",
      },
    ],
  },
  {
    id: "phase-6",
    title: "Fase 6 — Calidad y multi-tenant",
    items: [
      {
        text: "CI: lint, build, Playwright (e2e/)",
        status: "done",
      },
      {
        text: "Ampliar cobertura E2E y auditar lecturas/mutaciones por organización",
        status: "partial",
      },
    ],
  },
  {
    id: "phase-7",
    title: "Fase 7 — Go-live y operación",
    items: [
      {
        text: "npm run check:env:production con dominio HTTPS definitivo",
        status: "todo",
      },
      {
        text: "Runbook e incidencias (docs/runbook-fallos.md) y canal on-call",
        status: "partial",
      },
    ],
  },
];

/** Trabajo accionable sin Postgres persistente (pulir flujo para devs). */
export const devRoadmapWorkWithoutDb: DevRoadmapPhaseItem[] = [
  {
    text: "Ampliar Playwright (e2e/auth.spec.ts): login VIEWER o SANDBOX, smoke /empresas, /documentos, /api/health, /prueba-e2e",
    status: "todo",
  },
  {
    text: "Alinear NEXT_PUBLIC_APP_URL y AUTH_URL con el puerto real (npm run dev → 3333, o dev:3000 / dev:3008) y README",
    status: "partial",
  },
  {
    text: "Pulir textos y estados de carga/error en envío a firma, lotes y visor (sin exigir DIGID real)",
    status: "todo",
  },
  {
    text: "Revisar enlaces en docs/ frente a rutas actuales (/flujo-producto ya es guía TSX en app)",
    status: "todo",
  },
  {
    text: "Ejecutar checklist manual docs/checklist-pruebas-firma.md en modo mock y anotar huecos",
    status: "todo",
  },
  {
    text: "Opcional: añadir paso npm run check:env al workflow de CI alineando variables con scripts/check-env.mjs",
    status: "todo",
  },
];
