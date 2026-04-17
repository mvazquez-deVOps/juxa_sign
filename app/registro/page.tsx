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

  return (
    <JuxaLoginShell topRight={themeToggle}>
      <div className="flex w-full flex-col">
        <div className={juxaLoginCardClass}>
          <div className="space-y-1">
            <h2 className={juxaLoginTitleClass}>Registro</h2>
            <p className={juxaLoginEyebrowClass}>Cuenta nueva en Juxa Sign</p>
          </div>
          <div className="mt-8">
            <RegistroForm />
          </div>
        </div>
      </div>
    </JuxaLoginShell>
  );
}
