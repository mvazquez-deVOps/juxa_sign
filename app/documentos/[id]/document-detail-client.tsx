"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  addPlacement,
  clearPlacements,
  removePlacement,
  syncDocumentSignatoriesFromPlacements,
  updatePlacementGeometry,
} from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { PdfPickPayload, PdfPlacementVisual } from "@/types/pdf-sign";

const PdfSignViewer = dynamic(() => import("@/components/pdf-sign-viewer"), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse rounded-lg bg-muted" />,
});

const storageKey = (documentId: string) => `juxa_sign_doc_panel_selected:${documentId}`;

function readStoredSelection(documentId: string, allIds: string[]): Set<string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(documentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const filtered = parsed.filter((id): id is string => typeof id === "string" && allIds.includes(id));
    if (filtered.length === 0) return null;
    return new Set(filtered);
  } catch {
    return null;
  }
}

export function DocumentDetailClient({
  canMutate: allowWrite,
  documentId,
  companyId,
  companyRazonSocial,
  fileUrl,
  signatories,
  placements,
}: {
  canMutate: boolean;
  documentId: string;
  companyId: string;
  companyRazonSocial: string;
  fileUrl: string | null;
  signatories: { id: string; name: string; digidId: number }[];
  placements: PdfPlacementVisual[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncPending, startSync] = useTransition();

  const signatoryIdsKey = useMemo(() => signatories.map((s) => s.id).sort().join(","), [signatories]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(signatories.map((s) => s.id)));

  useEffect(() => {
    const allIds = signatories.map((s) => s.id);
    const stored = readStoredSelection(documentId, allIds);
    setSelectedIds(stored ?? new Set(allIds));
  }, [documentId, signatoryIdsKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(storageKey(documentId), JSON.stringify([...selectedIds]));
  }, [documentId, selectedIds]);

  const includedSignatories = useMemo(
    () => signatories.filter((s) => selectedIds.has(s.id)),
    [signatories, selectedIds],
  );

  const [signatoryId, setSignatoryId] = useState(signatories[0]?.id ?? "");

  useEffect(() => {
    setSignatoryId((prev) => {
      const pool = includedSignatories.map((s) => s.id);
      if (pool.length === 0) return "";
      if (prev && pool.includes(prev)) return prev;
      return pool[0]!;
    });
  }, [includedSignatories]);

  const activeSignatoryLabel = useMemo(() => {
    const s = signatories.find((x) => x.id === signatoryId);
    return s?.name ?? "";
  }, [signatories, signatoryId]);

  const placementSignatoryIds = useMemo(() => new Set(placements.map((p) => p.signatoryId)), [placements]);

  /** Marcas en el PDF cuyo firmante está desmarcado en el panel. */
  const orphanPlacementNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of placements) {
      if (!selectedIds.has(p.signatoryId)) names.set(p.signatoryId, p.signatoryName);
    }
    return [...names.values()];
  }, [placements, selectedIds]);

  /** Firmantes marcados que aún no tienen ninguna marca. */
  const missingPlacementNames = useMemo(() => {
    return includedSignatories
      .filter((s) => !placementSignatoryIds.has(s.id))
      .map((s) => s.name);
  }, [includedSignatories, placementSignatoryIds]);

  const panelReady =
    includedSignatories.length > 0 &&
    missingPlacementNames.length === 0 &&
    orphanPlacementNames.length === 0;

  const setIncluded = useCallback(
    (id: string, nextChecked: boolean) => {
      if (!allowWrite) return;
      if (nextChecked) {
        setSelectedIds((prev) => new Set(prev).add(id));
        return;
      }
      if (placements.some((p) => p.signatoryId === id)) {
        toast.error("Quita antes las marcas de este firmante en el PDF para poder desmarcarlo.");
        return;
      }
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        if (n.size === 0) {
          toast.error("Debe quedar al menos un firmante marcado.");
          return prev;
        }
        return n;
      });
    },
    [allowWrite, placements],
  );

  const onPick = (p: PdfPickPayload) => {
    if (!allowWrite) {
      toast.error(
        "Tu perfil es visor · potencial consumidor: no puedes colocar marcas aquí. Pide a un administrador rol operativo o de consumo de folios.",
      );
      return;
    }
    if (!signatoryId || !selectedIds.has(signatoryId)) {
      toast.error("Selecciona un firmante activo entre los marcados en el panel.");
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
      if (!res?.ok) {
        toast.error(res?.message ?? "No se pudo guardar la marca.");
        return;
      }
      toast.success("Marca agregada");
      router.refresh();
    });
  };

  const onRemovePlacement = (placementId: string) => {
    if (!allowWrite) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("documentId", documentId);
      fd.set("placementId", placementId);
      const res = await removePlacement(fd);
      if (!res?.ok) {
        toast.error(res?.message ?? "No se pudo eliminar la marca.");
        return;
      }
      toast.success("Marca eliminada");
      router.refresh();
    });
  };

  const onMovePlacement = (placementId: string, p: PdfPickPayload) => {
    if (!allowWrite) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("documentId", documentId);
      fd.set("placementId", placementId);
      fd.set("page", String(p.page));
      fd.set("x", String(p.x));
      fd.set("y", String(p.y));
      fd.set("widthPx", String(p.widthPx));
      fd.set("heightPx", String(p.heightPx));
      const res = await updatePlacementGeometry(fd);
      if (!res?.ok) {
        toast.error(res?.message ?? "No se pudo mover la marca.");
        return;
      }
      toast.success("Posición actualizada");
      router.refresh();
    });
  };

  const onSyncSignatories = () => {
    if (!allowWrite) return;
    if (!panelReady) {
      toast.error("Corrige las marcas o la selección antes de guardar la asignación.");
      return;
    }
    startSync(async () => {
      const res = await syncDocumentSignatoriesFromPlacements(documentId);
      if (!res?.ok) {
        toast.error(res?.message ?? "No se pudo actualizar la asignación.");
        return;
      }
      toast.success(res.message ?? "Asignación guardada.");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Visor PDF</CardTitle>
            <CardDescription>
              Selecciona los firmantes que participan en el panel derecho.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!fileUrl ? (
            <p className="text-muted-foreground">Este documento no tiene URL de archivo en el proveedor.</p>
          ) : (
            <PdfSignViewer
              fileUrl={fileUrl}
              readOnly={!allowWrite}
              placements={placements}
              activeSignatoryLabel={activeSignatoryLabel}
              onPick={onPick}
              onRemovePlacement={onRemovePlacement}
              onMovePlacement={onMovePlacement}
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firmantes de este documento</CardTitle>
            <CardDescription>
              Solo los marcados cuentan para marcas de firma obligatorias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {signatories.length === 0 ? (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-950 dark:text-amber-100">
                <p>
                  No hay firmantes registrados para <strong className="text-foreground">{companyRazonSocial}</strong>.
                </p>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/firmantes?companyId=${encodeURIComponent(companyId)}`}>Ir a Firmantes</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {signatories.map((s) => (
                  <li key={s.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`sig-${s.id}`}
                      checked={selectedIds.has(s.id)}
                      disabled={!allowWrite}
                      onCheckedChange={(v) => setIncluded(s.id, v === true)}
                      className="mt-1"
                    />
                    <label htmlFor={`sig-${s.id}`} className="cursor-pointer text-sm leading-snug">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground"> ({s.digidId})</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firmante activo</CardTitle>
            <CardDescription>Quién recibe la marca al hacer click.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Selección</Label>
            {signatories.length === 0 ? null : includedSignatories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Marca al menos un firmante en la lista superior.</p>
            ) : (
              <Select value={signatoryId || undefined} onValueChange={setSignatoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige firmante" />
                </SelectTrigger>
                <SelectContent>
                  {includedSignatories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.digidId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado y guardado</CardTitle>
            <CardDescription>
              Guarda la asignación al documento según las marcas actuales.  
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!allowWrite || syncPending || !panelReady}
                onClick={onSyncSignatories}
              >
                {syncPending ? "Guardando…" : "Guardar asignación"}
              </Button>
              {allowWrite && !panelReady ? (
                <Button type="button" variant="default" size="sm" disabled title="Completa las marcas para los firmantes marcados">
                  Continuar a enviar
                </Button>
              ) : (
                <Button type="button" variant="default" size="sm" asChild>
                  <Link href={`/documentos/${documentId}/enviar`}>Continuar a enviar</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Marcas ({placements.length})</CardTitle>
            <Button
              variant="destructive"
              size="sm"
              disabled={!allowWrite || pending || placements.length === 0}
              onClick={() =>
                startTransition(async () => {
                  const res = await clearPlacements(documentId);
                  if (!res?.ok) {
                    toast.error(res?.message ?? "No se pudieron borrar las marcas.");
                    return;
                  }
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
