import Link from "next/link";
import { Building2, FileText, Users } from "lucide-react";
import { dbSuperAdminDashboardCounts } from "@/lib/data/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuperadminHomePage() {
  const counts = await dbSuperAdminDashboardCounts();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizaciones</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{counts.organizations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{counts.users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{counts.companies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{counts.documents}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding de otra organización o equipo</CardTitle>
          <CardDescription className="text-pretty">
            Arriba tienes los botones del <span className="font-medium text-foreground">flujo de firma de contrato</span> en
            tu org actual. Para una org nueva: <span className="font-medium">/registro</span>. Luego{" "}
            <span className="font-medium">Folios</span> (acreditar al que enviará),{" "}
            <span className="font-medium">Configuración → Equipo</span> (invitación),{" "}
            <span className="font-medium">/invitacion/…</span> y el mismo flujo Clientes → Firmantes → Documento → Enviar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/flujo-producto">Guía firma / contrato</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/superadmin/folios">Folios</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/superadmin/organizaciones">Organizaciones</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/registro">Registro (nueva org)</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Cuotas y folios</CardTitle>
          <CardDescription>
            Los límites por organización (usuarios, envíos al mes, política de folio premium) se configuran en cada
            organización. La aplicación automática de esas cuotas en el flujo de envío puede activarse en una siguiente
            iteración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/superadmin/organizaciones">Ver organizaciones</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
