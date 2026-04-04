import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Preguntas frecuentes",
};

type FaqItem = { q: string; a: ReactNode };

const faqs: FaqItem[] = [
  {
    q: "¿Tengo que registrar una empresa o puede ser persona física?",
    a: (
      <>
        Puede ser cualquiera de las dos. En el menú <strong>Clientes</strong> das de alta al titular ante el proveedor:
        empresa (razón social + RFC) o persona física (nombre completo y RFC de persona física, según validación del
        proveedor). El resto del flujo (firmantes, documentos, envío) es el mismo.
      </>
    ),
  },
  {
    q: "¿Por qué el visor del PDF pide zoom al 100 %?",
    a: "Las marcas de firma guardan coordenadas en píxeles respecto al tamaño mostrado. Si cambias el zoom después de colocarlas, la posición puede no coincidir con lo que espera el motor de firma. Deja el zoom en 100 % antes de marcar.",
  },
  {
    q: "¿Dónde veo el estado de un envío?",
    a: (
      <>
        En <Link href="/envios" className="font-medium text-primary underline">Envíos</Link> puedes listar documentos y,
        según tu rol, sincronizar el estado con el proveedor.
      </>
    ),
  },
  {
    q: "¿Qué diferencia hay entre Operador, Administrador y solo visualización?",
    a: (
      <>
        <strong>Administrador</strong>: gestiona equipo, API keys, folios de la org y más ajustes.{" "}
        <strong>Operador</strong> (y perfiles similares con permiso): crea clientes, documentos y envía a firma.{" "}
        <strong>Solo visualización</strong> consulta empresas, firmantes, documentos y envíos sin mutar ni enviar. Tu rol
        aparece en la barra lateral al iniciar sesión.
      </>
    ),
  },
  {
    q: "¿Qué son los folios?",
    a: (
      <>
        Son créditos de uso asociados a envíos según el tipo de firma. Revisa saldo y movimientos en{" "}
        <Link href="/folios" className="font-medium text-primary underline">Mis folios</Link>. Los administradores pueden
        acreditar folios a miembros del equipo desde configuración.
      </>
    ),
  },
  {
    q: "¿Para qué sirve el webhook?",
    a: "El proveedor puede notificar cambios de estado del documento a tu aplicación. Configura la URL y el secreto en Configuración y revisa los eventos recibidos para depuración.",
  },
  {
    q: "Puedo probar sin base de datos PostgreSQL",
    a: (
      <>
        En desarrollo, con <code className="rounded bg-muted px-1 text-xs">JUXA_DATA_STORE=memory</code> el panel puede
        usar datos en memoria y DIGID simulado. No uses eso en producción ni con datos reales sensibles.
      </>
    ),
  },
  {
    q: "¿Dónde está la documentación técnica?",
    a: (
      <>
        En el repositorio, carpeta <code className="rounded bg-muted px-1 text-xs">docs/</code> (API DIGID, despliegue,
        runbook). La guía de pantalla está en este <Link href="/ayuda" className="font-medium text-primary underline">Centro de ayuda</Link> y en{" "}
        <Link href="/flujo-producto" className="font-medium text-primary underline">Flujo de producto</Link>.
      </>
    ),
  },
];

function FaqDetails({ item }: { item: FaqItem }) {
  return (
    <details className="group rounded-lg border border-border bg-card px-4 py-3 shadow-sm open:shadow-md">
      <summary className="cursor-pointer list-none font-medium text-foreground outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-2">
          <span>{item.q}</span>
          <span className="shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </span>
      </summary>
      <div className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_code]:text-xs">
        {item.a}
      </div>
    </details>
  );
}

export default function AyudaFaqPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Preguntas frecuentes</h2>
        <p className="text-muted-foreground">
          Respuestas cortas. Toca cada pregunta para expandirla.
        </p>
      </header>
      <div className="space-y-3">
        {faqs.map((item) => (
          <FaqDetails key={item.q} item={item} />
        ))}
      </div>
    </article>
  );
}
