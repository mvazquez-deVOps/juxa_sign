"use client";

import { useMemo, useState, useTransition } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { syncDocumentsStatusForIds } from "@/app/actions/document";
import { EnviosDataTable, type EnvioRow } from "@/components/tables/envios-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";

export function EnviosClient({
  data,
  canSync,
  showEnviarLink,
}: {
  data: EnvioRow[];
  canSync: boolean;
  showEnviarLink: boolean;
}) {
  const [q, setQ] = useState("");
  const [companyQ, setCompanyQ] = useState("");
  const [statusQ, setStatusQ] = useState("");
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const nc = companyQ.trim().toLowerCase();
    const ns = statusQ.trim().toLowerCase();
    return data.filter((r) => {
      if (nq && !r.nameDoc.toLowerCase().includes(nq)) return false;
      if (nc && !r.companyName.toLowerCase().includes(nc)) return false;
      if (ns) {
        const st = (r.status ?? "").toLowerCase();
        if (!st.includes(ns)) return false;
      }
      return true;
    });
  }, [data, q, companyQ, statusQ]);

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  function exportCsv() {
    const lines = ["id,nameDoc,companyName,idDocumentoRemoto,status,lastStatusSyncAt,updatedAt"];
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    for (const r of filtered) {
      lines.push(
        [
          esc(r.id),
          esc(r.nameDoc),
          esc(r.companyName),
          esc(String(r.digidDocumentId)),
          esc(r.status ?? ""),
          esc(r.lastStatusSyncAt ?? ""),
          esc(r.updatedAt),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `envios-juxa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV descargado");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:flex-row md:flex-wrap md:items-end">
        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="envios-q">Buscar documento</Label>
            <Input
              id="envios-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre del PDF…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="envios-co">Empresa</Label>
            <Input
              id="envios-co"
              value={companyQ}
              onChange={(e) => setCompanyQ(e.target.value)}
              placeholder="Razón social…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="envios-st">Estado (contiene)</Label>
            <Input
              id="envios-st"
              value={statusQ}
              onChange={(e) => setStatusQ(e.target.value)}
              placeholder="p. ej. firmado"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Exportar CSV ({filtered.length})
          </Button>
          {canSync ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending || selectedIds.length === 0}
              onClick={() =>
                start(async () => {
                  try {
                    const msg = await syncDocumentsStatusForIds(selectedIds);
                    toast.success(msg);
                    setSelection({});
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Error");
                  }
                })
              }
            >
              <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
              Sincronizar selección ({selectedIds.length})
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {data.length} documentos en tu organización.
      </p>
      <EnviosDataTable
        data={filtered}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        enableRowSelection={canSync}
        showEnviarLink={showEnviarLink}
      />
    </div>
  );
}
