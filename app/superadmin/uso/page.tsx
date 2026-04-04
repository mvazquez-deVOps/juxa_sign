import Link from "next/link";
import {
  dbSuperAdminFolioAggregatesSince,
  dbSuperAdminOrganizationsListForAdminTable,
  dbSuperAdminUsageOverview,
} from "@/lib/data/repository";
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
import { UsoExportClient } from "./uso-export-client";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("es-MX", { dateStyle: "medium" });
}

const REASON_LABEL: Record<string, string> = {
  SUPERADMIN_GRANT: "Regalo superadmin",
  PURCHASE: "Compra",
  SEND_STANDARD: "Envío estándar",
  SEND_PREMIUM: "Envío premium",
  ADMIN_TRANSFER: "Transferencia admin",
  ADJUSTMENT: "Ajuste",
  TRIAL_GRANT: "Regalo de prueba",
};

export default async function SuperadminUsoPage() {
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [overview, agg30, agg7, orgRows] = await Promise.all([
    dbSuperAdminUsageOverview(),
    dbSuperAdminFolioAggregatesSince(since30),
    dbSuperAdminFolioAggregatesSince(since7),
    dbSuperAdminOrganizationsListForAdminTable(),
  ]);

  const orgCsvRows = orgRows.map((o) => ({
    nombre: o.name,
    slug: o.slug,
    usuarios: String(o.userCount),
    empresas: String(o.companyCount),
    folios_saldo_suma: String(o.totalFolioBalance),
    prueba_hasta: o.trialEndsAt ? o.trialEndsAt.toISOString() : "",
    alta: o.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Uso y clientes</h2>
          <p className="text-sm text-muted-foreground">
            Indicadores para control interno y marketing (plataforma completa).
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/superadmin/organizaciones">Ir a organizaciones</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Organizaciones</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.organizationCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Total registradas</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Altas (30 días)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.organizationsCreatedLast30Days}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Nuevas organizaciones</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activas por envío (30 días)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.distinctOrgsWithSendsLast30Days}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Orgs con al menos un envío facturado</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Folios envío (30 días)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{overview.estimatedFoliosConsumedLast30Days}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Suma de débitos estándar + premium</CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Movimientos en libro mayor (últimos 7 días):{" "}
        <span className="font-medium text-foreground">{overview.folioLedgerLinesLast7Days}</span> líneas.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Folios por motivo (30 días)</CardTitle>
            <CardDescription>Agregado del libro de folios</CardDescription>
          </CardHeader>
          <CardContent className="rounded-md border p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right tabular-nums">Movimientos</TableHead>
                  <TableHead className="text-right tabular-nums">Σ delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agg30.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sin movimientos en el periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...agg30]
                    .sort((a, b) => b.entryCount - a.entryCount)
                    .map((row) => (
                      <TableRow key={row.reason}>
                        <TableCell>{REASON_LABEL[row.reason] ?? row.reason}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.entryCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.sumDelta}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Folios por motivo (7 días)</CardTitle>
            <CardDescription>Misma métrica en ventana corta</CardDescription>
          </CardHeader>
          <CardContent className="rounded-md border p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right tabular-nums">Movimientos</TableHead>
                  <TableHead className="text-right tabular-nums">Σ delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agg7.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sin movimientos en el periodo.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...agg7]
                    .sort((a, b) => b.entryCount - a.entryCount)
                    .map((row) => (
                      <TableRow key={row.reason}>
                        <TableCell>{REASON_LABEL[row.reason] ?? row.reason}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.entryCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.sumDelta}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Directorio de clientes</h3>
          <UsoExportClient rows={orgCsvRows} filename="juxa-organizaciones.csv" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead className="text-right tabular-nums">Usuarios</TableHead>
                <TableHead className="text-right tabular-nums">Empresas</TableHead>
                <TableHead className="text-right tabular-nums">Σ folios</TableHead>
                <TableHead>Prueba hasta</TableHead>
                <TableHead>Alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay organizaciones.
                  </TableCell>
                </TableRow>
              ) : (
                orgRows.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <Link href={`/superadmin/organizaciones/${org.id}`} className="text-primary hover:underline">
                        {org.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{org.slug}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{org.userCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.companyCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{org.totalFolioBalance}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(org.trialEndsAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
