/**
 * Credenciales sembradas en memoria (ADMIN + OPERATOR) para login de prueba.
 * Misma fuente para la semilla (memory-store) y el aviso de login en desarrollo.
 */
export function getMemoryPanelUserEmail(): string {
  const raw = process.env.JUXA_MEMORY_PANEL_EMAIL?.trim().toLowerCase();
  return raw && raw.includes("@") ? raw : "demo@juxa.local";
}

export function getMemoryPanelUserPasswordPlain(): string {
  return process.env.JUXA_MEMORY_DEMO_PASSWORD?.trim() || "demo1234";
}

const OPERATOR_EMAIL_FALLBACKS = ["operador@juxa.local", "usuario@juxa.local", "equipo@juxa.local"] as const;

/** Operador: envíos, documentos y acciones que consumen folios (rol OPERATOR en Prisma). */
export function getMemoryOperatorUserEmail(): string {
  const panel = getMemoryPanelUserEmail();
  const raw = process.env.JUXA_MEMORY_OPERATOR_EMAIL?.trim().toLowerCase();
  const chosen = raw && raw.includes("@") ? raw : OPERATOR_EMAIL_FALLBACKS[0];
  if (chosen !== panel) return chosen;
  const alt = OPERATOR_EMAIL_FALLBACKS.find((e) => e !== panel);
  return alt ?? "operador+panel@juxa.local";
}

export function getMemoryOperatorUserPasswordPlain(): string {
  return process.env.JUXA_MEMORY_OPERATOR_PASSWORD?.trim() || "operador1234";
}

/** Visor · potencial consumidor: mismo tenant que ADMIN/OPERATOR; rol VIEWER (consulta + catálogo comercial). */
export function getMemoryViewerUserEmail(): string {
  const panel = getMemoryPanelUserEmail();
  const op = getMemoryOperatorUserEmail();
  const raw = process.env.JUXA_MEMORY_VIEWER_EMAIL?.trim().toLowerCase();
  const fallback = "observador@juxa.local";
  const chosen = raw && raw.includes("@") ? raw : fallback;
  if (chosen !== panel && chosen !== op) return chosen;
  if (fallback !== panel && fallback !== op) return fallback;
  return "viewer@juxa.local";
}

export function getMemoryViewerUserPasswordPlain(): string {
  return process.env.JUXA_MEMORY_VIEWER_PASSWORD?.trim() || "observador1234";
}

/** Cuenta SANDBOX: mismos permisos que operador + checklist sandbox y atajos E2E en inicio. */
export function getMemorySandboxUserEmail(): string {
  const panel = getMemoryPanelUserEmail();
  const op = getMemoryOperatorUserEmail();
  const view = getMemoryViewerUserEmail();
  const raw = process.env.JUXA_MEMORY_SANDBOX_EMAIL?.trim().toLowerCase();
  const fallback = "pruebas@juxa.local";
  const chosen = raw && raw.includes("@") ? raw : fallback;
  const used = new Set([panel, op, view].map((e) => e.toLowerCase()));
  if (!used.has(chosen)) return chosen;
  const alt = "sandbox@juxa.local";
  return used.has(alt) ? "qa@juxa.local" : alt;
}

export function getMemorySandboxUserPasswordPlain(): string {
  return process.env.JUXA_MEMORY_SANDBOX_PASSWORD?.trim() || "pruebas1234";
}
