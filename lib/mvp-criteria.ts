/**
 * Criterios de avance del proyecto (producto en código + entrega a producción).
 * Fuente única para UI admin y referencias en hoja de ruta.
 * Ponderación: done=100%, partial=50% del peso.
 */
export type ProjectCriterionStatus = "done" | "partial" | "todo";

export type ProjectBlock =
  | "Seguridad"
  | "Calidad"
  | "Operación"
  | "SaaS"
  | "Automatización"
  | "Producto"
  | "Entrega";

export type ProjectCriterion = {
  id: string;
  label: string;
  block: ProjectBlock;
  weight: number;
  status: ProjectCriterionStatus;
  evidence?: string;
};

/** @deprecated usar ProjectCriterion */
export type MvpCriterion = ProjectCriterion;

/**
 * Criterios del proyecto: implementación en repo + hitos para producción (infra, DIGID real, cobro).
 */
export const PROJECT_CRITERIA: ProjectCriterion[] = [
  {
    id: "tenant-queries",
    block: "Seguridad",
    label: "Lecturas y mutaciones acotadas por organizationId (patrón requireOrgContext / gate)",
    weight: 12,
    status: "done",
    evidence: "lib/org-scope.ts, lib/gate.ts, app/actions/*",
  },
  {
    id: "viewer-actions",
    block: "Seguridad",
    label: "Rol VIEWER (visor · potencial consumidor) sin mutaciones en server actions críticas",
    weight: 8,
    status: "done",
    evidence: "gateMutation() en acciones de escritura",
  },
  {
    id: "provider-errors",
    block: "Calidad",
    label: "Mensajes de error del proveedor unificados al usuario (es-MX)",
    weight: 8,
    status: "done",
    evidence: "Normalización de errores del proveedor hacia el usuario",
  },
  {
    id: "e2e-playwright",
    block: "Calidad",
    label: "E2E Playwright (smoke login + ruta protegida)",
    weight: 10,
    status: "done",
    evidence:
      "e2e/auth.spec.ts, playwright.config.ts (puerto 3100, NEXTAUTH_URL alineado), CI con JUXA_DATA_STORE=memory",
  },
  {
    id: "ci-check-env",
    block: "Operación",
    label: "CI: lint + build (AUTH_SECRET, DATABASE_URL)",
    weight: 6,
    status: "done",
    evidence: ".github/workflows/ci.yml (lint, build, Playwright)",
  },
  {
    id: "ci-check-env-script",
    block: "Operación",
    label: "CI: validación npm run check:env (variables mínimas)",
    weight: 4,
    status: "partial",
    evidence: "Pendiente en workflow; scripts/check-env.mjs listo",
  },
  {
    id: "health-doc",
    block: "Operación",
    label: "Health check HTTP documentado",
    weight: 4,
    status: "done",
    evidence: "app/api/health/route.ts, docs/despliegue.md",
  },
  {
    id: "runbook-ops",
    block: "Operación",
    label: "Runbook de incidencias y operación documentada",
    weight: 4,
    status: "partial",
    evidence: "docs/runbook-fallos.md; canal on-call según tu organización",
  },
  {
    id: "team-invites",
    block: "SaaS",
    label: "Equipo: invitaciones por email y aceptación con contraseña",
    weight: 14,
    status: "done",
    evidence: "OrganizationInvite, /configuracion/equipo, /invitacion/[token]",
  },
  {
    id: "org-soft-limits",
    block: "SaaS",
    label: "Límites suaves por organización (max usuarios en settings)",
    weight: 6,
    status: "done",
    evidence: "OrganizationSettings.maxUsers, app/actions/team.ts (invitación y aceptación)",
  },
  {
    id: "envios-csv-filters",
    block: "Automatización",
    label: "Envíos: filtros, sincronización por selección, export CSV",
    weight: 10,
    status: "done",
    evidence: "app/envios/envios-client.tsx (filtros, CSV, sync selección)",
  },
  {
    id: "signer-urls-csv",
    block: "Automatización",
    label: "Export CSV de URLs por firmante (envío masivo manual)",
    weight: 6,
    status: "done",
    evidence: "app/actions/signing.ts exportSignerUrlsCsv; plantilla correo en enviar-client",
  },
  {
    id: "api-keys",
    block: "Automatización",
    label: "API keys por organización (hash, prefijo visible)",
    weight: 10,
    status: "done",
    evidence: "Prisma ApiKey, /configuracion/api-keys, app/actions/api-keys.ts",
  },
  {
    id: "batch-api-jobs",
    block: "Automatización",
    label: "Endpoint batch + cola SigningJob (idempotencia clientReference)",
    weight: 12,
    status: "done",
    evidence: "app/api/v1/batch/send/route.ts, SigningJob, lib/data/repository",
  },
  {
    id: "batch-ui",
    block: "Automatización",
    label: "UI Lotes (CSV de documentos + seguimiento de jobs)",
    weight: 8,
    status: "done",
    evidence: "app/lotes, app/actions/batch.ts",
  },
  {
    id: "panel-core",
    block: "Producto",
    label: "Panel: empresas, firmantes, documentos, visor, envío a firma, webhooks",
    weight: 16,
    status: "done",
    evidence: "app/flujo-producto/page.tsx · docs/flujo-producto.md (resumen repo)",
  },
  {
    id: "billing-stub",
    block: "SaaS",
    label: "Planes / cartera de folios (UI + acreditación manual; sin pasarela)",
    weight: 4,
    status: "done",
    evidence: "/folios/planes, superadmin folios, FolioLedger",
  },
  {
    id: "deliver-db-migrate",
    block: "Entrega",
    label: "Postgres productivo con prisma migrate deploy y backups",
    weight: 10,
    status: "todo",
    evidence: "docs/despliegue.md · sin drift en entornos persistentes",
  },
  {
    id: "deliver-digid-real",
    block: "Entrega",
    label: "DIGID modo T (staging): credenciales y flujo checklist completo",
    weight: 14,
    status: "todo",
    evidence: "docs/checklist-pruebas-firma.md · docs/api-digid.md",
  },
  {
    id: "deliver-webhook-public",
    block: "Entrega",
    label: "Webhook DIGID en URL HTTPS pública con DIGID_WEBHOOK_SECRET",
    weight: 8,
    status: "todo",
    evidence: "Registrar URL en DIGID · smoke post-deploy",
  },
  {
    id: "deliver-pdf-storage",
    block: "Entrega",
    label: "PDFs / constancias en almacenamiento persistente (no solo disco efímero)",
    weight: 8,
    status: "todo",
    evidence: "Volumen, objeto S3 u equivalente en el host",
  },
  {
    id: "deliver-billing-gateway",
    block: "Entrega",
    label: "Cobro en línea (p. ej. Stripe) y acreditación automática de folios",
    weight: 12,
    status: "todo",
    evidence: "Post-MVP · docs/planes-y-facturacion.md",
  },
  {
    id: "deliver-prod-policy",
    block: "Entrega",
    label: "Política producción: sin DEMO_PASSWORD ni JUXA_DATA_STORE=memory en runtime productivo",
    weight: 6,
    status: "todo",
    evidence: "Variables en host · npm run check:env:production",
  },
  {
    id: "deliver-go-live-product",
    block: "Entrega",
    label: "Definición formal de estados de documento y webhooks obligatorios para go-live (producto)",
    weight: 4,
    status: "todo",
    evidence: "Cierre con negocio / compliance",
  },
];

/** @deprecated usar PROJECT_CRITERIA */
export const MVP_CRITERIA = PROJECT_CRITERIA;

export type ProjectBlockSummary = {
  block: ProjectBlock;
  percent: number;
  weightTotal: number;
  weightEarned: number;
};

/** @deprecated usar ProjectBlockSummary */
export type MvpBlockSummary = ProjectBlockSummary;

function statusScore(s: ProjectCriterionStatus): number {
  if (s === "done") return 1;
  if (s === "partial") return 0.5;
  return 0;
}

export function computeProjectProgress(criteria: ProjectCriterion[] = PROJECT_CRITERIA): {
  percent: number;
  totalWeight: number;
  earnedWeight: number;
  byBlock: ProjectBlockSummary[];
} {
  const totalWeight = criteria.reduce((a, c) => a + c.weight, 0);
  const earnedWeight = criteria.reduce((a, c) => a + c.weight * statusScore(c.status), 0);
  const percent = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0;

  const blocks = new Map<ProjectBlock, { total: number; earned: number }>();
  for (const c of criteria) {
    const cur = blocks.get(c.block) ?? { total: 0, earned: 0 };
    cur.total += c.weight;
    cur.earned += c.weight * statusScore(c.status);
    blocks.set(c.block, cur);
  }

  const byBlock: ProjectBlockSummary[] = [...blocks.entries()].map(([block, { total, earned }]) => ({
    block,
    weightTotal: total,
    weightEarned: earned,
    percent: total > 0 ? Math.round((earned / total) * 1000) / 10 : 0,
  }));

  byBlock.sort((a, b) => a.block.localeCompare(b.block));

  return { percent, totalWeight, earnedWeight, byBlock };
}

/** @deprecated usar computeProjectProgress */
export const computeMvpProgress = computeProjectProgress;

export function projectCriteriaTodoFirst(criteria: ProjectCriterion[] = PROJECT_CRITERIA, limit = 8): ProjectCriterion[] {
  const order = (s: ProjectCriterionStatus) => (s === "todo" ? 0 : s === "partial" ? 1 : 2);
  return [...criteria].sort((a, b) => order(a.status) - order(b.status) || b.weight - a.weight).slice(0, limit);
}

export function projectCriteriaPendingFirst(
  criteria: ProjectCriterion[] = PROJECT_CRITERIA,
  limit = 8,
): ProjectCriterion[] {
  const order = (s: ProjectCriterionStatus) => (s === "todo" ? 0 : s === "partial" ? 1 : 2);
  return [...criteria]
    .filter((c) => c.status !== "done")
    .sort((a, b) => order(a.status) - order(b.status) || b.weight - a.weight)
    .slice(0, limit);
}

/** @deprecated usar projectCriteriaTodoFirst */
export const mvpCriteriaTodoFirst = projectCriteriaTodoFirst;

/** @deprecated usar projectCriteriaPendingFirst */
export const mvpCriteriaPendingFirst = projectCriteriaPendingFirst;
