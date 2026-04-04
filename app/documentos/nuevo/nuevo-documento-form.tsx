"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCompany, type CompanyActionState } from "@/app/actions/company";
import { uploadDocument, type DocumentUploadState } from "@/app/actions/document";
import { ActionErrorDetails } from "@/components/action-error-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const uploadInitial: DocumentUploadState | null = null;
const companyInitial: CompanyActionState | null = null;

function pickDefaultCompanyId(list: { id: string }[], current: string): string {
  if (list.length === 0) return "";
  if (current && list.some((c) => c.id === current)) return current;
  return list[0]!.id;
}

function mergeCompanyRows(
  fromServer: { id: string; razonSocial: string }[],
  sessionAdded: { id: string; razonSocial: string }[],
): { id: string; razonSocial: string }[] {
  const map = new Map<string, { id: string; razonSocial: string }>();
  for (const c of fromServer) map.set(c.id, c);
  for (const c of sessionAdded) map.set(c.id, c);
  return [...map.values()].sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, "es"));
}

export function NuevoDocumentoForm({
  companies: companiesProp,
  memoryDataStore,
  justRegisteredClient,
  preselectCompanyId,
  autoDemoClientHint,
}: {
  companies: { id: string; razonSocial: string }[];
  memoryDataStore: boolean;
  justRegisteredClient?: boolean;
  /** Tras alta desde /empresas/nueva (recarga completa): seleccionar este cliente. */
  preselectCompanyId?: string;
  /** Organización sin clientes: se insertó el cliente de prueba automático. */
  autoDemoClientHint?: boolean;
}) {
  const router = useRouter();
  const companiesPropRef = useRef(companiesProp);
  companiesPropRef.current = companiesProp;
  /** Clientes recién creados en esta pestaña mientras el RSC aún devuelve lista cacheada. */
  const [sessionAdded, setSessionAdded] = useState<{ id: string; razonSocial: string }[]>([]);
  const companies = useMemo(
    () => mergeCompanyRows(companiesProp, sessionAdded),
    [companiesProp, sessionAdded],
  );

  const [companyId, setCompanyId] = useState(() => pickDefaultCompanyId(companiesProp, ""));

  /** Evita enviar companyId vacío si el Select mostraba un cliente pero el estado aún no coincidía. */
  const resolvedCompanyId = useMemo(() => {
    if (companyId && companies.some((c) => c.id === companyId)) return companyId;
    return companies[0]?.id ?? "";
  }, [companies, companyId]);
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadDocument, uploadInitial);
  const [companyState, companyAction, companyPending] = useActionState(createCompany, companyInitial);

  const refreshList = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const ids = new Set(companiesProp.map((c) => c.id));
    setSessionAdded((prev) => prev.filter((c) => !ids.has(c.id)));
  }, [companiesProp]);

  useEffect(() => {
    setCompanyId((prev) => pickDefaultCompanyId(companies, prev));
  }, [companies]);

  useEffect(() => {
    if (!preselectCompanyId) return;
    if (!companies.some((c) => c.id === preselectCompanyId)) return;
    setCompanyId(preselectCompanyId);
    setTab("existente");
  }, [preselectCompanyId, companies]);

  const prevCompanyCount = useRef(companiesProp.length);
  useEffect(() => {
    if (prevCompanyCount.current === 0 && companiesProp.length > 0) {
      setTab("existente");
    }
    prevCompanyCount.current = companiesProp.length;
  }, [companiesProp.length]);

  useEffect(() => {
    if (!uploadState?.message) return;
    if (uploadState.ok) {
      toast.success(uploadState.message);
      if (uploadState.documentId) {
        router.push(`/documentos/${uploadState.documentId}`);
        router.refresh();
      }
    } else toast.error(uploadState.message);
  }, [uploadState, router]);

  useEffect(() => {
    if (!companyState?.message) return;
    if (companyState.ok) {
      toast.success(companyState.message);
      if (companyState.companyId && companyState.razonSocial) {
        setSessionAdded((prev) => {
          const id = companyState.companyId!;
          if (companiesPropRef.current.some((c) => c.id === id)) return prev;
          if (prev.some((c) => c.id === id)) return prev;
          return [...prev, { id, razonSocial: companyState.razonSocial! }];
        });
        setCompanyId(companyState.companyId);
        setTab("existente");
      }
      refreshList();
    } else toast.error(companyState.message);
  }, [companyState, refreshList]);

  const hasClients = companies.length > 0;
  const [tab, setTab] = useState<"existente" | "nuevo">(() => (companiesProp.length > 0 ? "existente" : "nuevo"));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo documento</h1>
        <p className="text-muted-foreground">
          Elige un cliente ya registrado o da de alta uno aquí; luego sube el PDF al proveedor.
        </p>
      </div>

      {justRegisteredClient ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-100">
          Cliente guardado. Revisa la pestaña <span className="font-medium">Cliente existente</span>: el nuevo cliente debe
          aparecer en el desplegable (si no, recarga la página una vez).
        </p>
      ) : null}

      {memoryDataStore ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <span className="font-medium text-foreground">Modo memoria:</span> al reiniciar el servidor Node se pierden
          clientes y documentos. Para pruebas largas usa PostgreSQL sin <code className="text-[11px]">JUXA_DATA_STORE=memory</code>.
          {autoDemoClientHint ? (
            <>
              {" "}
              Si tu organización no tenía clientes, se añadió automáticamente{" "}
              <span className="font-medium text-foreground">Cliente de prueba Juxa</span> para que puedas elegir PDF y seguir el
              flujo.
            </>
          ) : null}
        </p>
      ) : autoDemoClientHint ? (
        <p className="rounded-lg border border-muted-foreground/25 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Tu organización no tenía clientes; se creó{" "}
          <span className="font-medium text-foreground">Cliente de prueba Juxa</span> (solo con DIGID en modo simulación) para
          poder subir un PDF y probar el flujo.
        </p>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as "existente" | "nuevo")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existente" disabled={!hasClients}>
            Cliente existente
          </TabsTrigger>
          <TabsTrigger value="nuevo">Registrar cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="nuevo" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alta rápida en DIGID</CardTitle>
              <CardDescription>
                Mismos datos que en <Link href="/empresas/nueva">Nuevo cliente</Link>. Al guardar, el cliente queda en tu
                organización y puedes subir el PDF en la otra pestaña.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={companyAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qc-razon">Razón social o nombre completo</Label>
                  <Input id="qc-razon" name="razonSocial" required placeholder="ACME SA de CV" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qc-rfc">RFC</Label>
                  <Input id="qc-rfc" name="rfc" required placeholder="XAXX010101000" minLength={10} maxLength={13} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qc-email">Correo</Label>
                  <Input id="qc-email" name="email" type="email" required placeholder="contacto@empresa.com" />
                </div>
                <ActionErrorDetails failed={companyState != null && !companyState.ok} message={companyState?.message} />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={companyPending}>
                    {companyPending ? "Registrando…" : "Registrar y actualizar lista"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existente" className="mt-4">
          {!hasClients ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay clientes. Usa la pestaña <span className="font-medium text-foreground">Registrar cliente</span>.
            </p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Archivo</CardTitle>
                <CardDescription>PDF según política del proveedor.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={uploadAction} className="space-y-4">
                  <input type="hidden" name="companyId" value={resolvedCompanyId} />
                  <div className="space-y-2">
                    <Label>Cliente (empresa en DIGID)</Label>
                    <Select value={resolvedCompanyId || undefined} onValueChange={setCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.razonSocial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameDoc">Nombre del documento</Label>
                    <Input id="nameDoc" name="nameDoc" required maxLength={100} placeholder="Contrato arrendamiento" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">PDF</Label>
                    <Input id="file" name="file" type="file" accept=".pdf,application/pdf" required />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={uploadPending || !resolvedCompanyId}>
                      {uploadPending ? "Subiendo…" : "Crear en proveedor"}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/documentos">Cancelar</Link>
                    </Button>
                  </div>
                  <ActionErrorDetails failed={uploadState != null && !uploadState.ok} message={uploadState?.message} />
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Después del documento: <Link href="/firmantes">Firmantes</Link> → marcas en el visor →{" "}
        <Link href="/documentos">Enviar a firmar</Link>.
      </p>
    </div>
  );
}
