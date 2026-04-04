"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshDocumentStatus } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DocumentPageHeaderActions({
  documentId,
  canSync = true,
}: {
  documentId: string;
  /** Rol VIEWER: sin sincronización con el proveedor. */
  canSync?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!canSync) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await refreshDocumentStatus(documentId);
          if (r.ok) {
            toast.success("Estado sincronizado con el proveedor");
            router.refresh();
          } else toast.error(r.message ?? "No se pudo sincronizar");
        })
      }
    >
      {pending ? "Sincronizando…" : "Actualizar estado remoto"}
    </Button>
  );
}
