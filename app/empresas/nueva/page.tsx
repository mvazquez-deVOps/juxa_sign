"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCompany, type CompanyActionState } from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect } from "react";
import { ActionErrorDetails } from "@/components/action-error-details";

const initial: CompanyActionState | null = null;

export default function NuevaEmpresaPage() {
  const [state, formAction, pending] = useActionState(createCompany, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nueva empresa</h1>
        <p className="text-muted-foreground">
          Llama a DIGID <code className="text-xs">RegistrarEmpresa</code> y guarda el IdClient.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
          <CardDescription>RFC y correo deben coincidir con lo que usarás en DIGID.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón social</Label>
              <Input id="razonSocial" name="razonSocial" required placeholder="ACME SA de CV" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input id="rfc" name="rfc" required placeholder="XAXX010101000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" required placeholder="contacto@empresa.com" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Registrando…" : "Registrar en DIGID"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/empresas">Cancelar</Link>
              </Button>
            </div>
            <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
