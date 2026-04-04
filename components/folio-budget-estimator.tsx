"use client";

import { useMemo, useState } from "react";
import {
  FOLIO_ECONOMICS,
  formatMxn,
  predictBreakEvenFolioCount,
  predictFolioCountAtRetail,
} from "@/lib/folio-economics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FolioBudgetEstimator() {
  const [raw, setRaw] = useState("299");

  const budget = useMemo(() => {
    const n = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [raw]);

  const sinKycBreakEven = predictBreakEvenFolioCount(budget, "sin_kyc");
  const conKycBreakEven = predictBreakEvenFolioCount(budget, "con_kyc");
  const at40 = predictFolioCountAtRetail(budget, FOLIO_ECONOMICS.targetRetailPerFolioMxn.min);
  const at50 = predictFolioCountAtRetail(budget, FOLIO_ECONOMICS.targetRetailPerFolioMxn.max);

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Simulador rápido (orientativo)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Con un ingreso mensual de referencia, cuántos folios “caben” según costo interno o según precio de lista por
          folio en la banda {formatMxn(FOLIO_ECONOMICS.targetRetailPerFolioMxn.min)}–
          {formatMxn(FOLIO_ECONOMICS.targetRetailPerFolioMxn.max)} (sin KYC).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="folio-budget">Ingreso mensual de ejemplo (MXN)</Label>
        <Input
          id="folio-budget"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="max-w-[200px] tabular-nums"
        />
      </div>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        <li className="rounded-md border border-border bg-background px-3 py-2">
          <span className="text-muted-foreground">Tope sin pérdida (sin KYC, costo ~{FOLIO_ECONOMICS.cogsMxnSinKyc}):</span>{" "}
          <span className="font-semibold tabular-nums">{sinKycBreakEven} folios</span>
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2">
          <span className="text-muted-foreground">Tope sin pérdida (con KYC, costo ~{FOLIO_ECONOMICS.cogsMxnConKyc}):</span>{" "}
          <span className="font-semibold tabular-nums">{conKycBreakEven} folios</span>
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2">
          <span className="text-muted-foreground">Si el cliente paga {formatMxn(40)} por folio (piso de banda):</span>{" "}
          <span className="font-semibold tabular-nums">{at40} folios</span>
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2">
          <span className="text-muted-foreground">Si el cliente paga {formatMxn(50)} por folio (techo de banda):</span>{" "}
          <span className="font-semibold tabular-nums">{at50} folios</span>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        El tope “sin pérdida” usa costos de referencia internos; la banda de {formatMxn(40)}–{formatMxn(50)} es el
        objetivo de precio por folio al público en paquetes comunes sin KYC.
      </p>
    </div>
  );
}
