"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X } from "lucide-react"; // Ícono de cierre profesional
import { Button } from "@/components/ui/button";

/** Banner informativo para organizaciones con `trialEndsAt` (registro self-service). */
export function TrialBanner({ trialEndsAt, expired }: { trialEndsAt: Date; expired: boolean }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  const end = trialEndsAt.toLocaleDateString("es-MX", { dateStyle: "medium" });
  if (expired) {
    return (
      <div
        className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100"
        role="status"
      >
        <div className="flex-1">
          Tu periodo de prueba terminó el {end}.{" "}
          <Link href="/folios/planes" className="font-medium text-amber-50 underline underline-offset-2">
            Ver planes de folios
          </Link>{" "}
          para seguir enviando.
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 shrink-0 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
          title="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  return (
    <div
      className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-sky-500/30 bg-sky-950/20 px-4 py-3 text-sm text-sky-100 dark:border-sky-500/25 dark:bg-sky-950/15"
      role="status"
    >
      <div className="flex-1">
        Periodo de prueba activo hasta el {end}. Usa tus folios de bienvenida para probar envíos a firma.
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="h-6 w-6 shrink-0 text-sky-200 hover:bg-sky-500/20 hover:text-sky-100"
        title="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
