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
    q: "¿Dónde veo el estado de un envío?",
    a: (
      <>
        En nuestra <Link href="/envios" className="font-medium text-primary">bandeja de envíos</Link> puedes listar documentos y,
        según tu rol, sincronizar el estado con el proveedor.
      </>
    ),
  },
  {
    q: "¿Qué diferencia hay entre Operador, Administrador y solo visualización?",
    a: (
      <>
        <strong>Administrador</strong>: gestiona equipo, API keys, folios de la org y más ajustes. <br />
        <strong>Operador</strong>: crea clientes, documentos y envía a firma. <br />
        <strong>Solo visualización</strong> consulta empresas, firmantes, documentos y envíos sin mutar ni enviar.
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
    q: "¿Qué es un KYC?",
    a: (
      <>
        <strong>KYC</strong> significa <em>Know Your Customer</em> (conocimiento del cliente): prácticas para verificar la
        identidad de una persona antes de operaciones sensibles. En el flujo de envío a firma, al asignar firmantes puedes
        marcar si aplica verificación de identidad según cada caso; esa información se sincroniza con el proveedor junto
        con la asignación.
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
          Toca cada pregunta para una respuesta detallada .
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
