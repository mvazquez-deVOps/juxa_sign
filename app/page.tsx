import Link from "next/link";
import { ArrowRight, Building2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { HomeOnboarding } from "@/components/home-onboarding";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [companies, signatories, documents, placements] = await Promise.all([
    prisma.company.count(),
    prisma.signatory.count(),
    prisma.document.count(),
    prisma.signaturePlacement.count(),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/30 p-8 md:p-10">
        <p className="text-sm font-medium text-primary">Juxa Sign</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Firma documentos con DIGID, sin exponer credenciales en el navegador.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Registra empresas, administra firmantes, sube PDFs, coloca coordenadas de firma y envía a
          firmar — todo desde un panel moderno y seguro.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/empresas">
              Empezar con empresas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/documentos">Ver documentos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/envios">Envíos y estado</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/prueba-e2e">Checklist sandbox (E2E)</Link>
          </Button>
        </div>
      </section>

      <HomeOnboarding
        counts={{
          companies,
          signatories,
          documents,
          placements,
        }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Empresas</CardTitle>
            <CardDescription>Alta en DIGID y almacenamiento de IdClient.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/empresas">Ir a empresas</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Documentos</CardTitle>
            <CardDescription>Sube PDF, marca firmas y envía el flujo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/documentos">Ir a documentos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Servidor seguro</CardTitle>
            <CardDescription>Las llaves DIGID solo viven en el servidor.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
