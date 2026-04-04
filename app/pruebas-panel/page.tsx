import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPanelHubEnvSummary } from "@/lib/panel-hub-env";
import {
  PANEL_API_ROUTES,
  panelHubAdminRoutes,
  panelHubCoreRoutes,
  panelHubSuperadminRoutes,
  type PanelSitemapEntry,
} from "@/lib/panel-sitemap";
import { requireOrgContext } from "@/lib/org-scope";
import { panelRoleLabel } from "@/lib/roles";

export const dynamic = "force-dynamic";

function LinkGrid({ items }: { items: PanelSitemapEntry[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No hay entradas para tu rol.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((e) => (
        <li key={e.href}>
          <Link
            href={e.href}
            className="block rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-foreground">{e.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{e.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function PruebasPanelPage() {
  const { role } = await requireOrgContext();
  const env = getPanelHubEnvSummary();
  const core = panelHubCoreRoutes(role);
  const admin = panelHubAdminRoutes(role);
  const superadmin = panelHubSuperadminRoutes(role);

  const digidReadyHint =
    !env.memoryDataStore && !env.digidMocked && env.digidCredsConfigured
      ? "Las llamadas del panel deberían ir a DIGID real (modo indicado abajo). Haz un flujo corto: cliente → firmante → documento."
      : env.digidMocked
        ? "Ahora mismo el proveedor está simulado (mock o modo memoria). Para usar tus APIs reales, sigue los pasos de la tarjeta «Prueba con DIGID real»."
        : "Completa credenciales DIGID en .env y evita DIGID_MOCK / memoria.";

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pruebas y mapa del panel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu rol: <span className="font-medium text-foreground">{panelRoleLabel(role)}</span>. Aquí ves el estado del
            entorno, enlaces a todo el flujo y cómo probar contra DIGID con las credenciales que ya configuraste.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Inicio</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado del entorno (sin secretos)</CardTitle>
          <CardDescription>Lo que ve el servidor al renderizar esta página.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={env.memoryDataStore ? "secondary" : "default"}>
              Datos: {env.memoryDataStore ? "memoria (no Postgres)" : "Prisma / Postgres"}
            </Badge>
            <Badge variant={env.digidMocked ? "secondary" : "default"}>
              DIGID: {env.digidMocked ? "mock / simulado" : "llamadas reales al API"}
            </Badge>
            <Badge variant={env.digidCredsConfigured ? "default" : "destructive"}>
              Credenciales DIGID: {env.digidCredsConfigured ? "usuario + clave + token definidos" : "faltan variables"}
            </Badge>
            <Badge variant={env.nextPublicAppUrlSet ? "outline" : "secondary"}>
              NEXT_PUBLIC_APP_URL: {env.nextPublicAppUrlSet ? "definida" : "vacía"}
            </Badge>
            <Badge variant={env.webhookSecretSet ? "outline" : "secondary"}>
              DIGID_WEBHOOK_SECRET: {env.webhookSecretSet ? "definido" : "opcional aún"}
            </Badge>
          </div>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>
              Modo DIGID: <span className="font-mono text-xs text-foreground">{env.digidModo}</span>
            </li>
            <li>
              API Bearer (host): <span className="font-mono text-xs text-foreground">{env.digidApiHost}</span>
            </li>
            <li>
              Legacy (host): <span className="font-mono text-xs text-foreground">{env.digidLegacyHost}</span>
            </li>
          </ul>
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-foreground/90">{digidReadyHint}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prueba con DIGID real (APIs que ya tienes)</CardTitle>
          <CardDescription>
            Referencia detallada: <code className="text-xs">docs/api-digid.md</code> y checklist abajo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2 leading-relaxed">
            <li>
              En <code className="rounded bg-muted px-1 text-xs">.env</code>: <code className="text-xs">DIGID_API_BASE</code>,{" "}
              <code className="text-xs">DIGID_LEGACY_BASE</code>, <code className="text-xs">DIGID_USUARIO</code>,{" "}
              <code className="text-xs">DIGID_CLAVE</code>, <code className="text-xs">DIGID_TOKEN</code>,{" "}
              <code className="text-xs">DIGID_MODO</code> (T en sandbox). No subas el archivo al repo.
            </li>
            <li>
              Quita simulación: Postgres (no <code className="text-xs">JUXA_DATA_STORE=memory</code>) y{" "}
              <code className="text-xs">DIGID_MOCK=0</code> o sin <code className="text-xs">DIGID_MOCK=1</code>. Con solo
              memoria el mock sigue activo salvo que fuerces <code className="text-xs">DIGID_MOCK=0</code>.
            </li>
            <li>
              Postgres activo: <code className="text-xs">DATABASE_URL</code> +{" "}
              <code className="text-xs">npx prisma migrate deploy</code> o <code className="text-xs">db push</code> según tu
              flujo; usuario admin desde seed.
            </li>
            <li>
              Alinea <code className="text-xs">NEXT_PUBLIC_APP_URL</code> (y <code className="text-xs">AUTH_URL</code> /{" "}
              <code className="text-xs">NEXTAUTH_URL</code>) con el puerto real del dev server (p. ej. 3008).
            </li>
            <li>
              Flujo manual: <strong className="text-foreground">Clientes</strong> (nuevo) →{" "}
              <strong className="text-foreground">Firmantes</strong> (al menos uno con correo o teléfono) →{" "}
              <strong className="text-foreground">Nuevo documento</strong> (PDF) → marcas en el visor →{" "}
              <strong className="text-foreground">Enviar a firmar</strong>.
            </li>
            <li>
              Webhooks: con URL pública (túnel) registra <code className="text-xs">…/api/webhooks/digid</code> en DIGID y
              define <code className="text-xs">DIGID_WEBHOOK_SECRET</code> igual en ambos lados. Los administradores de la
              org revisan la tabla de eventos en Configuración.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/prueba-e2e">Abrir checklist completo (markdown)</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="/api/health" target="_blank" rel="noreferrer">
                Probar /api/health <ExternalLink className="ml-1 inline h-3 w-3" />
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/flujo-producto">Flujo de producto</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapa del panel</CardTitle>
          <CardDescription>Rutas principales según tu permiso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Operación diaria</h3>
            <LinkGrid items={core} />
          </div>
          {admin.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">Administración / dev</h3>
              <LinkGrid items={admin} />
            </div>
          ) : null}
          {superadmin.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">Plataforma (superadmin)</h3>
              <LinkGrid items={superadmin} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rutas API del servidor (DIGID y utilidades)</CardTitle>
          <CardDescription>
            El panel y las server actions usan el cliente en <code className="text-xs">lib/digid.ts</code>; estas URLs son
            las que suelen probarse con curl o integraciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {PANEL_API_ROUTES.map((r) => (
              <li key={r.path} className="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <code className="text-xs text-foreground">{r.path}</code>
                <span className="text-xs text-muted-foreground">{r.note}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
