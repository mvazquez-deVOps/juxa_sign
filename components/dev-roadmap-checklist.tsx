import Link from "next/link";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  devRoadmapCurrentStep,
  devRoadmapPipelineSteps,
  devRoadmapWorkWithoutDb,
  productionPhases,
  type DevRoadmapItemStatus,
} from "@/lib/dev-roadmap-phases";
import { computeProjectProgress } from "@/lib/mvp-criteria";
import { cn } from "@/lib/utils";

function statusLabel(s: DevRoadmapItemStatus): string {
  if (s === "done") return "Completado";
  if (s === "partial") return "En progreso";
  return "Pendiente";
}

function StatusIcon({ status }: { status: DevRoadmapItemStatus }) {
  if (status === "done") {
    return (
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-500"
        aria-hidden
      />
    );
  }
  if (status === "partial") {
    return (
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500"
        aria-hidden
      />
    );
  }
  return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

function ChecklistRow({ text, status }: { text: string; status: DevRoadmapItemStatus }) {
  return (
    <li
      className="flex items-start gap-2 rounded-md py-1 text-sm"
      aria-label={`${statusLabel(status)}: ${text}`}
    >
      <StatusIcon status={status} />
      <span
        className={cn(
          "leading-relaxed",
          status === "done" && "text-muted-foreground",
          status === "partial" && "text-foreground/90",
          status === "todo" && "font-medium text-foreground",
        )}
      >
        {text}
      </span>
    </li>
  );
}

export function DevRoadmapChecklist() {
  const { percent } = computeProjectProgress();

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Dónde vamos</CardTitle>
          <CardDescription className="text-foreground/85">{devRoadmapCurrentStep.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{devRoadmapCurrentStep.body}</p>
          <div
            className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-primary/20 bg-background/60 px-3 py-3 text-center text-xs"
            role="list"
            aria-label="Pipeline de entornos"
          >
            {devRoadmapPipelineSteps.map((step, i) => (
              <span key={step.id} className="flex flex-wrap items-center gap-2">
                {i > 0 ? <span className="text-muted-foreground">→</span> : null}
                <span
                  role="listitem"
                  className={cn(
                    "rounded-md px-2 py-1 font-medium shadow-sm",
                    step.kind === "current" &&
                      "bg-primary text-primary-foreground ring-2 ring-primary/30",
                    step.kind === "done" && "bg-muted text-foreground",
                    step.kind === "upcoming" && "bg-muted/50 text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <CardTitle className="text-lg">Proyecto (ponderado, complementario)</CardTitle>
            <span className="text-2xl font-bold tabular-nums text-primary">{percent}%</span>
          </div>
          <CardDescription>
            Incluye código y criterios de entrega; detalle en{" "}
            <Link href="/admin/proyecto" className="text-primary underline">
              Avance del proyecto
            </Link>{" "}
            y{" "}
            <code className="rounded bg-muted px-1 text-xs">lib/mvp-criteria.ts</code>. No sustituye el estado del
            entorno (Postgres, DIGID T/P, despliegue).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={percent} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan hacia producción (0–7)</CardTitle>
          <CardDescription>
            Cada salto: smoke en{" "}
            <Link href="/api/health" className="text-primary underline">
              /api/health
            </Link>
            , prueba de envío con{" "}
            <code className="text-xs">docs/checklist-pruebas-firma.md</code> y webhooks en configuración.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {productionPhases.map((phase) => (
            <div key={phase.id} className="space-y-2 border-b border-border pb-5 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground">{phase.title}</p>
              <ul className="space-y-1">
                {phase.items.map((item, idx) => (
                  <ChecklistRow key={`${phase.id}-${idx}`} text={item.text} status={item.status} />
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-dashed border-teal-500/30 bg-teal-500/[0.04] dark:bg-teal-500/[0.06]">
        <CardHeader>
          <CardTitle className="text-lg">En esta fase (sin base de datos persistente)</CardTitle>
          <CardDescription>
            Mejoras que puedes hacer con <code className="text-xs">JUXA_DATA_STORE=memory</code> y CI actual: pulir el
            flujo para el equipo antes de Postgres + staging.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {devRoadmapWorkWithoutDb.map((item, idx) => (
              <ChecklistRow key={`no-db-${idx}`} text={item.text} status={item.status} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
