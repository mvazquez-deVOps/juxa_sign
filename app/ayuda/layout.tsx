import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AyudaNav } from "@/components/ayuda-nav";

export default function AyudaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Centro de ayuda</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Juxa Sign</h1>
        <p className="mt-2 text-muted-foreground">
          Guías claras para usar la plataforma de firma electrónica. Documentación orientada a tareas, como en los
          centros de ayuda de producto.
        </p>
      </div>
      <AyudaNav />
      {children}
    </div>
  );
}
