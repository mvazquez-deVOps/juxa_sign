"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPlacement, clearPlacements, refreshDocumentStatus } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { PdfPickPayload } from "@/components/pdf-sign-viewer";

const PdfSignViewer = dynamic(() => import("@/components/pdf-sign-viewer"), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse rounded-lg bg-muted" />,
});

export function DocumentDetailClient({
  documentId,
  fileUrl,
  signatories,
  placements,
}: {
  documentId: string;
  fileUrl: string | null;
  signatories: { id: string; name: string; digidId: number }[];
  placements: {
    id: string;
    page: number;
    x: number;
    y: number;
    widthPx: number;
    heightPx: number;
    signatoryName: string;
  }[];
}) {
  const router = useRouter();
  const [markMode, setMarkMode] = useState(false);
  const [signatoryId, setSignatoryId] = useState(signatories[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const onPick = (p: PdfPickPayload) => {
    if (!signatoryId) {
      toast.error("Selecciona un firmante.");
      return;
    }
    const fd = new FormData();
    fd.set("documentId", documentId);
    fd.set("signatoryId", signatoryId);
    fd.set("page", String(p.page));
    fd.set("x", String(p.x));
    fd.set("y", String(p.y));
    fd.set("widthPx", String(p.widthPx));
    fd.set("heightPx", String(p.heightPx));
    startTransition(async () => {
      const res = await addPlacement(fd);
      if (res.ok) {
        toast.success("Marca agregada");
        router.refresh();
      } else toast.error(res.message ?? "Error");
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Visor PDF</CardTitle>
            <CardDescription>
              Activa “Marcar firma”, elige firmante y haz clic donde va la firma. Usa{" "}
              <strong>zoom 100%</strong> en la barra del visor antes de marcar; si cambias el zoom, las coordenadas
              pueden desalinearse respecto a lo que espera DIGID.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={markMode ? "default" : "outline"} size="sm" onClick={() => setMarkMode((m) => !m)}>
              {markMode ? "Modo marcar: ON" : "Modo marcar: OFF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await refreshDocumentStatus(documentId);
                  toast.success("Estado actualizado");
                  router.refresh();
                })
              }
            >
              Sincronizar estado
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fileUrl ? (
            <div
              role="status"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
            >
              <strong>Importante:</strong> en la barra del visor, deja el zoom en{" "}
              <strong>100%</strong> antes de colocar marcas. Si cambias el zoom después, las
              coordenadas pueden no coincidir con lo que espera DIGID.
            </div>
          ) : null}
          {!fileUrl ? (
            <p className="text-muted-foreground">Este documento no tiene URL de archivo en DIGID.</p>
          ) : (
            <PdfSignViewer fileUrl={fileUrl} markMode={markMode} onPick={onPick} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firmante activo</CardTitle>
            <CardDescription>Quién recibe la marca al hacer clic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Selección</Label>
            <Select value={signatoryId} onValueChange={setSignatoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Firmante" />
              </SelectTrigger>
              <SelectContent>
                {signatories.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.digidId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Marcas ({placements.length})</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending || placements.length === 0}
              onClick={() =>
                startTransition(async () => {
                  await clearPlacements(documentId);
                  toast.success("Marcas borradas");
                  router.refresh();
                })
              }
            >
              Borrar todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {placements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin marcas aún.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {placements.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                    <Badge variant="secondary">p.{p.page}</Badge>
                    <span className="font-medium">{p.signatoryName}</span>
                    <span className="text-muted-foreground">
                      x:{p.x.toFixed(0)} y:{p.y.toFixed(0)} · {p.widthPx.toFixed(0)}×{p.heightPx.toFixed(0)} px
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
