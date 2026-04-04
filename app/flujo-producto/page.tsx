import Link from "next/link";
import { redirect } from "next/navigation";
import { InternalGuideComment } from "@/components/internal-guide-comment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FlujoProductoPage() {
  const session = await resolveSession();
  if (!session?.user?.organizationId || session.user.role == null) {
    redirect("/login?callbackUrl=/flujo-producto");
  }
  const role = session.user.role;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flujo de producto</h1>
          <p className="text-muted-foreground text-sm">
            Juxa Sign y DIGID: actores, orden de pantallas y qué datos viven en tu base frente al proveedor.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>

      <InternalGuideComment role={role} title="Contexto para equipo y PM">
        <p>
          Esta guía es la referencia viva del recorrido en producto. Los detalles de endpoints viven en{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/40">docs/map-acciones-api.md</code> y{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/40">docs/api-digid.md</code> en el repo;
          prioriza siempre <strong>api-digid.md</strong> frente a cambios del proveedor.
        </p>
      </InternalGuideComment>

      <Card>
        <CardHeader>
          <CardTitle>Actores</CardTitle>
          <CardDescription>Quién interviene en un envío típico.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Actor</TableHead>
                <TableHead>Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Operador del panel</TableCell>
                <TableCell className="text-muted-foreground">
                  Usuario de esta aplicación: da de alta clientes (empresas) y firmantes en DIGID, sube el PDF, coloca marcas,
                  asigna, envía y obtiene enlaces de firma.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Firmante DIGID</TableCell>
                <TableCell className="text-muted-foreground">
                  Persona que firma en el flujo web o móvil de DIGID (fuera de este repositorio), usando los enlaces que genera
                  el panel.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orden de pantallas (camino feliz)</CardTitle>
          <CardDescription>Secuencia recomendada desde el alta hasta las URLs de firma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <ol className="list-inside list-decimal space-y-3">
            <li>
              <span className="font-medium text-foreground">Clientes (empresas)</span> — Registro en DIGID (
              <code className="text-xs">RegistrarEmpresa</code>) → se guarda <code className="text-xs">digidIdClient</code> en
              PostgreSQL. En el panel: <Link href="/empresas" className="text-primary underline">Clientes</Link>.
            </li>
            <li>
              <span className="font-medium text-foreground">Firmantes</span> — Alta con token Bearer (
              <code className="text-xs">save_signatory</code>) → identificadores DIGID en Prisma por empresa.{" "}
              <Link href="/firmantes" className="text-primary underline">Firmantes</Link>.
            </li>
            <li>
              <span className="font-medium text-foreground">Documentos → Nuevo</span> — Subida (
              <code className="text-xs">create_doc</code>) → <code className="text-xs">digidDocumentId</code>, URL del documento y
              estado. <Link href="/documentos/nuevo" className="text-primary underline">Nuevo documento</Link>.
            </li>
            <li>
              <span className="font-medium text-foreground">Detalle del documento</span> — Visor PDF: marcas de firma en Prisma (
              <code className="text-xs">SignaturePlacement</code>).{" "}
              <strong className="text-foreground">Importante:</strong> coloca marcas con zoom 100&nbsp;% para alinear coordenadas;
              si algo falla, revisa <Link href="/ayuda" className="text-primary underline">Ayuda</Link> y el runbook en{" "}
              <code className="text-xs">docs/runbook-fallos.md</code> en el repo.
            </li>
            <li>
              <span className="font-medium text-foreground">Enviar</span> — Asignación (
              <code className="text-xs">add_assigned_doc</code>) con KYC opcional por firmante, envío (
              <code className="text-xs">send_doc</code>) y APIs legacy para URLs de firma.
            </li>
            <li>
              <span className="font-medium text-foreground">Opcional</span> — Constancia (<code className="text-xs">certify_doc</code>)
              desde la misma pantalla de envío; el webhook de DIGID actualiza el estado en segundo plano. Webhooks en{" "}
              <Link href="/configuracion" className="text-primary underline">Configuración</Link>.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del flujo (técnico)</CardTitle>
          <CardDescription>Equivalente al diagrama de integración; sin dependencias de gráficos en el cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-1.5">
            <li>Empresa en panel → Firmantes</li>
            <li>Firmantes → Documento PDF en DIGID</li>
            <li>Documento → Marcas en el visor</li>
            <li>Marcas → Asignar firmantes</li>
            <li>Asignación → <code className="text-xs">send_doc</code></li>
            <li>Envío → URLs de firma para cada firmante</li>
            <li>Webhook DIGID (paralelo) → actualiza estado del documento en tu base</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qué guarda Prisma vs qué vive en DIGID</CardTitle>
          <CardDescription>Origen de verdad local frente al proveedor.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>En Prisma</TableHead>
                <TableHead>Solo o principalmente en DIGID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Empresa (metadatos + <code className="text-xs">digidIdClient</code>)</TableCell>
                <TableCell className="text-muted-foreground">Validaciones y reglas del sandbox del proveedor</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Firmantes (mapeo a <code className="text-xs">digidSignatoryId</code>)</TableCell>
                <TableCell className="text-muted-foreground">Sesión y experiencia de firma del firmante</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Documento (nombre, IDs, <code className="text-xs">status</code> sincronizado)</TableCell>
                <TableCell className="text-muted-foreground">PDF almacenado y procesamiento</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <code className="text-xs">DocumentSignatory</code> (quién firma + <code className="text-xs">kyc</code> por
                  firmante)
                </TableCell>
                <TableCell className="text-muted-foreground">Asignación efectiva en DIGID</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Marcas (coordenadas por página)</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Certificados locales (si <code className="text-xs">certify_doc</code> devuelve PDF)</TableCell>
                <TableCell className="text-muted-foreground">Eventos intermedios del flujo de firma</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <code className="text-xs">WebhookEvent</code> (payload crudo, si se persiste)
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">
            Mapeo acciones ↔ API: <code className="text-xs">docs/map-acciones-api.md</code>. Contrato DIGID:{" "}
            <code className="text-xs">docs/api-digid.md</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planes, folios y límites</CardTitle>
          <CardDescription>Fuera del cobro automático por pasarela en el MVP actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Orientación comercial y precios sugeridos (MXN, Stripe futuro) en{" "}
            <code className="text-xs">docs/planes-y-facturacion.md</code>. El tope de usuarios por organización se configura en{" "}
            <Link href="/configuracion/equipo" className="text-primary underline">Configuración → Equipo</Link>.
          </p>
          <p>
            Cada envío exitoso a DIGID descuenta créditos de la cartera del usuario (<code className="text-xs">folioBalance</code>
            ): 1 folio envío estándar, 2 premium. El historial está en{" "}
            <Link href="/folios" className="text-primary underline">Mis folios</Link> (
            <code className="text-xs">FolioLedgerEntry</code>). Catálogo de paquetes:{" "}
            <Link href="/folios/planes" className="text-primary underline">Planes de folios</Link>.
          </p>
          <InternalGuideComment role={role} title="Acreditación plataforma">
            <p>
              La plataforma puede otorgar saldo y administrar paquetes globales en{" "}
              <Link href="/superadmin/folios" className="font-medium text-primary underline">
                /superadmin/folios
              </Link>
              . Los movimientos quedan reflejados en el ledger con motivos como{" "}
              <code className="text-xs">SUPERADMIN_GRANT</code>.
            </p>
          </InternalGuideComment>
        </CardContent>
      </Card>
    </div>
  );
}
