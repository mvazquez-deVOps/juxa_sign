"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assignSignatoriesToDocument,
  getBulkSignerUrls,
  getLayoutSignerUrl,
  sendDocumentForSigning,
  type SigningActionState,
} from "@/app/actions/signing";
import { certifyStoredDocument } from "@/app/actions/config";
import { refreshDocumentStatus } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { ActionErrorDetails } from "@/components/action-error-details";

const initial: SigningActionState | null = null;

export function EnviarClient({
  documentId,
  placementsCount,
  signatories,
}: {
  documentId: string;
  placementsCount: number;
  signatories: { id: string; name: string; digidId: number; assigned: boolean }[];
}) {
  const [assignState, assignAction, assignPending] = useActionState(assignSignatoriesToDocument, initial);
  const [sendState, sendAction, sendPending] = useActionState(sendDocumentForSigning, initial);
  const [urls, setUrls] = useState<{ name: string; url: string }[]>([]);
  const [layoutUrl, setLayoutUrl] = useState<string | null>(null);
  const [pendingUrls, startUrls] = useTransition();
  const [certPending, startCert] = useTransition();
  const [syncPending, startSync] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (assignState?.message) {
      if (assignState.ok) toast.success(assignState.message);
      else toast.error(assignState.message);
    }
  }, [assignState]);

  useEffect(() => {
    if (sendState?.message) {
      if (sendState.ok) toast.success(sendState.message);
      else toast.error(sendState.message);
    }
  }, [sendState]);

  const defaultSelected = signatories.filter((s) => s.assigned).map((s) => s.id);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected.length ? defaultSelected : signatories.map((s) => s.id)),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncPending}
          onClick={() =>
            startSync(async () => {
              const r = await refreshDocumentStatus(documentId);
              if (r.ok) {
                toast.success("Estado DIGID actualizado");
                router.refresh();
              } else toast.error(r.message ?? "No se pudo sincronizar");
            })
          }
        >
          {syncPending ? "Sincronizando…" : "Actualizar estado DIGID"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Llama a <code className="rounded bg-muted px-1">dInfoDocto</code> (mismo criterio que en el visor).
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>1. Asignar firmantes</CardTitle>
          <CardDescription>Reemplaza la asignación completa en DIGID (API 5).</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={assignAction} className="space-y-4">
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="signatoryIds" value={Array.from(selected).join(",")} />
            <div className="space-y-2">
              {signatories.map((s) => (
                <label key={s.id} className="flex items-center gap-3 rounded-md border p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">DIGID {s.digidId}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="kyc" name="kyc" className="h-4 w-4" />
              <Label htmlFor="kyc">Requerir KYC en asignación</Label>
            </div>
            <Button type="submit" disabled={assignPending || selected.size === 0}>
              {assignPending ? "Asignando…" : "Sincronizar asignación"}
            </Button>
            <ActionErrorDetails
              failed={assignState != null && !assignState.ok}
              message={assignState?.message}
            />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Enviar a firmar</CardTitle>
          <CardDescription>
            API 8 · Debes tener marcas en el visor ({placementsCount} actualmente).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendAction} className="space-y-4">
            <input type="hidden" name="documentId" value={documentId} />
            <div className="space-y-2">
              <Label htmlFor="typeSign">Tipo de firma</Label>
              <select
                id="typeSign"
                name="typeSign"
                defaultValue="2"
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <option value="1">Electrónica (1)</option>
                <option value="2">Autógrafa (2)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="folioPremium" name="folioPremium" className="h-4 w-4" />
              <Label htmlFor="folioPremium">Folio premium / NOM-151</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="colorSign">Color firma (#RRGGBB)</Label>
              <Input id="colorSign" name="colorSign" placeholder="#000000" defaultValue="#000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remider">Recordatorio (send_doc · Remider)</Label>
              <select
                id="remider"
                name="remider"
                defaultValue="1"
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <option value="1">24 horas (1)</option>
                <option value="2">48 horas (2)</option>
                <option value="3">72 horas (3)</option>
              </select>
            </div>
            <Button type="submit" disabled={sendPending || placementsCount === 0}>
              {sendPending ? "Enviando…" : "Enviar a firmar"}
            </Button>
            <ActionErrorDetails failed={sendState != null && !sendState.ok} message={sendState?.message} />
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>3. URLs de firma</CardTitle>
          <CardDescription>API 11 (por firmante) y API 7 (pantalla general DIGID).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={syncPending}
              onClick={() =>
                startSync(async () => {
                  await refreshDocumentStatus(documentId);
                  toast.success("Estado DIGID actualizado");
                  router.refresh();
                })
              }
            >
              {syncPending ? "Sincronizando…" : "Actualizar estado DIGID"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pendingUrls}
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
              disabled={pendingUrls}
              onClick={() =>
                startUrls(async () => {
                  const r = await getLayoutSignerUrl(documentId);
                  if (r.ok && r.url) {
                    setLayoutUrl(r.url);
                    toast.success("URL de pantalla DIGID lista");
                  } else toast.error("message" in r ? r.message : "Error");
                })
              }
            >
              URL pantalla DIGID
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={certPending}
              onClick={() =>
                startCert(async () => {
                  const r = await certifyStoredDocument(documentId);
                  if (r.ok) toast.success(r.message ?? "Listo");
                  else toast.error(r.message ?? "Error");
                })
              }
            >
              Constancia / certify_doc
            </Button>
          </div>
          {layoutUrl ? (
            <a
              href={layoutUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary underline"
            >
              Abrir pantalla DIGID <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {urls.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {urls.map((u) => (
                <li key={u.url} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all"
                  >
                    {u.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <Button variant="link" className="h-auto w-fit p-0" asChild>
            <Link href="/documentos">Volver al listado</Link>
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
