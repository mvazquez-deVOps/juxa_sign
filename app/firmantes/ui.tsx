"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveSignatory, type SignatoryActionState } from "@/app/actions/signatory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Clientes</span> (empresa o persona moral) se registran en{" "}
        <Link href="/empresas" className="text-primary underline-offset-4 hover:underline">
          Clientes
        </Link>
        . Aquí cargas a las <span className="font-medium text-foreground">personas que firman</span> para el Id. de
        cliente seleccionado; sin firmantes no podrás completar el envío a firma.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label>Empresa</Label>
          <Select
            value={companyId}
            onValueChange={(v) => {
              setCompanyId(v);
              router.push(`/firmantes?companyId=${v}`);
            }}
          >
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Empresa" />
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
        {allowWrite ? (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEdit(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEdit(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nuevo firmante
              </Button>
            </DialogTrigger>
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Perfil visor · potencial consumidor: consulta el directorio; el alta de firmantes la hacen roles
            operativos.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Identificadores remotos para asignación y coordenadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {signatories.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="max-w-md space-y-2 text-sm">
                <p className="font-medium text-foreground">El cliente ya está en el panel; faltan firmantes</p>
                <p className="text-muted-foreground">
                  «{selectedRazon}» es el cliente en el proveedor. Para iniciar la firma necesitas al menos una persona
                  con nombre y correo o teléfono en esta lista (no se crean solas al registrar el cliente).
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {allowWrite ? (
                  <Button size="sm" onClick={() => setOpen(true)}>
                    Dar de alta el primero
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <Link href="/prueba-e2e">Orden en guía E2E</Link>
                </Button>
              </div>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
