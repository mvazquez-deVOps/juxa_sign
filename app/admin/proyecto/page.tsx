import Link from "next/link";
import { CheckCircle2, CircleDot, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PROJECT_CRITERIA,
  computeProjectProgress,
  projectCriteriaPendingFirst,
  type ProjectBlockSummary,
  type ProjectCriterion,
} from "@/lib/mvp-criteria";
import { requireAdminContext } from "@/lib/org-scope";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatusIcon({ status }: { status: ProjectCriterion["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "partial") return <CircleDot className="h-4 w-4 shrink-0 text-amber-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function narrativeLaggingBlocks(byBlock: ProjectBlockSummary[]): string {
  const lagging = byBlock
    .filter((b) => b.percent < 100)
    .sort((a, b) => a.percent - b.percent)
    .map((b) => `${b.block} (${b.percent}%)`);
  if (lagging.length === 0) return "Todos los bloques al 100%.";
  return lagging.join(" · ");
}

export default async function AdminProyectoPage() {
  await requireAdminContext();
  const { percent, earnedWeight, totalWeight, byBlock } = computeProjectProgress(PROJECT_CRITERIA);
  const nextUp = projectCriteriaPendingFirst(PROJECT_CRITERIA, 8);
  const entrega = byBlock.find((b) => b.block === "Entrega");
  const productoCodigo = byBlock.filter((b) => b.block !== "Entrega");
  const avgProducto =
    productoCodigo.length > 0
      ? Math.round(
          (productoCodigo.reduce((a, b) => a + b.percent, 0) / productoCodigo.length) * 10,
        ) / 10
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avance del proyecto</h1>
          <p className="mt-2 text-muted-foreground">
            Vista para <span className="font-medium text-foreground">administradores</span> de la organización: mezcla
            lo ya implementado en código con los hitos para llevar Juxa Sign a producción. Fuente de datos:{" "}
            <code className="rounded bg-muted px-1 text-xs">lib/mvp-criteria.ts</code> (criterios y pesos).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/hoja-de-ruta-devs">Hoja de ruta (devs)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Inicio</Link>
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Cómo va todo el proyecto</CardTitle>
          <CardDescription>Lectura rápida antes del detalle numérico.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            El <strong className="text-foreground">porcentaje global ponderado es {percent}%</strong> ({earnedWeight.toFixed(1)}{" "}
            de {totalWeight} puntos). Resume el <strong className="text-foreground">producto en el repo</strong> (panel,
            seguridad, SaaS, automatización) y la carpeta <strong className="text-foreground">Entrega</strong> (Postgres en
            prod, DIGID real, webhook HTTPS, PDFs persistentes, pasarela de cobro, política sin demo).
          </p>
          <p>
            El código del panel y flujos principales rondan un <strong className="text-foreground">{avgProducto}%</strong> de
            avance en bloques distintos a Entrega (promedio simple de esos bloques). La{" "}
            <strong className="text-foreground">Entrega</strong> a producción está en{" "}
            <strong className="text-foreground">{entrega?.percent ?? 0}%</strong>: depende de infraestructura, contrato con
            DIGID y decisiones de negocio, no solo de commits.
          </p>
          <p className="text-xs">
            Bloques por debajo del 100% (prioridad visual): <span className="text-foreground">{narrativeLaggingBlocks(byBlock)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen global</CardTitle>
          <CardDescription>
            Peso ganado {earnedWeight.toFixed(1)} / {totalWeight} puntos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">{percent}%</span>
            <span className="text-sm text-muted-foreground">
              Objetivo de producto + entrega: acercarse a 100% cuando código y operación estén alineados.
            </span>
          </div>
          <Progress value={percent} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por bloque</CardTitle>
          <CardDescription>Incluye el bloque Entrega (go-live).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {byBlock.map((b) => (
            <div key={b.block} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {b.block}
                  {b.block === "Entrega" ? (
                    <span className="ml-2 font-normal text-muted-foreground">(infra, proveedor, cobro)</span>
                  ) : null}
                </span>
                <span className="tabular-nums text-muted-foreground">{b.percent}%</span>
              </div>
              <Progress value={b.percent} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximos a cerrar</CardTitle>
          <CardDescription>Ítems en por hacer o parcial con mayor peso.</CardDescription>
        </CardHeader>
        <CardContent>
          {nextUp.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No quedan criterios abiertos en la lista. Si falta algo operativo, añádelo en{" "}
              <code className="rounded bg-muted px-1 text-xs">lib/mvp-criteria.ts</code> o revisa{" "}
              <Link href="/hoja-de-ruta-devs" className="text-primary underline-offset-4 hover:underline">
                Hoja de ruta (devs)
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {nextUp.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <StatusIcon status={c.status} />
                  <span>
                    <span className="font-medium text-foreground">{c.label}</span>
                    <span className="text-muted-foreground"> — {c.block} · peso {c.weight}</span>
                    {c.evidence ? (
                      <span className="block text-xs text-muted-foreground">{c.evidence}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturación y planes en el panel</CardTitle>
          <CardDescription>Hoy: catálogo y cartera sin pasarela automática.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Los planes visibles y la acreditación manual están en{" "}
            <Link href="/folios/planes" className="text-primary underline-offset-4 hover:underline">
              Planes de folios
            </Link>{" "}
            y en plataforma. El criterio de <strong className="text-foreground">Entrega</strong> “Cobro en línea” marca
            cuándo exista integración tipo Stripe y acreditación automática.
          </p>
          <p>
            Límites de equipo:{" "}
            <Link href="/configuracion/equipo" className="text-primary underline-offset-4 hover:underline">
              Configuración → Equipo
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos los criterios</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {PROJECT_CRITERIA.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-start gap-3 px-3 py-3 text-sm",
                  c.status === "done" && "bg-emerald-500/5",
                  c.status === "partial" && "bg-amber-500/5",
                )}
              >
                <StatusIcon status={c.status} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.block} · peso {c.weight}
                    {c.evidence ? ` · ${c.evidence}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
