import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigWebhookForm } from "./webhook-form";
import { WebhookEventsTable } from "./webhook-events-table";

export default async function ConfiguracionPage() {
  const companies = await prisma.company.findMany({ orderBy: { razonSocial: "asc" } });
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const secret = process.env.DIGID_WEBHOOK_SECRET?.trim();
  const webhookPreview = secret
    ? `${base}/api/webhooks/digid?secret=${encodeURIComponent(secret)}`
    : `${base}/api/webhooks/digid`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Webhook DIGID (API 16) y URL pública de la app. Para túnel en local ver{" "}
          <code className="text-xs">docs/runbook-fallos.md</code> en el repositorio.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-sm">
        <p className="font-medium">URL que se registrará</p>
        <code className="mt-2 block break-all text-xs text-muted-foreground">{webhookPreview}</code>
        <p className="mt-2 text-muted-foreground">
          Define <code className="text-xs">NEXT_PUBLIC_APP_URL</code> y opcionalmente{" "}
          <code className="text-xs">DIGID_WEBHOOK_SECRET</code> en <code className="text-xs">.env</code>.
        </p>
      </div>
      <ConfigWebhookForm
        companies={companies.map((c) => ({ id: c.id, razonSocial: c.razonSocial }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Últimos webhooks recibidos</CardTitle>
          <CardDescription>
            Depuración: payloads en <code className="text-xs">WebhookEvent</code>. El endpoint ignora
            reintentos con el mismo cuerpo dentro de 60 s (idempotencia básica). En producción restringe el
            acceso a esta pantalla.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookEventsTable />
        </CardContent>
      </Card>
    </div>
  );
}
