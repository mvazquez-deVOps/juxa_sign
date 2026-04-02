"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshDocumentStatus } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DocumentPageHeaderActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await refreshDocumentStatus(documentId);
          if (r.ok) {
            toast.success("Estado sincronizado con DIGID");
            router.refresh();
          } else toast.error(r.message ?? "No se pudo sincronizar");
        })
      }
    >
      {pending ? "Sincronizando…" : "Actualizar estado DIGID"}
    </Button>
  );
}
