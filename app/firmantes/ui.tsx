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
  companies,
  selectedCompanyId,
  signatories,
}: {
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

  return (
    <div className="space-y-4">
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
                DIGID no duplica por correo/teléfono dentro del mismo IdClient; puede devolver el existente.
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
              <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>IDs DIGID para asignación y coordenadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {signatories.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
              <p>No hay firmantes para esta empresa.</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/prueba-e2e">Ver orden del flujo E2E</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo / Tel.</TableHead>
                  <TableHead>Id DIGID</TableHead>
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
