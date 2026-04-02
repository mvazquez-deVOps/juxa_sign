"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadDocument, type DocumentUploadState } from "@/app/actions/document";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ActionErrorDetails } from "@/components/action-error-details";

const initial: DocumentUploadState | null = null;

export function NuevoDocumentoForm({
  companies,
}: {
  companies: { id: string; razonSocial: string }[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [state, formAction, pending] = useActionState(uploadDocument, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) {
        toast.success(state.message);
        if (state.documentId) router.push(`/documentos/${state.documentId}`);
      } else toast.error(state.message);
    }
  }, [state, router]);

  if (!companies.length) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">Necesitas al menos una empresa.</p>
        <Button className="mt-4" asChild>
          <Link href="/empresas/nueva">Registrar empresa</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo documento</h1>
        <p className="text-muted-foreground">Sube un PDF a DIGID (create_doc).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Archivo</CardTitle>
          <CardDescription>Solo PDF o DOCX según política DIGID.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="companyId" value={companyId} />
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="nameDoc">Nombre del documento</Label>
              <Input id="nameDoc" name="nameDoc" required maxLength={100} placeholder="Contrato arrendamiento" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">PDF</Label>
              <Input id="file" name="file" type="file" accept=".pdf,application/pdf" required />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Subiendo…" : "Crear en DIGID"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/documentos">Cancelar</Link>
              </Button>
            </div>
            <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
