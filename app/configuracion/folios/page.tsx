import Link from "next/link";
import { dbFolioLedgerSuperadmin, dbOrgUsersList } from "@/lib/data/repository";
import { requireAdminContext } from "@/lib/org-scope";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolioOrgGrantForm } from "./folio-org-client";

export const dynamic = "force-dynamic";

const reasonLabels: Record<string, string> = {
  SUPERADMIN_GRANT: "Acreditación plataforma",
  PURCHASE: "Compra",
  SEND_STANDARD: "Envío estándar",
  SEND_PREMIUM: "Envío premium",
  ADMIN_TRANSFER: "Transferencia (admin org)",
  ADJUSTMENT: "Ajuste",
  TRIAL_GRANT: "Folio de bienvenida",
  KYC_VALIDATION: "Validación KYC",
};

export default async function ConfiguracionFoliosPage() {
  const { organizationId } = await requireAdminContext();
  const [users, ledger] = await Promise.all([
    dbOrgUsersList(organizationId),
    dbFolioLedgerSuperadmin({ organizationId }, 150),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Folios del equipo</h1>
          <p className="text-muted-foreground">
            Acredita créditos a usuarios de tu organización y revisa movimientos recientes.
          </p>
        </div>
        <Link href="/configuracion" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Configuración
        </Link>
      </div>

      <FolioOrgGrantForm
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          folioBalance: u.folioBalance,
        }))}
      />

      <div className="rounded-lg border">
        <h2 className="border-b px-4 py-3 text-lg font-medium">Movimientos recientes (organización)</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Δ</TableHead>
              <TableHead className="text-right">Saldo después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sin movimientos.
                </TableCell>
              </TableRow>
            ) : (
              ledger.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {row.createdAt.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {"user" in row && row.user && "email" in row.user ? row.user.email : "—"}
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
    </div>
  );
}
