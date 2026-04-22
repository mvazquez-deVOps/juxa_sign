import {
  juxaLoginCardClass,
  juxaLoginEyebrowClass,
  juxaLoginTitleClass,
  juxaPublicThemeToggleClass,
} from "@/components/auth-page-styles";
import { JuxaLoginShell } from "@/components/juxa-login-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { RegistroForm } from "./registro-form";

export const dynamic = "force-dynamic";

export default function RegistroPage() {
  const themeToggle = <ThemeToggle className={juxaPublicThemeToggleClass} />;

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
