"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  superadminFolioGrant,
  superadminFolioPackCreate,
  type SuperadminFolioGrantState,
  type SuperadminFolioPackState,
  superadminFolioPackDelete,
  superadminFolioPackToggleActive,
} from "@/app/actions/superadmin-folios";
import { ActionErrorDetails } from "@/components/action-error-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const grantInitial: SuperadminFolioGrantState | null = null;
const packInitial: SuperadminFolioPackState | null = null;

export function FolioSuperadminGrantForm({
  users,
}: {
  users: { id: string; email: string; folioBalance: number; kycBalance: number; role: string }[];
}) {
  const [state, formAction, pending] = useActionState(superadminFolioGrant, grantInitial);
  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);
  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-medium">Acreditar semilla (folios)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="userId">Usuario</Label>
          <select
            id="userId"
            name="userId"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecciona…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} · {u.role} · folios {u.folioBalance} · KYC {u.kycBalance}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="delta">Créditos a agregar</Label>
          <Input id="delta" name="delta" type="number" min={1} max={1_000_000} required placeholder="100" />
        </div>
      </div>
      <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
      <Button type="submit" disabled={pending}>
        {pending ? "Aplicando…" : "Acreditar"}
      </Button>
    </form>
  );
}

export function FolioSuperadminPackForm() {
  const [state, formAction, pending] = useActionState(superadminFolioPackCreate, packInitial);
  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);
  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-medium">Nuevo paquete (catálogo)</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (único)</Label>
          <Input id="slug" name="slug" required placeholder="basico" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Input id="description" name="description" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="folioAmount">Cantidad de folios</Label>
          <Input id="folioAmount" name="folioAmount" type="number" min={1} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceMxn">Precio MXN (ej. 499.00)</Label>
          <Input id="priceMxn" name="priceMxn" required placeholder="499.00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Orden</Label>
          <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={0} />
        </div>
        <div className="flex items-center gap-2 pt-8">
          <input id="active" name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-input" />
          <Label htmlFor="active" className="font-normal">
            Activo
          </Label>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear paquete"}
      </Button>
    </form>
  );
}

export function FolioPackRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await superadminFolioPackToggleActive(id, !active);
            if (r.ok) {
              toast.success(r.message);
              router.refresh();
            } else toast.error(r.message);
          })
        }
      >
        {active ? "Desactivar" : "Activar"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            if (!confirm("¿Eliminar este paquete del catálogo?")) return;
            const r = await superadminFolioPackDelete(id);
            if (r.ok) {
              toast.success(r.message);
              router.refresh();
            } else toast.error(r.message);
          })
        }
      >
        Eliminar
      </Button>
    </div>
  );
}
