import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/lib/org-scope";
import { isPanelReadOnlyRole } from "@/lib/roles";

type Variant = "home" | "folios" | "planes";

/**
 * Rubro unificado: rol VIEWER = consulta del panel + acercamiento comercial (explorar planes, solicitar activación).
 */
export async function PotentialConsumerCallout({ variant }: { variant: Variant }) {
  const { role } = await requireOrgContext();
  if (!isPanelReadOnlyRole(role)) return null;

  if (variant === "home") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm">
        <p className="font-medium text-foreground">Solo visualización · potencial consumidor</p>
        <p className="mt-2 text-muted-foreground">
          Exploras el panel con el mismo tipo de cuenta que usamos para demos y compras: ves clientes, firmantes,
          documentos y envíos. Para subir PDF, marcar firmas o enviar a firma, un administrador de tu organización
          puede asignarte el rol de operador o consumidor de folios. Para conocer paquetes y precios, revisa los
          planes. La guía de uso está en{" "}
          <Link href="/ayuda" className="font-medium text-primary underline">
            Ayuda
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ayuda">Centro de ayuda</Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href="/folios/planes">Ver planes</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/folios">Ver mi saldo</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "folios") {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Mismo rubro: visor y potencial consumidor</p>
        <p className="mt-1">
          Tu saldo puede quedar en cero hasta que un administrador te acredite folios o te cambie a consumidor
          activo. Mientras tanto, revisa el catálogo y solicita por los canales de tu empresa la activación
          comercial u operativa.
        </p>
        <Button className="mt-3" variant="outline" size="sm" asChild>
          <Link href="/folios/planes">Explorar planes y precios</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">Catálogo para potenciales consumidores</p>
      <p className="mt-1 text-muted-foreground">
        Estás viendo los mismos planes que el resto de la organización. La compra en línea se integrará más adelante;
        hoy puedes usar esta vista para evaluar volumen y precio, y solicitar a un administrador la acreditación o
        el cambio de rol que necesites.
      </p>
    </div>
  );
}
