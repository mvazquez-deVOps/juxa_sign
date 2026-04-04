import Link from "next/link";
import { Suspense } from "react";
import {
  juxaLoginCardClass,
  juxaLoginEyebrowClass,
  juxaLoginLinkClass,
  juxaLoginMutedClass,
  juxaLoginPrimaryButtonClass,
  juxaLoginTitleClass,
} from "@/components/auth-page-styles";
import { JuxaBrand } from "@/components/juxa-brand";
import { JuxaLoginShell } from "@/components/juxa-login-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { CredentialsLoginForm } from "./credentials-login";
import { LoginTestHint } from "./login-test-hint";

type Props = {
  searchParams: Promise<{ error?: string; from?: string; misconfig?: string; reason?: string }>;
};

const codeBox = "rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300";

export default async function LoginPage({ searchParams }: Props) {
  const { error, from, misconfig, reason } = await searchParams;
  const redirect = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
  const demoMode = Boolean(process.env.DEMO_PASSWORD?.trim());
  const memoryStore = process.env.JUXA_DATA_STORE?.trim().toLowerCase() === "memory";
  const demoOrgMissing =
    demoMode &&
    Boolean(process.env.DEMO_AUTH_SECRET?.trim()) &&
    !memoryStore &&
    !process.env.DEMO_ORGANIZATION_ID?.trim();

  const themeToggle = (
    <ThemeToggle className="text-zinc-400 hover:bg-white/10 hover:text-white" />
  );

  const sesionInvalidaBanner =
    reason === "sesion-invalida" ? (
      <p
        className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
        role="alert"
      >
        Tu sesión apuntaba a una organización que ya no existe (típico tras reiniciar el servidor con datos en
        memoria). Vuelve a iniciar sesión para continuar.
      </p>
    ) : null;

  if (!demoMode) {
    return (
      <JuxaLoginShell topRight={themeToggle}>
        <div className="flex w-full flex-col">
          <JuxaBrand
            variant="loginPanel"
            className="mb-8"
            subtitle={
              memoryStore ? "Acceso al panel · datos en memoria (reinicio = datos nuevos)" : undefined
            }
          />
          <div className={juxaLoginCardClass}>
            {sesionInvalidaBanner}
            <div className="space-y-1">
              <h2 className={juxaLoginTitleClass}>Bienvenido</h2>
              <p className={juxaLoginEyebrowClass}>Juxa Sign · acceso al panel</p>
              <p className={cn(juxaLoginMutedClass, "mt-4")}>
                {memoryStore
                  ? "En memoria hay cuatro cuentas de ejemplo en la misma organización: administrador (ADMIN), operador (OPERATOR, vista producto en inicio), pruebas (SANDBOX, checklist sandbox y E2E en inicio) y solo visualización (VIEWER). NextAuth valida correo y contraseña; los datos no persisten si reinicias el servidor."
                  : "Cada usuario pertenece a una organización (tenant). Invitaciones desde Configuración → Equipo o cuentas del seed (ADMIN, OPERATOR, opcional SANDBOX, USER y VIEWER)."}
              </p>
            </div>
            <div className="mt-8">
              <LoginTestHint demoMode={false} />
              <Suspense fallback={<p className={juxaLoginMutedClass}>Cargando…</p>}>
                <CredentialsLoginForm />
              </Suspense>
            </div>
          </div>
        </div>
      </JuxaLoginShell>
    );
  }

  return (
    <JuxaLoginShell topRight={themeToggle}>
      <div className="flex w-full flex-col">
        <JuxaBrand variant="loginPanel" className="mb-8" />
        <div className={juxaLoginCardClass}>
          {sesionInvalidaBanner}
          <div className="space-y-1">
            <h2 className={juxaLoginTitleClass}>Acceso demo</h2>
            <p className={juxaLoginEyebrowClass}>Entorno de prueba</p>
            <p className={cn(juxaLoginMutedClass, "mt-4 [&_code]:font-mono")}>
              Contraseña compartida y cookie firmada. En <code className={codeBox}>.env</code> necesitas{" "}
              <code className={codeBox}>DEMO_AUTH_SECRET</code> y <code className={codeBox}>DEMO_ORGANIZATION_ID</code>{" "}
              (id de <code className={codeBox}>Organization</code> en Postgres), salvo{" "}
              <code className={codeBox}>JUXA_DATA_STORE=memory</code>. Sin demo: quita{" "}
              <code className={codeBox}>DEMO_PASSWORD</code> y usa correo y contraseña (NextAuth).
            </p>
          </div>
          <div className="mt-8">
            <LoginTestHint demoMode />
            {misconfig ? (
              <p className="mb-4 rounded-xl border border-red-500/35 bg-red-950/40 p-3 text-sm text-red-200">
                Configuración incompleta: con <code className="font-mono text-xs">DEMO_PASSWORD</code> debes definir{" "}
                <code className="font-mono text-xs">DEMO_AUTH_SECRET</code> (p. ej.{" "}
                <code className="font-mono text-xs">openssl rand -hex 32</code>).
                {!memoryStore ? (
                  <>
                    {" "}
                    También <code className="font-mono text-xs">DEMO_ORGANIZATION_ID</code> salvo modo memoria.
                  </>
                ) : null}
              </p>
            ) : null}
            {demoOrgMissing ? (
              <p className="mb-4 rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 text-sm text-amber-100">
                Falta <code className="font-mono text-xs">DEMO_ORGANIZATION_ID</code>: sin él podrás entrar pero las
                acciones del panel fallarán. Copia el <code className="font-mono text-xs">id</code> de una organización
                desde Prisma Studio o el seed.
              </p>
            ) : null}
            <form action="/api/demo-auth" method="post" className="space-y-5">
              <input type="hidden" name="redirect" value={redirect} />
              <div className="space-y-2">
                <Label htmlFor="password" className={juxaLoginEyebrowClass}>
                  Contraseña
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required={!misconfig && !demoOrgMissing}
                  disabled={!!misconfig || demoOrgMissing}
                  placeholder="••••••••"
                  className={cn(
                    "h-11 border-white/12 bg-black/35 text-white placeholder:text-zinc-600",
                    "focus-visible:border-[#2ABDA8]/45 focus-visible:ring-2 focus-visible:ring-[#2ABDA8]/15",
                    "rounded-xl disabled:opacity-50",
                    error && "border-red-500/60",
                  )}
                />
              </div>
              {error ? <p className="text-sm text-red-300">Contraseña incorrecta. Vuelve a intentar.</p> : null}
              <Button
                type="submit"
                className={juxaLoginPrimaryButtonClass}
                disabled={!!misconfig || demoOrgMissing}
              >
                Acceder
              </Button>
            </form>
            <p className={cn("mt-6 text-center text-xs", juxaLoginMutedClass)}>
              <Link href="/" className={juxaLoginLinkClass}>
                Volver al inicio
              </Link>{" "}
              <span className="text-zinc-600">(requiere sesión si la demo está protegida)</span>
            </p>
          </div>
        </div>
      </div>
    </JuxaLoginShell>
  );
}
