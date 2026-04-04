import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DocumentoNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Documento no encontrado</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ese enlace no corresponde a un documento de tu organización, o ya no está disponible. Si trabajas con{" "}
          <code className="rounded bg-muted px-1 text-xs">JUXA_DATA_STORE=memory</code>, cada reinicio del servidor borra
          clientes y documentos: los marcadores o pestañas con un id antiguo dejarán de funcionar.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Abre siempre el archivo desde <span className="text-foreground">Documentos</span> en la sesión actual, o usa
          PostgreSQL sin modo memoria para que los ids persistan.
        </p>
      </div>
      <Button asChild>
        <Link href="/documentos">Ir a documentos</Link>
      </Button>
    </div>
  );
}
