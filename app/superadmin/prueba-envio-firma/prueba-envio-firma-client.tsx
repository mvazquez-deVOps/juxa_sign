"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  runSuperadminSigningLab,
  type SuperadminSigningLabState,
} from "@/app/actions/superadmin-signing-lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const initial: SuperadminSigningLabState | null = null;

export function SuperadminPruebaEnvioFirmaClient({
  companies,
}: {
  companies: { id: string; razonSocial: string }[];
}) {
  const [companyId, setCompanyId] = useState(companies[0]!.id);
  const [state, action, pending] = useActionState(runSuperadminSigningLab, initial);

  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  if (companies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay clientes en tu organización.{" "}
        <Link href="/empresas/nueva" className="text-primary underline-offset-4 hover:underline">
          Crea uno
        </Link>{" "}
        y vuelve a esta página.
      </p>
    );
  }

  return (
    <form action={action} className="max-w-xl space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="space-y-2">
        <Label htmlFor="lab-company">Cliente (empresa DIGID)</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger id="lab-company" className="w-full">
            <SelectValue placeholder="Elige cliente" />
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

      <div className="space-y-2">
        <Label htmlFor="lab-nameDoc">Nombre del documento</Label>
        <Input
          id="lab-nameDoc"
          name="nameDoc"
          defaultValue="Prueba laboratorio superadmin"
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lab-file">PDF</Label>
        <Input id="lab-file" name="file" type="file" accept="application/pdf,.pdf" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lab-signerName">Nombre del firmante</Label>
        <Input id="lab-signerName" name="signerName" placeholder="Ej. Ana López" required minLength={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lab-signerEmail">Correo del firmante</Label>
        <Input
          id="lab-signerEmail"
          name="signerEmail"
          type="email"
          placeholder="tu-correo@ejemplo.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Procesando…" : "Subir y enviar a firma"}
        </Button>
        {state?.documentId ? (
          <Button variant="outline" type="button" asChild>
            <Link href={`/documentos/${state.documentId}`}>Abrir documento</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
