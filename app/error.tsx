"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Error inesperado al cargar esta pantalla."}
      </p>
      <Button type="button" onClick={() => reset()}>
        Reintentar
      </Button>
    </div>
  );
}
