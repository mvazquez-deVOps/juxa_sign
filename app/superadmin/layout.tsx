import Link from "next/link";
import { requireSuperAdmin } from "@/lib/superadmin";
import { SuperadminSigningFlowCta } from "./superadmin-signing-flow-cta";

export const dynamic = "force-dynamic";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plataforma</h1>
          <p className="text-sm text-muted-foreground">
            Administración global (sin filtro por organización en estas vistas).
          </p>
        </div>
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          Volver al panel
        </Link>
      </div>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground">
        <Link href="/superadmin" className="hover:text-foreground">
          Resumen
        </Link>
        <Link href="/superadmin/organizaciones" className="hover:text-foreground">
          Organizaciones
        </Link>
        <Link href="/superadmin/folios" className="hover:text-foreground">
          Folios
        </Link>
        <Link href="/superadmin/lotes" className="hover:text-foreground">
          Lotes
        </Link>
        <Link href="/superadmin/uso" className="hover:text-foreground">
          Uso y clientes
        </Link>
        <Link href="/superadmin/prueba-envio-firma" className="hover:text-foreground">
          Prueba envío (local)
        </Link>
        <Link href="/flujo-producto" className="text-primary hover:text-primary/90">
          Guía firma / contrato
        </Link>
      </nav>

      <SuperadminSigningFlowCta />

      {children}
    </div>
  );
}
