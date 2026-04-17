"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignSignatoriesToDocument,
  exportSignerUrlsCsv,
  getBulkSignerUrls,
  getLayoutSignerUrl,
  reenviarSigningInvite,
  sendDocumentForSigning,
  type SigningActionState,
} from "@/app/actions/signing";
import { certifyStoredDocument } from "@/app/actions/config";
import { reorderDocumentPlacements } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { folioCreditsForSend } from "@/lib/folio-cost";
import { Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { ActionErrorDetails } from "@/components/action-error-details";

const DEFAULT_SIGNER_EMAIL_TEMPLATE = `Hola {nombre},

Te compartimos tu enlace para firmar el documento:
{url}

Si tienes dudas, responde a este correo.`;

const initial: SigningActionState | null = null;

const STEPS = [
  { n: 1, title: "Documento", short: "Estado y requisitos" },
  { n: 2, title: "Firmantes", short: "Asignación y KYC" },
  { n: 3, title: "Marcas", short: "Orden de firma" },
  { n: 4, title: "Opciones", short: "Tipo y recordatorios" },
  { n: 5, title: "Revisar", short: "Confirmar envío" },
] as const;

/** #rrggbb en minúsculas; null si no coincide con #RRGGBB (6 hex). */
function parseHexColor(input: string): string | null {
  const t = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return null;
}

export function EnviarClient({
  canMutate: allowWrite,
  userFolioBalance,
  enforceFolioBalanceCheck,
  documentId,
  documentName,
  documentCompanyId,
  documentCompanyName,
  placementRows,
  signatories,
}: {
  canMutate: boolean;
  /** Saldo de la sesión que paga el envío (alineado con `sendDocumentForSigning`). */
  userFolioBalance: number;
  /** Si es false (demo / `JUXA_SKIP_FOLIO_DEBIT`), no se aplica la UX de saldo en cliente. */
  enforceFolioBalanceCheck: boolean;
  documentId: string;
  documentName: string;
  documentCompanyId: string;
  documentCompanyName: string;
  placementRows: {
    id: string;
    signatoryId: string;
    signatoryName: string;
    page: number;
    sortOrder: number;
  }[];
  signatories: {
    id: string;
    name: string;
    digidId: number;
    assigned: boolean;
    kyc: boolean;
    email: string | null;
    phone: string | null;
  }[];
}) {
  const placementsCount = placementRows.length;
  const [step, setStep] = useState(1);
  const [assignState, assignAction, assignPending] = useActionState(assignSignatoriesToDocument, initial);
  const [sendState, sendAction, sendPending] = useActionState(sendDocumentForSigning, initial);
  const [urls, setUrls] = useState<{ name: string; url: string; signatoryId: string }[]>([]);
  const [layoutUrl, setLayoutUrl] = useState<string | null>(null);
  const [pendingUrls, startUrls] = useTransition();
  const [certPending, startCert] = useTransition();
  const [reorderPending, startReorder] = useTransition();
  const [reenviarFor, setReenviarFor] = useState<string | null>(null);
  const [, startReenviar] = useTransition();
  const router = useRouter();
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_SIGNER_EMAIL_TEMPLATE);
  const [emailBulkDraft, setEmailBulkDraft] = useState("");

  const [sendTypeSign, setSendTypeSign] = useState<"1" | "2">("2");
  const [sendFolioPremium, setSendFolioPremium] = useState(false);
  const [sendColorSign, setSendColorSign] = useState("#000000");
  const [colorDraft, setColorDraft] = useState("#000000");
  const [sendRemider, setSendRemider] = useState<"1" | "2" | "3">("1");
  const [sendObserverEmail, setSendObserverEmail] = useState("");
  const [sendObserverName, setSendObserverName] = useState("");
  const [sendObserverPhone, setSendObserverPhone] = useState("");
  const [sendObserverAprove, setSendObserverAprove] = useState(false);

  const sendRemiderLabel = sendRemider === "1" ? "24 horas" : sendRemider === "2" ? "48 horas" : "72 horas";
  const sendTypeSignLabel = sendTypeSign === "2" ? "Autógrafa" : "Electrónica";

  const sendFolioCost = useMemo(() => folioCreditsForSend(sendFolioPremium), [sendFolioPremium]);
  const insufficientFoliosForSend =
    allowWrite && enforceFolioBalanceCheck && userFolioBalance < sendFolioCost;

  const placementKey = useMemo(
    () => placementRows.map((p) => `${p.id}:${p.sortOrder}`).join("|"),
    [placementRows],
  );

  const [orderedPlacementIds, setOrderedPlacementIds] = useState<string[]>(() =>
    [...placementRows].sort((a, b) => a.sortOrder - b.sortOrder || a.page - b.page).map((p) => p.id),
  );

  useEffect(() => {
    setOrderedPlacementIds(
      [...placementRows].sort((a, b) => a.sortOrder - b.sortOrder || a.page - b.page).map((p) => p.id),
    );
  }, [placementKey, placementRows]);

  useEffect(() => {
    if (assignState?.message) {
      if (assignState.ok) toast.success(assignState.message);
      else toast.error(assignState.message);
    }
  }, [assignState]);

  useEffect(() => {
    if (sendState?.message) {
      if (sendState.ok) {
        toast.success(sendState.message);
        setStep(5);
      } else toast.error(sendState.message);
    }
  }, [sendState]);

  const defaultSelected = signatories.filter((s) => s.assigned).map((s) => s.id);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected.length ? defaultSelected : signatories.map((s) => s.id)),
  );

  const [kycById, setKycById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(signatories.map((s) => [s.id, s.kyc])),
  );

  const kycServerSnapshot = signatories.map((s) => `${s.id}:${s.kyc ? 1 : 0}`).join("|");

  useEffect(() => {
    setKycById(Object.fromEntries(signatories.map((s) => [s.id, s.kyc])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependencia estable vía snapshot
  }, [kycServerSnapshot]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleKyc = (id: string) => {
    setKycById((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const assignmentSelectionKey = useMemo(() => {
    const ids = [...selected].sort();
    return ids.map((id) => `${id}:${kycById[id] ? 1 : 0}`).join(",");
  }, [selected, kycById]);

  const [syncedAssignmentKey, setSyncedAssignmentKey] = useState<string | null>(null);
  const assignmentKeyRef = useRef(assignmentSelectionKey);
  assignmentKeyRef.current = assignmentSelectionKey;

  useEffect(() => {
    if (assignState?.ok) {
      setSyncedAssignmentKey(assignmentKeyRef.current);
    }
  }, [assignState]);

  const step2SyncedWithDigid =
    !allowWrite ||
    (assignmentSelectionKey !== "" &&
      syncedAssignmentKey !== null &&
      syncedAssignmentKey === assignmentSelectionKey);

  const orderedLabels = orderedPlacementIds
    .map((id) => placementRows.find((p) => p.id === id))
    .filter(Boolean) as typeof placementRows;

  const validationMessage = (): string | null => {
    if (placementsCount === 0) return "Coloca al menos una marca de firma en el visor del documento.";
    if (selected.size === 0) return "Selecciona al menos un firmante asignado.";
    const selectedArr = [...selected];
    for (const sid of selectedArr) {
      const sig = signatories.find((s) => s.id === sid);
      if (sig && !sig.email?.trim() && !sig.phone?.trim()) {
        return `${sig.name} no tiene correo ni teléfono; el proveedor lo requiere.`;
      }
    }
    const placementSigIds = new Set(placementRows.map((p) => p.signatoryId));
    for (const pid of placementSigIds) {
      if (!selected.has(pid)) {
        return "Todas las marcas deben corresponder a firmantes seleccionados. Quita marcas huérfanas o asigna al firmante.";
      }
    }
    for (const sid of selectedArr) {
      if (!placementRows.some((p) => p.signatoryId === sid)) {
        const sig = signatories.find((s) => s.id === sid);
        return `Falta al menos una marca en el PDF para ${sig?.name ?? "un firmante"}.`;
      }
    }
    return null;
  };

  const ensureColorDraftCommitted = (): boolean => {
    const p = parseHexColor(colorDraft);
    if (p) {
      setSendColorSign(p);
      setColorDraft(p);
      return true;
    }
    toast.error("Color de firma inválido. Usa #RRGGBB (6 hexadecimales), p. ej. #000000.");
    return false;
  };

  const goNext = () => {
    if (step < 5) {
      if (step === 1 && validationMessage()) {
        toast.error(validationMessage()!);
        return;
      }
      if (step === 2 && validationMessage()) {
        toast.error(validationMessage()!);
        return;
      }
      if (step === 2 && allowWrite && !step2SyncedWithDigid) {
        toast.error("Sincroniza la asignación con DIGID antes de continuar.");
        return;
      }
      if (step === 3 && validationMessage()) {
        toast.error(validationMessage()!);
        return;
      }
      if (step === 4 && !ensureColorDraftCommitted()) return;
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const movePlacement = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= orderedPlacementIds.length) return;
    const next = [...orderedPlacementIds];
    const t = next[index]!;
    next[index] = next[j]!;
    next[j] = t;
    setOrderedPlacementIds(next);
    startReorder(async () => {
      const r = await reorderDocumentPlacements(documentId, next);
      if (r.ok) {
        toast.success(r.message ?? "Orden actualizado");
        router.refresh();
      } else toast.error(r.message ?? "No se pudo guardar el orden");
    });
  };

  return (
    <div className="space-y-6">
      {!allowWrite ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Esta vista es para quienes envían a firma (operador, consumidor de folios o administrador). Si tienes perfil{" "}
          <strong>visor · potencial consumidor</strong>, explora el panel y los planes; solicita a un administrador la
          activación para enviar cuando tu organización lo requiera.
        </p>
      ) : null}

      {signatories.length === 0 ? (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm dark:bg-amber-500/5">
          <p className="font-medium text-foreground">No hay firmantes para el cliente de este documento</p>
          <p className="mt-2 text-muted-foreground">
            «{documentCompanyName}» ya está registrado como cliente. Las personas que deben firmar se dan de alta en{" "}
            <Link href="/firmantes" className="text-primary underline-offset-4 hover:underline">
              Firmantes
            </Link>{" "}
            (no en Clientes). Cuando exista al menos un firmante con correo o teléfono, vuelve aquí para asignar y
            enviar.
          </p>
          <Button className="mt-3" size="sm" asChild>
            <Link href={`/firmantes?companyId=${encodeURIComponent(documentCompanyId)}`}>
              Ir a firmantes de este cliente
            </Link>
          </Button>
        </div>
      ) : null}

      <nav aria-label="Pasos de envío" className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => {
              if (allowWrite && s.n >= 3 && !step2SyncedWithDigid) {
                toast.error("Sincroniza la asignación con DIGID en el paso 2 antes de avanzar.");
                return;
              }
              if (step === 4 && s.n >= 5 && !ensureColorDraftCommitted()) return;
              setStep(s.n);
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              step === s.n
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
            )}
          >
            <span className="block text-xs text-muted-foreground">Paso {s.n}</span>
            {s.title}
            <span className="block text-[11px] font-normal opacity-80">{s.short}</span>
          </button>
        ))}
      </nav>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Documento y requisitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Nombre:</span>{" "}
                <span className="font-normal">{documentName}</span>
              </li>
              <li>
                <span className="font-medium text-foreground">Marcas en el visor:</span>{" "}
                <span className="font-normal">{placementsCount}</span>
                {placementsCount === 0 ? (
                  <span className="text-destructive"> — ve al visor y coloca al menos una.</span>
                ) : null}
              </li>
              <li>
                <span className="font-medium text-foreground">Firmantes asignados:</span>{" "}
                <span className="font-normal">{signatories.filter((s) => s.assigned).length}</span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/documentos/${documentId}`}>Regresar al visor PDF</Link>
              </Button>
            </div>
            {validationMessage() ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-amber-950 dark:text-amber-100">
                {validationMessage()}
              </p>
            ) : null}
            
            <Button type="button" onClick={goNext}>
              Siguiente: asignar firmantes
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Firmantes y KYC</CardTitle>
            <CardDescription>
              Confirma la asignación de firmantes y la verificación de identidad (KYC) antes de continuar. Pulsa
              &quot;Confirmar asignación&quot; para aplicar los cambios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={assignAction} className="space-y-4">
              <input type="hidden" name="documentId" value={documentId} />
              <input type="hidden" name="signatoryIds" value={Array.from(selected).join(",")} />
              <div className="space-y-2">
                {signatories.map((s) => {
                  const isSel = selected.has(s.id);
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                      <input type="hidden" name={`kyc_${s.id}`} value={kycById[s.id] ? "1" : "0"} />
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSel}
                          disabled={!allowWrite}
                          onChange={() => toggle(s.id)}
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="truncate font-medium">{s.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">Id. {s.digidId}</span>
                      </label>
                      <label
                        className={cn(
                          "flex shrink-0 cursor-pointer items-center gap-2 text-sm",
                          (!isSel || !allowWrite) && "cursor-not-allowed opacity-40",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!kycById[s.id]}
                          disabled={!isSel || !allowWrite}
                          onChange={() => toggleKyc(s.id)}
                          className="h-4 w-4"
                        />
                        <span>KYC</span>
                      </label>
                      <span className="w-full text-xs text-muted-foreground sm:w-auto">
                        {s.email || s.phone ? (
                          <>
                            {s.email ? s.email : null}
                            {s.email && s.phone ? " · " : null}
                            {s.phone ? s.phone : null}
                          </>
                        ) : (
                          <span className="text-destructive">Sin correo ni teléfono</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button type="submit" disabled={!allowWrite || assignPending || selected.size === 0}>
                {assignPending ? "Asignando…" : "Confirmar asignación"}
              </Button>
              <ActionErrorDetails
                failed={assignState != null && !assignState.ok}
                message={assignState?.message}
              />
            </form>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={goPrev}>
                Anterior
              </Button>
              <Button
                type="button"
                disabled={allowWrite && !step2SyncedWithDigid}
                title={
                  allowWrite && !step2SyncedWithDigid
                    ? "Primero sincroniza la asignación con DIGID"
                    : undefined
                }
                onClick={goNext}
              >
                Siguiente: ordenar marcas
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Marcas y orden de firma</CardTitle>
            <CardDescription>
              Define el orden de las marcas en el documento. Usa las flechas para reordenar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderedLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay marcas. Abre el visor y coloca firmas en el PDF.</p>
            ) : (
              <ol className="space-y-2">
                {orderedLabels.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium text-muted-foreground">{i + 1}.</span> {p.signatoryName} — página{" "}
                      {p.page}
                    </span>
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!allowWrite || reorderPending || i === 0}
                        onClick={() => movePlacement(i, -1)}
                        aria-label="Subir"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!allowWrite || reorderPending || i === orderedLabels.length - 1}
                        onClick={() => movePlacement(i, 1)}
                        aria-label="Bajar"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={goPrev}>
                Anterior
              </Button>
              <Button type="button" onClick={goNext}>
                Siguiente: configurar envío
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Opciones de envío</CardTitle>
            <CardDescription>
              Configura el tipo de firma, el folio premium, el color, los recordatorios y el observador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typeSign">Tipo de firma</Label>
              <select
                id="typeSign"
                value={sendTypeSign}
                onChange={(e) => setSendTypeSign(e.target.value === "1" ? "1" : "2")}
                disabled={!allowWrite}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !allowWrite && "cursor-not-allowed opacity-60",
                )}
              >
                <option value="1">Electrónica</option>
                <option value="2">Autógrafa</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="folioPremium"
                checked={sendFolioPremium}
                onChange={(e) => setSendFolioPremium(e.target.checked)}
                disabled={!allowWrite}
                className="h-4 w-4"
              />
              <Label htmlFor="folioPremium">Folio premium / NOM-151</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="colorSign">Color firma</Label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  id="colorSignPicker"
                  className={cn(
                    "h-10 w-14 shrink-0 cursor-pointer rounded border border-input bg-background disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                  value={parseHexColor(colorDraft) ?? parseHexColor(sendColorSign) ?? "#000000"}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase();
                    setSendColorSign(v);
                    setColorDraft(v);
                  }}
                  disabled={!allowWrite}
                  aria-label="Selector de color de firma"
                />
                <div
                  className="h-10 w-10 shrink-0 rounded border border-input shadow-inner"
                  style={{
                    backgroundColor: parseHexColor(colorDraft) ?? parseHexColor(sendColorSign) ?? "#000000",
                  }}
                  title="Vista previa"
                  aria-hidden
                />
                <Input
                  id="colorSign"
                  className="min-w-[8rem] flex-1 font-mono text-sm"
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                  onBlur={() => {
                    const p = parseHexColor(colorDraft);
                    if (p) {
                      setSendColorSign(p);
                      setColorDraft(p);
                    } else {
                      toast.error("Formato inválido. Usa #RRGGBB (6 hexadecimales).");
                      setColorDraft(sendColorSign);
                    }
                  }}
                  placeholder="#000000"
                  disabled={!allowWrite}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="colorSign-hint"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remider">Recordatorio al firmante</Label>
              <select
                id="remider"
                value={sendRemider}
                onChange={(e) => setSendRemider(e.target.value as "1" | "2" | "3")}
                disabled={!allowWrite}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !allowWrite && "cursor-not-allowed opacity-60",
                )}
              >
                <option value="1">24 horas</option>
                <option value="2">48 horas</option>
                <option value="3">72 horas</option>
              </select>
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Observador (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Si indicas correo del observador, el nombre es obligatorio.
              </p>
              <div className="space-y-2">
                <Label htmlFor="observerEmail">Correo del observador</Label>
                <Input
                  id="observerEmail"
                  type="email"
                  autoComplete="off"
                  placeholder="observador@empresa.com"
                  value={sendObserverEmail}
                  onChange={(e) => setSendObserverEmail(e.target.value)}
                  disabled={!allowWrite}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observerName">Nombre del observador</Label>
                <Input
                  id="observerName"
                  placeholder="Nombre completo"
                  value={sendObserverName}
                  onChange={(e) => setSendObserverName(e.target.value)}
                  disabled={!allowWrite}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observerPhone">Teléfono del observador</Label>
                <Input
                  id="observerPhone"
                  type="tel"
                  placeholder="Opcional"
                  value={sendObserverPhone}
                  onChange={(e) => setSendObserverPhone(e.target.value)}
                  disabled={!allowWrite}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="observerAprove"
                  checked={sendObserverAprove}
                  onChange={(e) => setSendObserverAprove(e.target.checked)}
                  disabled={!allowWrite}
                  className="h-4 w-4"
                />
                <Label htmlFor="observerAprove">Requiere aprobación del observador</Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={goPrev}>
                Anterior
              </Button>
              <Button type="button" onClick={goNext}>
                Siguiente: revisar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Revisión y envío</CardTitle>
            <CardDescription>
              Comprueba el resumen y envía a firmar. Las opciones fueron definidas en pasos anteriores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                Firmantes seleccionados: <strong className="text-foreground">{selected.size}</strong>
              </li>
              <li>
                Marcas: <strong className="text-foreground">{placementsCount}</strong> (orden {orderedPlacementIds.length}{" "}
                posiciones)
              </li>
              <li>
                Tipo de firma: <strong className="text-foreground">{sendTypeSignLabel}</strong>
              </li>
              <li>
                Folio premium / NOM-151:{" "}
                <strong className="text-foreground">{sendFolioPremium ? "Sí" : "No"}</strong>
              </li>
              <li>
                Color firma: <strong className="text-foreground">{sendColorSign.trim() || "—"}</strong>
              </li>
              <li>
                Recordatorio al firmante: <strong className="text-foreground">{sendRemiderLabel}</strong>
              </li>
              <li>
                Observador:{" "}
                {sendObserverEmail.trim() ? (
                  <>
                    <strong className="text-foreground">
                      {sendObserverName.trim() || "(sin nombre)"} · {sendObserverEmail.trim()}
                    </strong>
                    {sendObserverPhone.trim() ? (
                      <span className="text-muted-foreground"> · {sendObserverPhone.trim()}</span>
                    ) : null}
                    {sendObserverAprove ? (
                      <span className="block text-xs text-muted-foreground">Requiere aprobación del observador: sí</span>
                    ) : null}
                  </>
                ) : (
                  <strong className="text-foreground">—</strong>
                )}
              </li>
              {sendState?.ok ? (
                <li className="text-emerald-700 dark:text-emerald-400">
                  {sendState.message ?? "Documento enviado a firmar."}
                </li>
              ) : validationMessage() ? (
                <li className="text-destructive">{validationMessage()}</li>
              ) : (
                <li className="text-emerald-700 dark:text-emerald-400">Listo para enviar.</li>
              )}
            </ul>

            {!sendState?.ok ? (
              <form action={sendAction} className="space-y-4 border-t pt-4">
                <input type="hidden" name="documentId" value={documentId} />
                <input type="hidden" name="typeSign" value={sendTypeSign} />
                <input type="hidden" name="colorSign" value={sendColorSign} />
                <input type="hidden" name="remider" value={sendRemider} />
                {sendFolioPremium ? <input type="hidden" name="folioPremium" value="on" /> : null}
                <input type="hidden" name="observerEmail" value={sendObserverEmail} />
                <input type="hidden" name="observerName" value={sendObserverName} />
                <input type="hidden" name="observerPhone" value={sendObserverPhone} />
                {sendObserverAprove ? <input type="hidden" name="observerAprove" value="on" /> : null}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={goPrev}>
                      Anterior
                    </Button>
                    <Button
                      type="submit"
                      className="disabled:pointer-events-none disabled:opacity-50"
                      disabled={
                        !allowWrite ||
                        sendPending ||
                        Boolean(validationMessage()) ||
                        insufficientFoliosForSend
                      }
                    >
                      {sendPending ? "Enviando…" : "Enviar a firmar"}
                    </Button>
                  </div>
                  {insufficientFoliosForSend ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Saldo insuficiente: tienes {userFolioBalance} folios y este envío requiere {sendFolioCost}.{" "}
                      <Link
                        href="/folios/planes"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Comprar folios
                      </Link>
                    </p>
                  ) : null}
                </div>
                <ActionErrorDetails failed={sendState != null && !sendState.ok} message={sendState?.message} />
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
      <Card>
        <CardHeader>
          <CardTitle>Después del envío: URLs y constancia</CardTitle>
          <CardDescription>
            Usa nuestras herramientas para generar URLs por firmante, descargar CSV y generar constancia.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!allowWrite || pendingUrls}
              onClick={() =>
                startUrls(async () => {
                  const r = await getBulkSignerUrls(documentId);
                  if (r.ok) {
                    setUrls(r.urls);
                    toast.success(`${r.urls.length} enlaces generados`);
                  } else toast.error(r.message ?? "Error");
                })
              }
            >
              Generar URLs por firmante
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!allowWrite || pendingUrls}
              onClick={() =>
                startUrls(async () => {
                  const r = await getLayoutSignerUrl(documentId);
                  if (r.ok && r.url) {
                    setLayoutUrl(r.url);
                    toast.success("URL de pantalla de firma lista");
                  } else toast.error("message" in r ? r.message : "Error");
                })
              }
            >
              URL pantalla de firma
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!allowWrite || pendingUrls}
              onClick={() =>
                startUrls(async () => {
                  const r = await exportSignerUrlsCsv(documentId);
                  if (r.ok && "csv" in r && r.csv) {
                    const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "fileName" in r && r.fileName ? r.fileName : "urls-firma.csv";
                    a.click();
                    URL.revokeObjectURL(a.href);
                    toast.success("CSV descargado");
                  } else toast.error("message" in r ? r.message : "Error");
                })
              }
            >
              Descargar CSV (firmantes + URL)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!allowWrite || certPending}
              onClick={() =>
                startCert(async () => {
                  const r = await certifyStoredDocument(documentId);
                  if (r.ok) toast.success(r.message ?? "Listo");
                  else toast.error(r.message ?? "Error");
                })
              }
            >
              Generar constancia
            </Button>
          </div>
          {layoutUrl ? (
            <a
              href={layoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary underline"
            >
              Abrir pantalla de firma <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {urls.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {urls.map((u) => (
                <li key={u.url} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    {u.signatoryId && allowWrite ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={reenviarFor !== null}
                        onClick={() => {
                          setReenviarFor(u.signatoryId);
                          startReenviar(async () => {
                            try {
                              const res = await reenviarSigningInvite(documentId, u.signatoryId);
                              if (res.ok) toast.success(res.message ?? "Listo");
                              else toast.error(res.message ?? "Error");
                            } finally {
                              setReenviarFor(null);
                            }
                          });
                        }}
                      >
                        {reenviarFor === u.signatoryId ? "Reenviando…" : "Reenviar invitación"}
                      </Button>
                    ) : null}
                  </div>
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-primary underline break-all"
                  >
                    {u.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Plantilla de correo para reenvió de invitación</p>
            </div>
            <Textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={6}
              className="font-mono text-xs"
              disabled={!allowWrite}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(emailTemplate);
                  toast.success("Plantilla copiada");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar plantilla
              </Button>
              {urls.length > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!allowWrite}
                  onClick={() => {
                    const blocks = urls.map((u) =>
                      emailTemplate.replaceAll("{nombre}", u.name).replaceAll("{url}", u.url),
                    );
                    setEmailBulkDraft(blocks.join("\n\n────────\n\n"));
                    toast.success("Borrador generado");
                  }}
                >
                  Rellenar con URLs mostradas
                </Button>
              ) : null}
            </div>
            {emailBulkDraft ? (
              <div className="space-y-2">
                <Label className="text-xs">Borrador para varios destinatarios</Label>
                <Textarea readOnly value={emailBulkDraft} rows={10} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(emailBulkDraft);
                    toast.success("Borrador copiado");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar borrador
                </Button>
              </div>
            ) : null}
          </div>

          <Button variant="link" className="h-auto w-fit p-0" asChild>
            <Link href="/documentos">Volver al listado</Link>
          </Button>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}