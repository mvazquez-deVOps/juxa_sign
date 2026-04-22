"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { adminOrgGrantFolios, type OrgFolioGrantState } from "@/app/actions/org-folios";
import { ActionErrorDetails } from "@/components/action-error-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const grantInitial: OrgFolioGrantState | null = null;

export function FolioOrgGrantForm({
  users,
}: {
  users: { id: string; email: string; folioBalance: number; kycBalance: number; role: string }[];
}) {
  const [state, formAction, pending] = useActionState(adminOrgGrantFolios, grantInitial);
  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);
  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-medium">Acreditar folios a un miembro</h2>
      <p className="text-sm text-muted-foreground">
        Los movimientos quedan registrados como transferencia de administrador. Para precios del catálogo global, revisa{" "}
        <Link href="/folios/planes" className="font-medium text-primary underline-offset-4 hover:underline">
          Planes
        </Link>
        .
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="userId">Usuario del equipo</Label>
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
