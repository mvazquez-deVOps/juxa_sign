import Link from "next/link";

export const metadata = {
  title: "Primeros pasos",
};

const steps = [
  {
    n: 1,
    title: "Registrar un cliente en el proveedor",
    body: (
      <>
        En <Link href="/empresas">Clientes</Link> registra el titular que usarás con el proveedor de firma. Puede ser una{" "}
        <strong>empresa</strong> (razón social, RFC moral) o una <strong>persona física</strong> (nombre completo y RFC
        de persona física, según las reglas del proveedor). Sin este paso no hay Id. de cliente para firmantes ni
        documentos.
      </>
    ),
  },
  {
    n: 2,
    title: "Dar de alta firmantes",
    body: (
      <>
        En <Link href="/firmantes">Firmantes</Link> asocia las personas que firmarán, ligadas al cliente que creaste.
        Cada firmante debe existir también en el proveedor según el flujo que use tu organización.
      </>
    ),
  },
  {
    n: 3,
    title: "Subir un documento PDF",
    body: (
      <>
        En <Link href="/documentos/nuevo">Nuevo documento</Link> sube el PDF. El archivo queda vinculado al cliente y a
        la organización.
      </>
    ),
  },
  {
    n: 4,
    title: "Colocar marcas de firma en el visor",
    body: (
      <>
        Abre el documento, activa el modo de marcas y haz clic en el PDF con el visor al{" "}
        <strong>100 % de zoom</strong> para que las coordenadas coincidan con lo que espera el motor de firma.
      </>
    ),
  },
  {
    n: 5,
    title: "Asignar firmantes y enviar",
    body: (
      <>
        Usa <strong>Enviar a firmar</strong> en la ficha del documento: revisa asignación, orden si aplica y confirma el
        envío. Después puedes seguir el estado en <Link href="/envios">Envíos</Link>.
      </>
    ),
  },
  {
    n: 6,
    title: "Webhooks y configuración (administradores)",
    body: (
      <>
        Quien administre la organización puede revisar <Link href="/configuracion">Configuración</Link> para webhooks y
        ajustes del proveedor. No expongas credenciales en el navegador: todo sensible vive en el servidor.
      </>
    ),
  },
];

export default function AyudaPrimerosPasosPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Primeros pasos</h2>
        <p className="text-muted-foreground">
          Sigue este orden la primera vez. Empresa y persona física comparten el mismo camino; solo cambian los datos
          que registras como cliente.
        </p>
      </header>

      <ol className="space-y-8">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              {s.n}
            </span>
            <div className="min-w-0 space-y-2 border-b border-border pb-8 last:border-0 last:pb-0">
              <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
              <div className="text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline">
                {s.body}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Consumo de folios</p>
        <p className="mt-2">
          Algunos envíos descuentan folios de la cartera del usuario según el tipo de envío. Consulta{" "}
          <Link href="/folios" className="font-medium text-primary underline">
            Mis folios
          </Link>{" "}
          y, si aplica, <Link href="/folios/planes" className="font-medium text-primary underline">
            Planes de folios
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
