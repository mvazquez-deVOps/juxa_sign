"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { runPanelBatchSend } from "@/app/actions/batch";
import type { BatchPickerRow } from "@/lib/data/repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BATCH = 25;

type JobRow = {
  id: string;
  status: string;
  createdAt: string;
  errorMessage: string | null;
  result: unknown;
};

function parseJobResults(
  result: unknown,
): { documentId: string; ok: boolean; message?: string }[] | null {
  if (!result || typeof result !== "object" || !("results" in result)) return null;
  const r = (result as { results: unknown }).results;
  if (!Array.isArray(r)) return null;
  return r.filter(
    (x): x is { documentId: string; ok: boolean; message?: string } =>
      !!x &&
      typeof x === "object" &&
      "documentId" in x &&
      typeof (x as { documentId: unknown }).documentId === "string",
  );
}

export function LotesClient({
  initialJobs,
  documents,
}: {
  initialJobs: JobRow[];
  documents: BatchPickerRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(() => new Set());
  const [pending, start] = useTransition();
  const router = useRouter();

  const companies = useMemo(() => {
    const s = new Set(documents.map((d) => d.companyName));
    return [...s].sort((a, b) => a.localeCompare(b, "es"));
  }, [documents]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cf = companyFilter.trim().toLowerCase();
    return documents.filter((d) => {
      if (onlyReady && !d.ready) return false;
      if (cf && d.companyName.toLowerCase() !== cf) return false;
      if (!q) return true;
      return (
        d.nameDoc.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.companyName.toLowerCase().includes(q)
      );
    });
  }, [documents, search, companyFilter, onlyReady]);

  function toggleId(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= MAX_BATCH) {
          toast.message(`Máximo ${MAX_BATCH} documentos por lote`);
          return prev;
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function selectVisibleReady() {
    const readyVisible = filteredDocs.filter((d) => d.ready).map((d) => d.id);
    setSelected(() => {
      const next = new Set<string>();
      for (const id of readyVisible) {
        if (next.size >= MAX_BATCH) break;
        next.add(id);
      }
      if (readyVisible.length > MAX_BATCH) {
        toast.message(`Solo se seleccionaron los primeros ${MAX_BATCH} listos para envío.`);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function runBatch(documentIds: string[]) {
    if (documentIds.length === 0) {
      toast.error("Selecciona al menos un documento.");
      return;
    }
    if (documentIds.length > MAX_BATCH) {
      toast.error(`Máximo ${MAX_BATCH} documentos.`);
      return;
    }
    start(async () => {
      const r = await runPanelBatchSend(documentIds);
      if (r.ok) toast.success(r.message ?? "Listo");
      else toast.error(r.message ?? "Error");
      if (r.results?.length) {
        const failed = r.results.filter((x) => !x.ok);
        if (failed.length) {
          toast.message(`${failed.length} documento(s) con error`, {
            description: failed.map((f) => `${f.documentId.slice(0, 8)}…: ${f.message ?? "?"}`).join("\n"),
          });
        }
      }
      clearSelection();
      router.refresh();
    });
  }

  function onRunFromPicker() {
    void runBatch([...selected]);
  }

  function toggleJobExpand(jobId: string) {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Elegir documentos</CardTitle>
            <CardDescription>
              Marca hasta {MAX_BATCH} expedientes listos para envío. Usa
              filtros para acotar la lista.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="lotes-search">Buscar</Label>
                <Input
                  id="lotes-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o empresa…"
                />
              </div>
              <div className="w-full space-y-2 sm:w-48">
                <Label htmlFor="lotes-company">Empresa</Label>
                <select
                  id="lotes-company"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="">Todas</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={onlyReady} onCheckedChange={(v) => setOnlyReady(v === true)} />
              Solo listos para envío
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={selectVisibleReady}>
                Seleccionar visibles listos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                Limpiar selección
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Seleccionados: {selected.size} / {MAX_BATCH}
            </p>
            <div className="max-h-[min(420px,50vh)] overflow-auto rounded-md border">
              {filteredDocs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No hay documentos que coincidan.</p>
              ) : (
                <ul className="divide-y">
                  {filteredDocs.map((d) => {
                    const isSel = selected.has(d.id);
                    return (
                      <li
                        key={d.id}
                        className={cn(
                          "flex items-start gap-3 p-3 text-sm",
                          !d.ready && "opacity-80",
                        )}
                      >
                        <Checkbox
                          className="mt-1"
                          checked={isSel}
                          disabled={!d.ready && !isSel}
                          onCheckedChange={(v) => toggleId(d.id, v === true)}
                          title={!d.ready ? d.readinessMessage : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{d.nameDoc}</span>
                            {d.ready ? (
                              <Badge variant="secondary" className="text-xs">
                                Listo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-600/50 text-xs text-amber-700 dark:text-amber-400">
                                Pendiente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{d.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            Marcas: {d.placementCount} · Firmantes asignados: {d.signatoryLinkCount}
                          </p>
                          {!d.ready && d.readinessMessage ? (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{d.readinessMessage}</p>
                          ) : null}
                          <Link
                            href={`/documentos/${d.id}`}
                            className="mt-1 inline-block text-xs text-primary underline-offset-2 hover:underline"
                          >
                            Abrir expediente
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <Button className="w-full" type="button" disabled={pending || selected.size === 0} onClick={() => void onRunFromPicker()}>
              {pending ? "Procesando…" : "Enviar Lote Seleccionado"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Envíos</CardTitle>
          <CardDescription>Resumen de envíos masivos procesados.</CardDescription>
        </CardHeader>
        <CardContent>
          {initialJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay lotes registrados.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {initialJobs.map((j) => {
                const rows = parseJobResults(j.result);
                const expanded = expandedJobs.has(j.id);
                return (
                  <li key={j.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          j.status === "DONE" ? "default" : j.status === "ERROR" ? "destructive" : "secondary"
                        }
                      >
                        {j.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(j.createdAt).toLocaleString("es-MX")}
                      </span>
                      {rows?.length ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleJobExpand(j.id)}
                        >
                          {expanded ? "Ocultar detalle" : `Detalle (${rows.length})`}
                        </Button>
                      ) : null}
                    </div>
                    {j.errorMessage ? <p className="mt-1 text-xs text-destructive">{j.errorMessage}</p> : null}
                    {rows?.length && !expanded ? (
                      <p className="mt-1 text-xs text-muted-foreground">{rows.length} documento(s) en el lote</p>
                    ) : null}
                    {expanded && rows?.length ? (
                      <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                        {rows.map((row) => (
                          <li key={row.documentId} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <Link
                              href={`/documentos/${row.documentId}`}
                              className="font-mono text-primary underline-offset-2 hover:underline"
                            >
                              {row.documentId.slice(0, 10)}…
                            </Link>
                            {row.ok ? (
                              <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                            ) : (
                              <span className="text-destructive">{row.message ?? "Error"}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}