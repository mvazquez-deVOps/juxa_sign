import Link from "next/link";
import { dbCompaniesFindManyByRazon, dbEnsureDefaultDemoClientIfEmpty } from "@/lib/data/repository";
import { isSuperadminSigningLabEnabled } from "@/lib/superadmin-signing-lab";
import { resolveSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SuperadminPruebaEnvioFirmaClient } from "./prueba-envio-firma-client";

export const dynamic = "force-dynamic";

export default async function SuperadminPruebaEnvioFirmaPage() {
  const session = await resolveSession();
  const orgId = session?.user?.organizationId;
  const lab = isSuperadminSigningLabEnabled();

  if (!orgId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laboratorio de envío</CardTitle>
          <CardDescription>Inicia sesión en el panel con una cuenta que tenga organización.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  await dbEnsureDefaultDemoClientIfEmpty(orgId);
  const companies = await dbCompaniesFindManyByRazon(orgId, "asc");
  const rows = companies.map((c) => ({ id: c.id, razonSocial: c.razonSocial }));

  if (!lab) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laboratorio de envío a firma</CardTitle>
          <CardDescription>
            En producción esta pantalla está desactivada. Para habilitarla de forma excepcional define{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">JUXA_SUPERADMIN_SIGNING_LAB=1</code> en el servidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/superadmin" className="text-sm text-primary underline-offset-4 hover:underline">
            Volver al resumen
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prueba local: PDF, correo y envío a firma</CardTitle>
          <CardDescription className="text-pretty">
            Flujo reducido para <span className="font-medium text-foreground">superadmin</span>: subes un PDF, indicas un
            solo firmante con correo (sin teléfono) y se crea el documento, se coloca una marca por defecto en la página 1
            y se ejecuta el mismo envío a firma que en el panel. Requiere{" "}
            <span className="font-medium text-foreground">credenciales DIGID</span> en{" "}
            <code className="rounded bg-muted px-1 text-xs">.env</code> y correo transaccional (Resend/SMTP) si lo
            tienes. Alinea{" "}
            <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_APP_URL</code> o{" "}
            <code className="rounded bg-muted px-1 text-xs">JUXA_LOCAL_SIGNING_BASE_URL</code> con tu{" "}
            <code className="rounded bg-muted px-1 text-xs">npm run dev</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SuperadminPruebaEnvioFirmaClient companies={rows} />
          <p className="text-sm text-muted-foreground">
            Operación sobre <span className="font-medium text-foreground">tu organización en sesión</span> (la misma que al
            volver al panel). Si no hay clientes, se intentó crear el de demostración; si sigue vacío, da de alta uno en{" "}
            <Link href="/empresas/nueva" className="text-primary underline-offset-4 hover:underline">
              Nuevo cliente
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
