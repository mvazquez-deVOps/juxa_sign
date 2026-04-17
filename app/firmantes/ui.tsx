"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveSignatory, type SignatoryActionState } from "@/app/actions/signatory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { ActionErrorDetails } from "@/components/action-error-details";

type CompanyOpt = { id: string; razonSocial: string };
type Sig = {
  id: string;
  digidSignatoryId: number;
  name: string;
  email: string | null;
  phone: string | null;
  rfc: string | null;
  isRepLegal: boolean;
  autoSign: boolean;
};

const initial: SignatoryActionState | null = null;

export function FirmantesClient({
  canMutate: allowWrite,
  companies,
  selectedCompanyId,
  signatories,
}: {
  canMutate: boolean;
  companies: CompanyOpt[];
  selectedCompanyId: string;
  signatories: Sig[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(selectedCompanyId);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Sig | null>(null);
  const [state, formAction, pending] = useActionState(saveSignatory, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) {
        toast.success(state.message);
        setOpen(false);
        setEdit(null);
        router.refresh();
      } else toast.error(state.message);
    }
  }, [state, router]);

  useEffect(() => {
    setCompanyId(selectedCompanyId);
  }, [selectedCompanyId]);

  const selectedRazon = companies.find((c) => c.id === companyId)?.razonSocial ?? "este cliente";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setEdit(null);
      }}
    >
      <div className="space-y-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Firmantes de la organización</h1>
            <p className="text-sm text-muted-foreground">
              Aquí cargas a las <span className="font-medium text-foreground">personas que firman</span> para el
              cliente seleccionado; sin firmantes no podrás completar el envío a firma.
            </p>
          </div>
          {allowWrite ? (
            <Button
              type="button"
              className="shrink-0 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                setEdit(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Añadir firmante
            </Button>
          ) : (
            <p className="max-w-md text-sm text-muted-foreground sm:text-right">
              Perfil visor · potencial consumidor: consulta el directorio; el alta de firmantes la hacen roles
              operativos.
            </p>
          )}
        </div>

        <Card>
          <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-end sm:gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="firmantes-company">Cliente</Label>
              <Select
                value={companyId}
                onValueChange={(v) => {
                  setCompanyId(v);
                  router.push(`/firmantes?companyId=${v}`);
                }}
              >
                <SelectTrigger id="firmantes-company" className="w-full sm:max-w-md">
                  <SelectValue placeholder="Cliente" />
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
            <div className="w-full space-y-2 sm:w-48">
              <Label htmlFor="firmantes-toolbar-filter" className="text-muted-foreground">
                Vista
              </Label>
              <select
                id="firmantes-toolbar-filter"
                disabled
                className="flex h-10 w-full cursor-not-allowed rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground shadow-sm ring-offset-background"
                aria-label="Filtro de listado (próximamente)"
              >
                <option>Todos</option>
              </select>
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs">
              <Label htmlFor="firmantes-search" className="text-muted-foreground">
                Búsqueda
              </Label>
              <Input
                id="firmantes-search"
                type="search"
                placeholder="Buscar por nombre…"
                disabled
                className="cursor-not-allowed bg-muted/40"
                title="Próximamente"
              />
            </div>
          </div>

          <CardHeader className="pb-0 pt-6">
            <CardTitle>Listado</CardTitle>
            <CardDescription>
              Personas que firmarán el documento para <span className="text-foreground">{selectedRazon}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signatories.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Users className="h-10 w-10 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-lg font-semibold tracking-tight">No hay firmantes</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Para iniciar la firma necesitas al menos una persona con nombre y correo o teléfono en esta lista.
                </p>
                {allowWrite ? (
                  <Button type="button" className="mt-6" onClick={() => setOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Añadir firmante
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Correo / Tel.</TableHead>
                      <TableHead>Id. firmante</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatories.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.email || s.phone || "—"}
                        </TableCell>
                        <TableCell>{s.digidSignatoryId}</TableCell>
                        <TableCell className="text-right">
                          {allowWrite ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEdit(s);
                                setOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edit ? "Editar firmante" : "Nuevo firmante"}</DialogTitle>
          <DialogDescription>
            El proveedor no duplica por correo/teléfono dentro del mismo Id. de cliente; puede devolver el existente.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="companyId" value={companyId} />
          {edit ? <input type="hidden" name="signatoryId" value={String(edit.digidSignatoryId)} /> : null}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required defaultValue={edit?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" defaultValue={edit?.email ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" defaultValue={edit?.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC (opcional)</Label>
            <Input id="rfc" name="rfc" defaultValue={edit?.rfc ?? ""} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isRepLegal"
              type="checkbox"
              name="isRepLegal"
              defaultChecked={edit?.isRepLegal}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isRepLegal">Representante legal</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="autoSign"
              type="checkbox"
              name="autoSign"
              defaultChecked={edit?.autoSign}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="autoSign">Firma automática</Label>
          </div>
          <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
