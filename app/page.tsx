import Link from "next/link";
import { Building2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeHero } from "@/components/home-hero";
import { requireOrgContext } from "@/lib/org-scope";
import { PotentialConsumerCallout } from "@/components/potential-consumer-callout";
import { showsPanelSandboxHints } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { role } = await requireOrgContext();
  const sandboxHome = showsPanelSandboxHints(role);

  return (
    <div className="space-y-10">
      <PotentialConsumerCallout variant="home" />
      <HomeHero showSandboxShortcuts={sandboxHome} />

      {/* Tarjetas de acceso rápido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Clientes</CardTitle>
            <CardDescription>
              Directorio corporativo: empresa o persona física. Administra la información de tus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/empresas">Ir a clientes</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Documentos</CardTitle>
            <CardDescription>
              Sube PDFs, marca las áreas de firma y envía el flujo a tus clientes.
            </CardDescription>
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
            <CardTitle className="text-lg">Servidor Seguro</CardTitle>
            <CardDescription>
              Infraestructura blindada. Tus firmas y documentos están respaldados con alta seguridad.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}