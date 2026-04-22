import Link from "next/link";
import { Fingerprint, WalletCards } from "lucide-react";
import { PotentialConsumerCallout } from "@/components/potential-consumer-callout";
import { dbFolioLedgerForUser, dbUserFolioAndKycBalances } from "@/lib/data/repository";
import { folioLedgerCarteraLabel, folioLedgerReasonLabel } from "@/lib/folio-ledger-labels";
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

export default async function FoliosPage() {
  const { role } = await requireOrgContext();
  const readOnly = isPanelReadOnlyRole(role);
  const session = await resolveSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [{ folioBalance, kycBalance }, ledger] = await Promise.all([
    dbUserFolioAndKycBalances(userId),
    dbFolioLedgerForUser(userId, 50),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis folios</h1>
        <p className="text-sm text-muted-foreground">
          Créditos de envío (folios) y créditos para activar verificación de identidad (KYC) en firmantes.
        </p>
      </div>

      <PotentialConsumerCallout variant="folios" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Saldo de folios</CardTitle>
              <CardDescription>Créditos disponibles para envíos a firma desde tu sesión.</CardDescription>
            </div>
            <WalletCards className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <p className="text-4xl font-bold tabular-nums">{folioBalance}</p>
            <Button variant="outline" asChild>
              <Link href="/folios/planes">{readOnly ? "Explorar planes (catálogo)" : "Ver planes de compra"}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Créditos de identidad (KYC)</CardTitle>
              <CardDescription>Validaciones disponibles para activar KYC al asignar firmantes.</CardDescription>
            </div>
            <Fingerprint className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums">{kycBalance}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
          <CardDescription>
            Últimos 50 movimientos. La columna Cartera indica si el saldo mostrado es de folios o de KYC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cartera</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Cambio</TableHead>
                  <TableHead className="text-right">Saldo después</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sin movimientos aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground">
                        {row.createdAt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{folioLedgerCarteraLabel(row.reason)}</TableCell>
                      <TableCell>{folioLedgerReasonLabel(row.reason)}</TableCell>
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
