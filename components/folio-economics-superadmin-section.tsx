import Link from "next/link";
import {
  FOLIO_ECONOMICS,
  REFERENCE_MONTHLY_REVENUES_MXN,
  REFERENCE_SUBSCRIPTION_PLANS,
  computePackEconomics,
  formatMxn,
  predictBreakEvenFolioCount,
  predictFolioCountAtRetail,
} from "@/lib/folio-economics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PackRow = { name: string; folioAmount: number; priceMxn: number };

function packPriceNumber(priceMxn: unknown): number {
  const raw =
    typeof priceMxn === "object" && priceMxn != null && "toString" in priceMxn
      ? (priceMxn as { toString: () => string }).toString()
      : String(priceMxn);
  return Number(raw);
}

export function FolioEconomicsSuperadminSection({ packs }: { packs: PackRow[] }) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base">Economía de folios (referencia interna)</CardTitle>
        <CardDescription>
          Costos orientativos y utilidad; editable en{" "}
          <code className="rounded bg-muted px-1 text-xs">lib/folio-economics.ts</code>. El catálogo{" "}
          <Link href="/folios/planes" className="text-primary underline-offset-4 hover:underline">
            Planes
          </Link>{" "}
          asume folios <span className="font-medium text-foreground">sin KYC</span> salvo que indiques otro criterio
          comercial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Costo sin KYC / folio</p>
            <p className="text-lg font-semibold tabular-nums">{formatMxn(FOLIO_ECONOMICS.cogsMxnSinKyc)}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">Costo con KYC / folio</p>
            <p className="text-lg font-semibold tabular-nums">{formatMxn(FOLIO_ECONOMICS.cogsMxnConKyc)}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Precio objetivo al público (sin KYC, por folio)</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatMxn(FOLIO_ECONOMICS.targetRetailPerFolioMxn.min)} –{" "}
              {formatMxn(FOLIO_ECONOMICS.targetRetailPerFolioMxn.max)}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Planes de suscripción (ejemplos)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right tabular-nums">Precio</TableHead>
                <TableHead className="text-right tabular-nums">Folios</TableHead>
                <TableHead className="text-right tabular-nums">$/folio</TableHead>
                <TableHead className="text-right tabular-nums">Costo total</TableHead>
                <TableHead className="text-right tabular-nums">Utilidad</TableHead>
                <TableHead className="text-center">Banda 40–50</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REFERENCE_SUBSCRIPTION_PLANS.map((plan) => {
                const e = computePackEconomics({
                  priceMxn: plan.priceMxn,
                  folioCount: plan.folioCount,
                  kind: plan.kind,
                });
                const band =
                  plan.kind === "sin_kyc"
                    ? e.inBuyerTargetBand
                      ? "Sí"
                      : "No"
                    : "—";
                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-medium">{plan.name}</div>
                      {plan.description ? (
                        <div className="text-xs text-muted-foreground">{plan.description}</div>
                      ) : null}
                      <div className="text-xs text-muted-foreground">
                        {plan.kind === "sin_kyc" ? "Sin KYC" : "Con KYC"} · mensual
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMxn(plan.priceMxn)}</TableCell>
                    <TableCell className="text-right tabular-nums">{plan.folioCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMxn(e.effectivePerFolio)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMxn(e.totalCogs)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${e.profitable ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                    >
                      {formatMxn(e.marginMxn)} ({e.marginPct.toFixed(0)}%)
                    </TableCell>
                    <TableCell className="text-center text-sm">{band}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Predictivo: ingreso mensual → folios posibles</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Cuántos folios podrías incluir según tope de equilibrio (costo) o según precio de lista en la banda objetivo
            (sin KYC).
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tabular-nums">Ingreso mensual</TableHead>
                <TableHead className="text-right tabular-nums">Máx. sin KYC (equilibrio)</TableHead>
                <TableHead className="text-right tabular-nums">Máx. con KYC (equilibrio)</TableHead>
                <TableHead className="text-right tabular-nums">A {formatMxn(40)}/folio</TableHead>
                <TableHead className="text-right tabular-nums">A {formatMxn(50)}/folio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {REFERENCE_MONTHLY_REVENUES_MXN.map((rev) => (
                <TableRow key={rev}>
                  <TableCell className="font-medium tabular-nums">{formatMxn(rev)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {predictBreakEvenFolioCount(rev, "sin_kyc")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {predictBreakEvenFolioCount(rev, "con_kyc")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {predictFolioCountAtRetail(rev, FOLIO_ECONOMICS.targetRetailPerFolioMxn.min)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {predictFolioCountAtRetail(rev, FOLIO_ECONOMICS.targetRetailPerFolioMxn.max)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Catálogo actual (asume sin KYC)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paquete</TableHead>
                <TableHead className="text-right tabular-nums">Folios</TableHead>
                <TableHead className="text-right tabular-nums">Precio</TableHead>
                <TableHead className="text-right tabular-nums">$/folio</TableHead>
                <TableHead className="text-right tabular-nums">Costo est.</TableHead>
                <TableHead className="text-right tabular-nums">Utilidad est.</TableHead>
                <TableHead className="text-center">Banda 40–50</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((p) => {
                const price = packPriceNumber(p.priceMxn);
                const e = computePackEconomics({
                  priceMxn: price,
                  folioCount: p.folioAmount,
                  kind: "sin_kyc",
                });
                return (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.folioAmount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMxn(price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMxn(e.effectivePerFolio)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMxn(e.totalCogs)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-medium ${e.profitable ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                    >
                      {formatMxn(e.marginMxn)}
                    </TableCell>
                    <TableCell className="text-center text-sm">{e.inBuyerTargetBand ? "Sí" : "No"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
