import fs from "fs";
import path from "path";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function PruebaE2EPage() {
  const filePath = path.join(process.cwd(), "docs", "checklist-pruebas-firma.md");
  let body: string;
  try {
    body = fs.readFileSync(filePath, "utf8");
  } catch {
    body = "No se encontró docs/checklist-pruebas-firma.md en el proyecto.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guía de prueba E2E</h1>
          <p className="text-muted-foreground text-sm">
            Contenido de <code className="text-xs">docs/checklist-pruebas-firma.md</code>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-xl border bg-card p-4 text-xs leading-relaxed whitespace-pre-wrap">
        {body}
      </pre>
    </div>
  );
}
