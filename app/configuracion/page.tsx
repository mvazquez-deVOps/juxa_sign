import Link from "next/link";
import { dbCompaniesFindManyByRazon, dbEnsureDefaultDemoClientIfEmpty } from "@/lib/data/repository";
import { getDigidConnectionSummary } from "@/lib/digid-env-summary";
import { canMutate } from "@/lib/gate";
import { requireOrgContext } from "@/lib/org-scope";
import { isOrganizationAdmin, isPanelReadOnlyRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigWebhookForm } from "./webhook-form";
import { QuickSignerMailTest } from "./quick-signer-mail-test";
import { WebhookEventsTable } from "./webhook-events-table";

function showWebhookEventsDebug(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.JUXA_WEBHOOK_DEBUG_UI === "1";
}

export default async function ConfiguracionPage() {
  const { organizationId, role } = await requireOrgContext();
  const isAdmin = isOrganizationAdmin(role);
  const allowWrite = canMutate(role);
  await dbEnsureDefaultDemoClientIfEmpty(organizationId);
  const companies = await dbCompaniesFindManyByRazon(organizationId, "asc");
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const secret = process.env.DIGID_WEBHOOK_SECRET?.trim();
  const webhookPreview = secret
    ? `${base}/api/webhooks/digid?secret=${encodeURIComponent(secret)}`
    : `${base}/api/webhooks/digid`;
  const webhookDebugUi = showWebhookEventsDebug();
  const digid = getDigidConnectionSummary();
  const quickMailDisabled = isPanelReadOnlyRole(role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Webhook de eventos del proveedor y URL pública de la app. Para túnel en local ver{" "}
          <code className="text-xs">docs/runbook-fallos.md</code> en el repositorio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">Sistema · proveedor DIGID</CardTitle>
            {digid.digidMocked ? (
              <Badge variant="secondary">Simulación (mock)</Badge>
            ) : (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                API DIGID
              </Badge>
            )}
            {digid.dataStoreMemory ? (
              <Badge variant="outline">Datos en memoria</Badge>
            ) : (
              <Badge variant="outline">PostgreSQL</Badge>
            )}
          </div>
          <CardDescription className="text-pretty">
            Para usar <span className="font-medium text-foreground">DIGID real</span> (sandbox o prod): Postgres activo,{" "}
            <code className="rounded bg-muted px-1 text-xs">DIGID_MOCK=0</code> (o no uses solo memoria), y las variables{" "}
            <code className="rounded bg-muted px-1 text-xs">DIGID_*</code> completas. Referencia en el repo:{" "}
            <code className="text-xs">docs/api-digid.md</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {digid.digidMockEnv != null ? (
            <p className="text-muted-foreground">
              Variable <code className="rounded bg-muted px-1 text-xs">DIGID_MOCK</code> en .env:{" "}
              <span className="font-mono text-foreground">{digid.digidMockEnv}</span>
            </p>
          ) : null}
          {!digid.digidMocked && digid.missingDigidKeys.length > 0 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
              Faltan variables para llamar a la API:{" "}
              <span className="font-mono text-xs">{digid.missingDigidKeys.join(", ")}</span>
            </p>
          ) : null}
          {digid.readyForRealDigid ? (
            <p className="text-muted-foreground">
              Credenciales DIGID presentes y modo mock desactivado: el panel usará el proveedor remoto en altas, documentos y
              envíos.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sistema · prueba rápida de correo al firmante</CardTitle>
          <CardDescription>
            Solo nombre y correo: envía el mismo tipo de mensaje que en un envío a firma (enlace de prueba local). Útil para
            validar Resend/SMTP sin crear documento ni marcar PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quickMailDisabled ? (
            <p className="text-sm text-muted-foreground">
              Tu perfil es solo lectura; pide a un administrador u operador que envíe la prueba.
            </p>
          ) : (
            <QuickSignerMailTest />
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Facturación (SaaS)</CardTitle>
          <CardDescription>
            Stub post-MVP: planes, Stripe y portal de cliente aún no están conectados. El panel funciona sin
            cobro integrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cuando definas precios, añade modelo <code className="text-xs">Subscription</code> y proveedor de
            pago; hasta entonces puedes operar en modo invitación manual.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipo y API</CardTitle>
          <CardDescription>
            Usuarios del panel, invitaciones y claves para automatización (<code className="text-xs">/api/v1</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/configuracion/equipo">Equipo</Link>
          </Button>
          {isAdmin ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/configuracion/folios">Folios del equipo</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/configuracion/api-keys">API keys</Link>
              </Button>
            </>
          ) : (
            <span className="self-center text-xs text-muted-foreground">Solo administradores gestionan API keys.</span>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card p-4 text-sm">
        <p className="font-medium">URL que se registrará</p>
        <code className="mt-2 block break-all text-xs text-muted-foreground">{webhookPreview}</code>
        <p className="mt-2 text-muted-foreground">
          Define <code className="text-xs">NEXT_PUBLIC_APP_URL</code> y el secreto del webhook del proveedor en{" "}
          <code className="text-xs">.env</code> (ver <code className="text-xs">.env.example</code>).
        </p>
      </div>
      <ConfigWebhookForm
        canMutate={allowWrite}
        companies={companies.map((c) => ({ id: c.id, razonSocial: c.razonSocial }))}
      />

      {webhookDebugUi ? (
        <Card>
          <CardHeader>
            <CardTitle>Últimos webhooks recibidos</CardTitle>
            <CardDescription>
              Depuración: tabla <code className="text-xs">WebhookEvent</code>. Idempotencia: mismo cuerpo y
              misma cabecera de entrega / <code className="text-xs">X-Request-Id</code> (si el proveedor las
              envía) en ventana de 7 días → <code className="text-xs">duplicate: true</code> sin nuevo registro.
              En producción esta tabla está oculta salvo{" "}
              <code className="text-xs">JUXA_WEBHOOK_DEBUG_UI=1</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookEventsTable organizationId={organizationId} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          La tabla de eventos webhook está oculta en producción. Para depurar, define{" "}
          <code className="text-xs">JUXA_WEBHOOK_DEBUG_UI=1</code> en el servidor.
        </p>
      )}
    </div>
  );
}
