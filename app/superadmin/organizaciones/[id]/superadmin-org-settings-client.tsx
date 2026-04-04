"use client";

import { useActionState, useEffect } from "react";
import {
  superadminUpdateOrgSettings,
  type SuperadminOrgSettingsState,
} from "@/app/actions/superadmin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initial: SuperadminOrgSettingsState | null = null;

type Settings = {
  displayName: string | null;
  maxUsers: number | null;
  maxMonthlySends: number | null;
  folioPremiumEnabled: boolean;
};

export function SuperadminOrgSettingsClient({
  organizationId,
  settings,
}: {
  organizationId: string;
  settings: Settings | null;
}) {
  const bound = superadminUpdateOrgSettings.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(bound, initial);

  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast.success(state.message);
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="displayName">Nombre para mostrar</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={settings?.displayName ?? ""}
          placeholder="Opcional"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">Etiqueta en UI; no cambia el slug ni el nombre interno.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxUsers">Límite de usuarios en el equipo</Label>
        <Input
          id="maxUsers"
          name="maxUsers"
          type="number"
          min={1}
          max={10000}
          step={1}
          defaultValue={settings?.maxUsers ?? ""}
          placeholder="Vacío = sin límite en configuración"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxMonthlySends">Envíos al mes (cuota)</Label>
        <Input
          id="maxMonthlySends"
          name="maxMonthlySends"
          type="number"
          min={0}
          max={1000000}
          step={1}
          defaultValue={settings?.maxMonthlySends ?? ""}
          placeholder="Vacío = sin cuota definida"
        />
        <p className="text-xs text-muted-foreground">
          Gobierno de producto; el enforce en envíos puede activarse después.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="folioPremiumEnabled"
          name="folioPremiumEnabled"
          type="checkbox"
          defaultChecked={settings?.folioPremiumEnabled ?? false}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="folioPremiumEnabled" className="font-normal">
          Política org.: permitir folio premium / NOM-151 por defecto
        </Label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
