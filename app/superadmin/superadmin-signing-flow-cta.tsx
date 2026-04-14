import Link from "next/link";
import { Signature, FileText, PenLine, Send, Users, Building2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CTA visible en todas las vistas /superadmin: el flujo de firma de contratos se opera en el panel por organización.
 */
export function SuperadminSigningFlowCta() {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Signature className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            Firma de contratos y documentos
          </p>
          <p className="text-sm text-muted-foreground">
            Plataforma es administración global (orgs, folios, lotes). Para registrar el cliente en DIGID, firmantes,
            subir el PDF, marcar y <strong className="font-medium text-foreground">enviar a firmar</strong>, usa el panel
            principal con <strong className="font-medium text-foreground">la misma sesión</strong> (tu organización en
            Juxa Sign).
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="default" asChild>
          <Link href="/flujo-producto">
            <Map className="mr-1.5 h-3.5 w-3.5" />
            Guía del flujo (paso a paso)
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/empresas/nueva">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Nuevo cliente
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/firmantes">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Firmantes
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/documentos/nuevo">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Nuevo documento
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/documentos">
            <PenLine className="mr-1.5 h-3.5 w-3.5" />
            Documentos (visor y marcas)
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/envios">
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Envíos
          </Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/pruebas-panel">Pruebas y mapa</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/superadmin/prueba-envio-firma">Laboratorio: PDF + correo + firma</Link>
        </Button>
      </div>
    </div>
  );
}
