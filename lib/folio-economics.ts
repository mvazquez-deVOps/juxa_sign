/**
 * Referencia de costos y precios objetivo para folios (MXN).
 * Ajustar aquí cuando cambien costos DIGID / KYC; no se infiere del runtime.
 */
export const FOLIO_ECONOMICS = {
  /** Costo aproximado por envío / folio en flujo estándar sin KYC */
  cogsMxnSinKyc: 45,
  /** Costo aproximado cuando aplica verificación de identidad (KYC) */
  cogsMxnConKyc: 65,
  /** Banda orientativa de precio al público por folio (sin KYC), en paquetes o suscripción */
  targetRetailPerFolioMxn: { min: 40, max: 50 },
} as const;

export type FolioProductKind = "sin_kyc" | "con_kyc";

export function cogsPerFolio(kind: FolioProductKind): number {
  return kind === "con_kyc" ? FOLIO_ECONOMICS.cogsMxnConKyc : FOLIO_ECONOMICS.cogsMxnSinKyc;
}

export type PackEconomics = {
  unitCogs: number;
  totalCogs: number;
  marginMxn: number;
  marginPct: number;
  effectivePerFolio: number;
  /** Solo aplica a sin_kYC: si el precio efectivo cae en la banda 40–50 */
  inBuyerTargetBand: boolean | null;
  profitable: boolean;
};

export function computePackEconomics(input: {
  priceMxn: number;
  folioCount: number;
  kind: FolioProductKind;
}): PackEconomics {
  const { priceMxn, folioCount, kind } = input;
  const unitCogs = cogsPerFolio(kind);
  const totalCogs = unitCogs * folioCount;
  const marginMxn = priceMxn - totalCogs;
  const marginPct = priceMxn > 0 ? (marginMxn / priceMxn) * 100 : 0;
  const effectivePerFolio = folioCount > 0 ? priceMxn / folioCount : 0;
  const inBuyerTargetBand =
    kind === "sin_kyc"
      ? effectivePerFolio >= FOLIO_ECONOMICS.targetRetailPerFolioMxn.min &&
        effectivePerFolio <= FOLIO_ECONOMICS.targetRetailPerFolioMxn.max
      : null;
  return {
    unitCogs,
    totalCogs,
    marginMxn,
    marginPct,
    effectivePerFolio,
    inBuyerTargetBand,
    profitable: marginMxn >= 0,
  };
}

/** Folios máximos que puedes otorgar sin pérdida (ingreso ÷ costo unitario, piso). */
export function predictBreakEvenFolioCount(revenueMxn: number, kind: FolioProductKind): number {
  const c = cogsPerFolio(kind);
  if (c <= 0) return 0;
  return Math.floor(revenueMxn / c);
}

/** Folios que “cabrían” si vendieras cada uno a `retailPerFolio` (referencia comercial). */
export function predictFolioCountAtRetail(revenueMxn: number, retailPerFolio: number): number {
  if (retailPerFolio <= 0) return 0;
  return Math.floor(revenueMxn / retailPerFolio);
}

export type ReferenceSubscriptionPlan = {
  id: string;
  name: string;
  description?: string;
  priceMxn: number;
  folioCount: number;
  kind: FolioProductKind;
  billingPeriod: "monthly" | "annual";
};

/** Ejemplos editoriales de suscripción (no sustituyen el catálogo FolioPack). */
export const REFERENCE_SUBSCRIPTION_PLANS: ReferenceSubscriptionPlan[] = [
  {
    id: "starter-mes",
    name: "Suscripción mensual — Intro",
    description: "Lo más común: firmas en flujo estándar sin KYC.",
    priceMxn: 299,
    folioCount: 3,
    kind: "sin_kyc",
    billingPeriod: "monthly",
  },
  {
    id: "equipo-mes",
    name: "Suscripción mensual — Equipo",
    description: "Más volumen con precio por folio dentro de la banda objetivo.",
    priceMxn: 449,
    folioCount: 9,
    kind: "sin_kyc",
    billingPeriod: "monthly",
  },
  {
    id: "identidad-mes",
    name: "Suscripción con identidad (referencia)",
    description: "Incluye escenarios con verificación de identidad (costo unitario mayor).",
    priceMxn: 399,
    folioCount: 5,
    kind: "con_kyc",
    billingPeriod: "monthly",
  },
];

/** Ingresos de ejemplo para tabla predictiva (superadmin). */
export const REFERENCE_MONTHLY_REVENUES_MXN = [199, 299, 399, 499, 990] as const;

export function formatMxn(n: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
