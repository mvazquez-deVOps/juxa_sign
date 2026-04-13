import {
  dbFolioLedgerSuperadmin,
  dbFolioPacksListAll,
  dbSuperAdminUsersSearch,
} from "@/lib/data/repository";
import Link from "next/link";
import {
  FolioSuperadminGrantForm,
  FolioSuperadminPackForm,
  FolioPackRowActions,
} from "./folio-superadmin-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolioEconomicsSuperadminSection } from "@/components/folio-economics-superadmin-section";

export const dynamic = "force-dynamic";

const reasonLabels: Record<string, string> = {
  SUPERADMIN_GRANT: "Acreditación plataforma",
  PURCHASE: "Compra",
  SEND_STANDARD: "Envío estándar",
  SEND_PREMIUM: "Envío premium",
  ADMIN_TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
  TRIAL_GRANT: "Regalo de prueba (alta org.)",
};

function priceStr(v: unknown) {
  if (v != null && typeof v === "object" && "toString" in v) return (v as { toString: () => string }).toString();
  return String(v);
}

function packPriceNumber(priceMxn: unknown): number {
  const raw =
    typeof priceMxn === "object" && priceMxn != null && "toString" in priceMxn
      ? (priceMxn as { toString: () => string }).toString()
      : String(priceMxn);
  return Number(raw);
}

export default async function SuperadminFoliosPage() {
  const users = await dbSuperAdminUsersSearch("", 100);
  const ledger = await dbFolioLedgerSuperadmin({}, 150);
  const packs = await dbFolioPacksListAll();
  const packEconomicsRows = packs.map((p) => ({
    name: p.name,
    folioAmount: p.folioAmount,
    priceMxn: packPriceNumber(p.priceMxn),
  }));

  return (
    <div className="space-y-10">
      <FolioEconomicsSuperadminSection packs={packEconomicsRows} />

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Folios y catálogo</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          El saldo operativo de cada usuario vive en <code className="text-xs">folioBalance</code>; cada movimiento queda
          auditado en <code className="text-xs">FolioLedgerEntry</code> (motivos como acreditación plataforma, envío estándar o
          premium, transferencias entre miembros, etc.). Desde aquí puedes acreditar créditos, revisar el ledger global y
          definir paquetes que el panel muestra en{" "}
          <Link href="/folios/planes" className="font-medium text-primary underline">
            Planes
          </Link>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          El listado de organizaciones y contexto por tenant está en{" "}
          <Link href="/superadmin/organizaciones" className="text-primary underline">
            Organizaciones
          </Link>
          .
        </p>
      </div>

      <FolioSuperadminGrantForm users={users} />

      <div className="rounded-lg border">
        <h2 className="border-b px-4 py-3 text-lg font-medium">Ledger reciente</h2>
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

      <FolioSuperadminPackForm />

      <div className="rounded-lg border">
        <h2 className="border-b px-4 py-3 text-lg font-medium">Paquetes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Folios</TableHead>
              <TableHead className="text-right">MXN</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {packs.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-right tabular-nums">{p.folioAmount}</TableCell>
                <TableCell className="text-right tabular-nums">{priceStr(p.priceMxn)}</TableCell>
                <TableCell>{p.active ? "Activo" : "Inactivo"}</TableCell>
                <TableCell className="text-right">
                  <FolioPackRowActions id={p.id} active={p.active} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
