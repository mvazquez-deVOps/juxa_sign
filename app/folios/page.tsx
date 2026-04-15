import Link from "next/link";
import { PotentialConsumerCallout } from "@/components/potential-consumer-callout";
import { dbFolioLedgerForUser, dbUserFolioBalance } from "@/lib/data/repository";
import { isPanelReadOnlyRole } from "@/lib/roles";
import { requireOrgContext } from "@/lib/org-scope";
import { resolveSession } from "@/lib/session";
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

export const dynamic = "force-dynamic";

const reasonLabels: Record<string, string> = {
  SUPERADMIN_GRANT: "Acreditación plataforma",
  PURCHASE: "Compra",
  SEND_STANDARD: "Envío estándar",
  SEND_PREMIUM: "Envío premium",
  ADMIN_TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
};

export default async function FoliosPage() {
  const { role } = await requireOrgContext();
  const readOnly = isPanelReadOnlyRole(role);
  const session = await resolveSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const balance = await dbUserFolioBalance(userId);
  const ledger = await dbFolioLedgerForUser(userId, 50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis folios</h1>
        <p className="text-sm text-muted-foreground">
          Créditos por usuario: cada envío a firma consume 1 folio.
        </p>
      </div>

      <PotentialConsumerCallout variant="folios" />

      <Card>
        <CardHeader>
          <CardTitle>Saldo actual</CardTitle>
          <CardDescription>Créditos disponibles para envíos desde tu sesión.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <p className="text-4xl font-bold tabular-nums">{balance ?? 0}</p>
          <Button variant="outline" asChild>
            <Link href="/folios/planes">{readOnly ? "Explorar planes (catálogo)" : "Ver planes de compra"}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
          <CardDescription>Últimos 50 movimientos de tu cartera.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Cambio</TableHead>
                  <TableHead className="text-right">Saldo después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Sin movimientos aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">
                        {row.createdAt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell>{reasonLabels[row.reason] ?? row.reason}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {row.delta > 0 ? `+${row.delta}` : row.delta}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.balanceAfter}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
