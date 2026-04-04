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
      if (state.ok) {
        toast.success(state.message);
        const id = state.companyId;
        const q = new URLSearchParams({ registrado: "1" });
        if (id) q.set("companyId", id);
        // Navegación completa: evita lista de clientes cacheada en el segmento RSC tras router.push.
        window.location.assign(`/documentos/nuevo?${q.toString()}`);
      } else toast.error(state.message);
    }
  }, [state]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo cliente</h1>
        <p className="text-muted-foreground">
          Registra en el proveedor una empresa o una persona física; guardamos el Id. de cliente para documentos y
          firmantes.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
          <CardDescription>RFC y correo deben coincidir con lo que usarás en el proveedor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón social o nombre completo</Label>
              <Input
                id="razonSocial"
                name="razonSocial"
                required
                placeholder="ACME SA de CV o Juan Pérez García"
              />
              <p className="text-xs text-muted-foreground">
                Para persona física usa el nombre como debe figurar ante el proveedor; el RFC debe ser de persona física.
              </p>
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
                {pending ? "Registrando…" : "Registrar en proveedor"}
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
