"use client";

import { useActionState, useEffect, useState } from "react";
import { registerDigidWebhook, type ConfigActionState } from "@/app/actions/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ActionErrorDetails } from "@/components/action-error-details";

const initial: ConfigActionState | null = null;

export function ConfigWebhookForm({
  companies,
}: {
  companies: { id: string; razonSocial: string }[];
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(registerDigidWebhook, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  if (!companies.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Registra una empresa antes de configurar el webhook.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar webhook en DIGID</CardTitle>
        <CardDescription>add_webhook · IdClient + URL pública HTTPS en producción.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="companyId" value={companyId} />
          <div className="space-y-2">
            <Label>Empresa (IdClient)</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue />
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
          <Button type="submit" disabled={pending}>
            {pending ? "Registrando…" : "Registrar webhook"}
          </Button>
          <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
        </form>
      </CardContent>
    </Card>
  );
}
