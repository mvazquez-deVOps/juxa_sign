"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { syncDocumentsStatusBulk } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function EnviosSyncAllButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          try {
            const msg = await syncDocumentsStatusBulk();
            toast.success(msg);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al sincronizar");
          }
        })
      }
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Sincronizando…" : "Sincronizar estados (dInfoDocto)"}
    </Button>
  );
}
