import Link from "next/link";

/** Banner informativo para organizaciones con `trialEndsAt` (registro self-service). */
export function TrialBanner({ trialEndsAt, expired }: { trialEndsAt: Date; expired: boolean }) {
  const end = trialEndsAt.toLocaleDateString("es-MX", { dateStyle: "medium" });
  if (expired) {
    return (
      <div
        className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
        role="status"
      >
        Tu periodo de prueba terminó el {end}.{" "}
        <Link href="/folios/planes" className="font-medium text-amber-50 underline underline-offset-2">
          Ver planes de folios
        </Link>{" "}
        para seguir enviando.
      </div>
    );
  }
  return (
    <div
      className="mb-4 rounded-lg border border-sky-500/30 bg-sky-950/20 px-4 py-3 text-sm text-sky-100 dark:border-sky-500/25 dark:bg-sky-950/15"
      role="status"
    >
      Periodo de prueba activo hasta el {end}. Usa tus folios de bienvenida para probar envíos a firma.
    </div>
  );
}
