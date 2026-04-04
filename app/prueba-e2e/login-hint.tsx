import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Recordatorio breve según variables de entorno (sin duplicar el checklist largo).
 */
export function PruebaE2ELoginHint() {
  const demoPw = Boolean(process.env.DEMO_PASSWORD?.trim());
  const memory = process.env.JUXA_DATA_STORE?.trim().toLowerCase() === "memory";
  const hasDemoSecret = Boolean(process.env.DEMO_AUTH_SECRET?.trim());
  const hasOrg = Boolean(process.env.DEMO_ORGANIZATION_ID?.trim());
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim());

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Antes del checklist: acceso al panel</CardTitle>
        <CardDescription>
          Debes poder abrir el resto de pantallas.{" "}
          <Link href="/login" className="font-medium text-primary underline">
            Ir a /login
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {demoPw ? (
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Modo demo activo</strong> (<code className="text-xs">DEMO_PASSWORD</code>
              ). Entra con la contraseña compartida.
            </li>
            {!hasDemoSecret ? (
              <li className="text-destructive">
                Falta <code className="text-xs">DEMO_AUTH_SECRET</code> — el servidor no puede firmar la cookie.
              </li>
            ) : null}
            {!memory && !hasOrg ? (
              <li className="text-amber-700 dark:text-amber-200">
                Falta <code className="text-xs">DEMO_ORGANIZATION_ID</code> — las acciones del panel fallarán hasta
                configurarlo (salvo <code className="text-xs">JUXA_DATA_STORE=memory</code>).
              </li>
            ) : null}
            {memory ? (
              <li>
                <code className="text-xs">JUXA_DATA_STORE=memory</code>: org puede venir del almacén en memoria.
              </li>
            ) : null}
          </ul>
        ) : (
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">NextAuth</strong>: correo y contraseña de un usuario en la base.
            </li>
            {!hasAuthSecret ? (
              <li className="text-destructive">
                Falta <code className="text-xs">AUTH_SECRET</code> — las sesiones no funcionarán.
              </li>
            ) : (
              <li>
                <code className="text-xs">AUTH_SECRET</code> definida (valor no mostrado).
              </li>
            )}
            <li>
              Usuario inicial: <code className="text-xs">npm run db:seed</code> con{" "}
              <code className="text-xs">ADMIN_EMAIL</code> / <code className="text-xs">ADMIN_PASSWORD</code> en{" "}
              <code className="text-xs">.env</code>.
            </li>
          </ul>
        )}
        <p className="pt-1 text-xs">
          Validación: <code className="rounded bg-muted px-1">npm run check:env</code>
          {" · "}
          corte producción: <code className="rounded bg-muted px-1">npm run check:env:production</code>
        </p>
      </CardContent>
    </Card>
  );
}
