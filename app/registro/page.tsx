import Link from "next/link";
import {
  juxaLoginCardClass,
  juxaLoginEyebrowClass,
  juxaLoginMutedClass,
  juxaLoginTitleClass,
} from "@/components/auth-page-styles";
import { JuxaBrand } from "@/components/juxa-brand";
import { JuxaLoginShell } from "@/components/juxa-login-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { RegistroForm } from "./registro-form";

export const dynamic = "force-dynamic";

export default function RegistroPage() {
  const demoMode = Boolean(process.env.DEMO_PASSWORD?.trim());
  const themeToggle = (
    <ThemeToggle className="text-zinc-400 hover:bg-white/10 hover:text-white" />
  );

  if (demoMode) {
    return (
      <JuxaLoginShell topRight={themeToggle}>
        <div className="flex w-full flex-col">
          <JuxaBrand variant="loginPanel" className="mb-8" />
          <div className={juxaLoginCardClass}>
            <h2 className={juxaLoginTitleClass}>Registro no disponible en demo</h2>
            <p className={cn(juxaLoginMutedClass, "mt-4")}>
              En modo demo el acceso es por contraseña compartida. Para probar el alta self-service, desactiva{" "}
              <code className="rounded bg-muted px-1 text-xs">DEMO_PASSWORD</code> en <code className="rounded bg-muted px-1 text-xs">.env</code>.
            </p>
            <p className={cn("mt-6 text-sm", juxaLoginMutedClass)}>
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Volver al acceso demo
              </Link>
            </p>
          </div>
        </div>
      </JuxaLoginShell>
    );
  }

  return (
    <JuxaLoginShell topRight={themeToggle}>
      <div className="flex w-full flex-col">
        <div className={juxaLoginCardClass}>
          <div className="space-y-1">
            <h2 className={juxaLoginTitleClass}>Registro</h2>
            <p className={juxaLoginEyebrowClass}>Organización nueva en Juxa Sign</p>
          </div>
          <div className="mt-8">
            <RegistroForm />
          </div>
        </div>
      </div>
    </JuxaLoginShell>
  );
}
