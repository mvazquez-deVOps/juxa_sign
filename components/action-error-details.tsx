"use client";

/**
 * Mensaje completo de error de Server Actions / DIGID (texto largo en bloque colapsable).
 */
export function ActionErrorDetails({
  failed,
  message,
}: {
  failed: boolean;
  message?: string | null;
}) {
  if (!failed || !message?.trim()) return null;
  return (
    <details className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-destructive">Detalle del error (servidor / DIGID)</summary>
      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {message}
      </pre>
    </details>
  );
}
