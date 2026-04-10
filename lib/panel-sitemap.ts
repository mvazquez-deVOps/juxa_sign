import type { UserRole } from "@prisma/client";

export type PanelSitemapEntry = {
  href: string;
  label: string;
  description: string;
};

export const PANEL_SITEMAP_CORE: PanelSitemapEntry[] = [
  { href: "/", label: "Inicio", description: "Resumen y siguiente paso sugerido." },
  { href: "/empresas", label: "Clientes", description: "Directorio de empresas/personas en DIGID." },
  { href: "/empresas/nueva", label: "Nuevo cliente", description: "Alta en proveedor (registrar empresa)." },
  { href: "/firmantes", label: "Firmantes", description: "Personas que firman por cliente." },
  { href: "/documentos", label: "Documentos", description: "Listado y estado de envíos." },
  { href: "/documentos/nuevo", label: "Nuevo documento", description: "Subir PDF y crear en DIGID." },
  { href: "/envios", label: "Envíos", description: "Sincronizar estado, filtros, CSV." },
  { href: "/folios", label: "Mis folios", description: "Saldo y movimientos de cartera." },
  { href: "/folios/planes", label: "Planes", description: "Catálogo comercial de paquetes." },
  { href: "/lotes", label: "Lotes", description: "Envíos masivos vía CSV y jobs." },
  { href: "/configuracion", label: "Configuración", description: "Webhook DIGID y utilidades." },
  { href: "/configuracion/equipo", label: "Equipo", description: "Invitaciones y límites de usuarios." },
  { href: "/configuracion/api-keys", label: "API keys", description: "Claves para /api/v1/batch/send." },
  { href: "/configuracion/folios", label: "Folios (org)", description: "Acreditación entre miembros (admin org)." },
  { href: "/ayuda", label: "Ayuda", description: "FAQ y primeros pasos." }
];

export const PANEL_SITEMAP_SUPERADMIN: PanelSitemapEntry[] = [
  { href: "/superadmin", label: "Plataforma", description: "Resumen global, orgs, folios, lotes." },
  { href: "/superadmin/folios", label: "Folios plataforma", description: "Catálogo global y acreditaciones." },
  { href: "/superadmin/lotes", label: "Lotes plataforma", description: "Jobs entre organizaciones." },
];

export const PANEL_API_ROUTES: { path: string; note: string }[] = [
  { path: "/api/health", note: "Smoke de disponibilidad." },
  { path: "/api/webhooks/digid", note: "Entrada de eventos DIGID (URL pública + ?secret=)." },
  { path: "/api/proxy-pdf", note: "Proxy de PDF (DIGID o localhost en dev)." },
  { path: "/api/v1/batch/send", note: "Envío batch (API key + Bearer opcional)." },
  { path: "/api/certificates/[id]", note: "Descarga de constancia cuando aplique." },
];

const CONFIG_PREFIX = "/configuracion";

function isBlockedForUserOrViewer(href: string, role: UserRole): boolean {
  if (role === "USER") {
    if (href === "/empresas/nueva" || href === "/documentos/nuevo" || href === "/lotes") return true;
    if (href.startsWith(CONFIG_PREFIX)) return true;
    return false;
  }
  if (role === "VIEWER") {
    if (href === "/empresas/nueva" || href === "/documentos/nuevo" || href === "/lotes") return true;
    if (href.startsWith(CONFIG_PREFIX)) return true;
    return false;
  }
  return false;
}

export function panelHubCoreRoutes(role: UserRole): PanelSitemapEntry[] {
  return PANEL_SITEMAP_CORE.filter((e) => !isBlockedForUserOrViewer(e.href, role));
}

export function panelHubAdminRoutes(role: UserRole): PanelSitemapEntry[] {
  if (role === "USER" || role === "VIEWER") return [];
  return [];
}

export function panelHubSuperadminRoutes(role: UserRole): PanelSitemapEntry[] {
  if (role !== "SUPERADMIN") return [];
  return [...PANEL_SITEMAP_SUPERADMIN];
}
