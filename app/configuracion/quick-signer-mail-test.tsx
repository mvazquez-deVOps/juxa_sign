"use client";

import { useActionState, useEffect } from "react";
import {
  sendQuickSignerTestEmail,
  type QuickSignerMailTestState,
} from "@/app/actions/config-mail-test";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initial: QuickSignerMailTestState | null = null;

export function QuickSignerMailTest({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(sendQuickSignerTestEmail, initial);

  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="qst-name">Nombre del destinatario</Label>
          <Input
            id="qst-name"
            name="recipientName"
            placeholder="Ej. Ana Prueba"
            required
            minLength={2}
            disabled={disabled || pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qst-email">Correo</Label>
          <Input
            id="qst-email"
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            required
            autoComplete="email"
            disabled={disabled || pending}
          />
        </div>
      </div>
      <Button type="submit" disabled={disabled || pending}>
        {pending ? "Enviando…" : "Enviar correo de prueba"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Mismo formato que “Firma pendiente”: enlace a <code className="rounded bg-muted px-1">/firma-prueba</code> (mock).
        No sustituye un envío real a DIGID.
      </p>
    </form>
  );
}
