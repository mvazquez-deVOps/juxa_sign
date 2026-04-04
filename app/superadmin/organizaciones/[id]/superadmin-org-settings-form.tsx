"use client";

import { useActionState, useEffect } from "react";
import {
  superadminUpdateOrgSettings,
  type SuperadminOrgSettingsState,
} from "@/app/actions/superadmin-settings";
import { ActionErrorDetails } from "@/components/action-error-details";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initial: SuperadminOrgSettingsState | null = null;

export function SuperadminOrgSettingsForm({
  organizationId,
  defaults,
}: {
  organizationId: string;
  defaults: {
    displayName: string;
    maxUsers: string;
    maxMonthlySends: string;
    folioPremiumEnabled: boolean;
  };
}) {
  const bound = superadminUpdateOrgSettings.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(bound, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajustes de organización</CardTitle>
        <CardDescription>
          Nombre para mostrar, límites de equipo y cuotas pensadas para gobierno del producto. Los envíos aún no bloquean
          por estas cuotas salvo que se implemente enforce en servidor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre para mostrar</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={defaults.displayName}
              placeholder="Ej. Mi empresa (UI)"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxUsers">Límite de usuarios en equipo</Label>
            <Input
              id="maxUsers"
              name="maxUsers"
              type="number"
              min={1}
              max={10000}
              defaultValue={defaults.maxUsers}
              placeholder="Vacío = sin límite definido"
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
              defaultValue={defaults.maxMonthlySends}
              placeholder="Vacío = sin cuota definida"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="folioPremiumEnabled"
              name="folioPremiumEnabled"
              type="checkbox"
              defaultChecked={defaults.folioPremiumEnabled}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="folioPremiumEnabled" className="font-normal">
              Política org.: habilitar folio premium / NOM-151 por defecto en envíos
            </Label>
          </div>
          <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
