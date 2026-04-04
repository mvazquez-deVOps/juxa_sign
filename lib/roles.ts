import type { UserRole } from "@prisma/client";

/** Administración dentro de una organización (panel, equipo, API keys, avance del proyecto). */
export function isOrganizationAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/**
 * Rol VIEWER: sin mutaciones ni sync remoto en el panel.
 * Homologado comercialmente con “potencial consumidor” (explora producto y planes antes de operar o comprar).
 */
export function isPanelReadOnlyRole(role: UserRole): boolean {
  return role === "VIEWER";
}

/** Mismo criterio que `isPanelReadOnlyRole` (nombre orientado a funnel comercial). */
export function isPotentialConsumerRole(role: UserRole): boolean {
  return role === "VIEWER";
}

/** Cartera que puede asociarse a una API key (envíos vía API descuentan folios de ese usuario). */
export function canAssignFolioWalletToApiKey(role: UserRole): boolean {
  return !isPanelReadOnlyRole(role);
}

/** Inicio con checklist sandbox y atajos E2E (rol interno de pruebas). El avance del proyecto ponderado está en /admin/proyecto (admins). */
export function showsPanelSandboxHints(role: UserRole): boolean {
  return role === "SANDBOX";
}

/** Notas internas en guías (flujo de producto, hoja de ruta): solo superadmin y rol de pruebas. */
export function showsInternalGuideComments(role: UserRole): boolean {
  return role === "SUPERADMIN" || role === "SANDBOX";
}

/** Etiqueta en español para el chip de sesión y tablas. */
export function panelRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    VIEWER: "Visor · potencial consumidor",
    OPERATOR: "Operador",
    USER: "Consumidor de folios",
    ADMIN: "Administrador",
    SUPERADMIN: "Superadministrador",
    SANDBOX: "Pruebas / sandbox",
  };
  return labels[role] ?? role;
}
