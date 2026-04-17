"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { runSuperadminBatchSend } from "@/app/actions/batch";
import type { BatchPickerRow } from "@/lib/data/repository";
import type { UserRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const cuidRe = /^c[a-z0-9]{24,}$/i;
const MAX_BATCH = 25;

const ROLE_SORT: Partial<Record<UserRole, number>> = {
  ADMIN: 0,
  USER: 1,
  VIEWER: 2,
  SUPERADMIN: 3,
};

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

export function SuperadminLotesClient({
  organizations,
  selectedOrgId,
  documents,
  initialJobs,
  users,
}: {
  organizations: { id: string; name: string; slug: string }[];
  selectedOrgId: string | null;
  documents: BatchPickerRow[];
  initialJobs: JobRow[];
  users: { id: string; email: string; role: UserRole; folioBalance: number }[];
}) {
  const router = useRouter();
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ra = ROLE_SORT[a.role] ?? 99;
      const rb = ROLE_SORT[b.role] ?? 99;
      if (ra !== rb) return ra - rb;
      return b.folioBalance - a.folioBalance;
    });
  }, [users]);

  const [actingUserId, setActingUserId] = useState(() => sortedUsers[0]?.id ?? "");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(() => new Set());
  const [pending, start] = useTransition();

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

  function onOrgChange(orgId: string) {
    if (!orgId) {
      router.push("/superadmin/lotes");
    } else {
      router.push(`/superadmin/lotes?org=${encodeURIComponent(orgId)}`);
    }
  }

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

  function runBatch(documentIds: string[]) {
    if (!selectedOrgId) {
      toast.error("Selecciona una organización.");
      return;
    }
    if (!actingUserId) {
      toast.error("Selecciona el usuario cuya cartera se debitará.");
      return;
    }
    if (documentIds.length === 0) {
      toast.error("Selecciona documentos o pega ids válidos.");
      return;
    }
    start(async () => {
      const r = await runSuperadminBatchSend(selectedOrgId, actingUserId, documentIds);
      if (r.ok) toast.success(r.message ?? "Listo");
      else toast.error(r.message ?? "Error");
      setText("");
      setSelected(new Set());
      router.refresh();
    });
  }

  function mergeIds(uniq: string[]) {
    const fromPicker = [...selected];
    return [...new Set([...fromPicker, ...uniq])].slice(0, MAX_BATCH);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Organización y cartera</CardTitle>
            <CardDescription>
              Elige el tenant y el usuario del cual se descontarán los folios al enviar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sa-org">Organización</Label>
              <select
                id="sa-org"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedOrgId ?? ""}
                onChange={(e) => onOrgChange(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.slug})
                  </option>
                ))}
              </select>
            </div>
            {selectedOrgId ? (
              <div className="space-y-2">
                <Label htmlFor="sa-user">Usuario (cartera)</Label>
                <select
                  id="sa-user"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={actingUserId}
                  onChange={(e) => setActingUserId(e.target.value)}
                >
                  {sortedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} · {u.role} · {u.folioBalance} folios
                    </option>
                  ))}
                </select>
                {sortedUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Esta organización no tiene usuarios.</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedOrgId ? (
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Hasta {MAX_BATCH} por lote. Solo se debita si el envío aplica folios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="sa-search">Buscar</Label>
                  <Input
                    id="sa-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre, empresa o id…"
                  />
                </div>
                <div className="w-full space-y-2 sm:w-48">
                  <Label htmlFor="sa-company">Empresa</Label>
                  <select
                    id="sa-company"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                  Limpiar selección
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Seleccionados: {selected.size} / {MAX_BATCH}
              </p>
              <div className="max-h-[min(360px,45vh)] overflow-auto rounded-md border">
                {filteredDocs.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Sin documentos en esta organización.</p>
                ) : (
                  <ul className="divide-y">
                    {filteredDocs.map((d) => {
                      const isSel = selected.has(d.id);
                      return (
                        <li key={d.id} className={cn("flex items-start gap-3 p-3 text-sm", !d.ready && "opacity-80")}>
                          <Checkbox
                            className="mt-1"
                            checked={isSel}
                            disabled={!d.ready && !isSel}
                            onCheckedChange={(v) => toggleId(d.id, v === true)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{d.nameDoc}</span>
                              {d.ready ? (
                                <Badge variant="secondary" className="text-xs">
                                  Listo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Pendiente
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{d.companyName}</p>
                            {!d.ready && d.readinessMessage ? (
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{d.readinessMessage}</p>
                            ) : null}
                            <Link
                              href={`/documentos/${d.id}`}
                              className="mt-1 inline-block text-xs text-primary underline-offset-2 hover:underline"
                            >
                              Abrir
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <Button
                type="button"
                disabled={pending || selected.size === 0 || !actingUserId}
                onClick={() => runBatch([...selected])}
              >
                {pending ? "Procesando…" : "Ejecutar lote"}
              </Button>

              <div className="border-t pt-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Pegar ids (avanzado)
                </button>
                {showAdvanced ? (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                      className="font-mono text-sm"
                      placeholder="cuids…"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        const ids = text
                          .split(/[\s,]+/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .filter((id) => cuidRe.test(id));
                        runBatch(mergeIds([...new Set(ids)]));
                      }}
                    >
                      Ejecutar con ids pegados
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona una organización para cargar documentos y jobs.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial (organización seleccionada)</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedOrgId ? (
            <p className="text-sm text-muted-foreground">Elige una organización para ver sus jobs.</p>
          ) : initialJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin lotes en esta organización.</p>
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
                          onClick={() =>
                            setExpandedJobs((prev) => {
                              const next = new Set(prev);
                              if (next.has(j.id)) next.delete(j.id);
                              else next.add(j.id);
                              return next;
                            })
                          }
                        >
                          {expanded ? "Ocultar" : `Detalle (${rows.length})`}
                        </Button>
                      ) : null}
                    </div>
                    {j.errorMessage ? <p className="mt-1 text-xs text-destructive">{j.errorMessage}</p> : null}
                    {expanded && rows?.length ? (
                      <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                        {rows.map((row) => (
                          <li key={row.documentId}>
                            <Link href={`/documentos/${row.documentId}`} className="font-mono text-primary hover:underline">
                              {row.documentId.slice(0, 12)}…
                            </Link>{" "}
                            {row.ok ? (
                              <span className="text-emerald-600">OK</span>
                            ) : (
                              <span className="text-destructive">{row.message}</span>
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
