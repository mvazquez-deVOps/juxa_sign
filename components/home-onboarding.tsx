import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Counts = {
  companies: number;
  signatories: number;
  documents: number;
  placements: number;
};

function nextRecommendation(c: Counts): { title: string; body: string; href: string; cta: string } {
  if (c.companies === 0) {
    return {
      title: "Siguiente paso: registrar un cliente",
      body: "Sin Id. de cliente del proveedor no puedes crear firmantes ni documentos. Puede ser empresa o persona física; empieza en Clientes.",
      href: "/empresas/nueva",
      cta: "Registrar cliente",
    };
  }
  if (c.signatories === 0) {
    return {
      title: "Siguiente paso: dar de alta firmantes",
      body: "Necesitas al menos un firmante por cliente (empresa o persona física) para asignar y enviar a firmar.",
      href: "/firmantes",
      cta: "Ir a firmantes",
    };
  }
  if (c.documents === 0) {
    return {
      title: "Siguiente paso: subir un documento",
      body: "Crea el PDF en el proveedor desde el panel y luego coloca las marcas de firma en el visor.",
      href: "/documentos/nuevo",
      cta: "Nuevo documento",
    };
  }
  if (c.placements === 0) {
    return {
      title: "Siguiente paso: colocar marcas de firma",
      body: "Abre un documento, activa “Marcar firma” y haz clic en el PDF con zoom al 100 %.",
      href: "/documentos",
      cta: "Ver documentos",
    };
  }
  return {
    title: "Siguiente paso: asignar y enviar a firmar",
    body: "En la ficha Enviar sincronizas firmantes con el proveedor, envías a firma y obtienes las URLs.",
    href: "/envios",
    cta: "Envíos y estado",
  };
}

export function HomeOnboarding({
  counts,
  showSandboxSection,
}: {
  counts: Counts;
  /** Checklist sandbox / E2E (p. ej. cuando el panel corre en modo memoria). */
  showSandboxSection: boolean;
}) {
  const rec = nextRecommendation(counts);
  const stepRows = [
    { ok: counts.companies > 0, label: "Cliente registrado en el proveedor (empresa o persona física)", href: "/empresas" },
    { ok: counts.signatories > 0, label: "Firmantes dados de alta", href: "/firmantes" },
    { ok: counts.documents > 0, label: "Al menos un documento", href: "/documentos" },
    { ok: counts.placements > 0, label: "Marcas de firma en el visor", href: "/documentos" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{rec.title}</CardTitle>
          <CardDescription className="text-foreground/80">{rec.body}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={rec.href}>
              {rec.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {showSandboxSection ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Progreso en el sandbox</CardTitle>
            <CardDescription>
              Checklist rápido según tu base local. Más contexto en la guía E2E y en el{" "}
              <Link href="/flujo-producto" className="text-primary underline">
                flujo de producto
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              {stepRows.map((row) => (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="flex items-start gap-2 rounded-md py-1 hover:bg-muted/60"
                  >
                    {row.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={row.ok ? "text-muted-foreground" : "font-medium"}>{row.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/prueba-e2e">Checklist E2E completo</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/configuracion">Configuración / webhook</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
