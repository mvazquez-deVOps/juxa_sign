import {
  FOLIO_ECONOMICS,
  REFERENCE_SUBSCRIPTION_PLANS,
  computePackEconomics,
  formatMxn,
} from "@/lib/folio-economics";
import { FolioBudgetEstimator } from "@/components/folio-budget-estimator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FolioPlanesEconomicsSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ejemplos de suscripción (referencia)</CardTitle>
          <CardDescription>
            Precios orientativos en pesos mexicanos. El cobro en la app se integrará después; usa estos ejemplos para
            alinear oferta comercial. Flujo <span className="font-medium text-foreground">sin KYC</span> es el más
            habitual; con verificación de identidad el costo interno sube (~{formatMxn(FOLIO_ECONOMICS.cogsMxnConKyc)} por
            folio en referencia vs ~{formatMxn(FOLIO_ECONOMICS.cogsMxnSinKyc)} sin KYC).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Objetivo de precio por folio al comprador en paquetes comunes (sin KYC): entre{" "}
            <span className="font-medium text-foreground">
              {formatMxn(FOLIO_ECONOMICS.targetRetailPerFolioMxn.min)} y{" "}
              {formatMxn(FOLIO_ECONOMICS.targetRetailPerFolioMxn.max)}
            </span>{" "}
            por crédito.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REFERENCE_SUBSCRIPTION_PLANS.map((plan) => {
              const e = computePackEconomics({
                priceMxn: plan.priceMxn,
                folioCount: plan.folioCount,
                kind: plan.kind,
              });
              const bandOk = plan.kind === "sin_kyc" && e.inBuyerTargetBand;
              return (
                <li
                  key={plan.id}
                  className="flex flex-col rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm"
                >
                  <span className="font-medium text-foreground">{plan.name}</span>
                  {plan.description ? (
                    <span className="mt-1 text-xs text-muted-foreground">{plan.description}</span>
                  ) : null}
                  <span className="mt-3 text-2xl font-bold tabular-nums">{formatMxn(plan.priceMxn)}</span>
                  <span className="text-muted-foreground">/ mes · {plan.folioCount} folios</span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    Precio efectivo:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatMxn(e.effectivePerFolio)}
                    </span>{" "}
                    por folio
                  </span>
                  {plan.kind === "sin_kyc" ? (
                    <span
                      className={`mt-1 text-xs font-medium ${bandOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                    >
                      {bandOk
                        ? "Dentro de la banda objetivo (40–50 MXN/folio)"
                        : "Por debajo o por encima de la banda 40–50 MXN/folio (sin KYC)"}
                    </span>
                  ) : (
                    <span className="mt-1 text-xs text-muted-foreground">Plan con costo unitario mayor (KYC)</span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <FolioBudgetEstimator />
    </div>
  );
}
