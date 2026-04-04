"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptOrganizationInvite, type AcceptInviteState } from "@/app/actions/team";
import {
  juxaLoginCardClass,
  juxaLoginEyebrowClass,
  juxaLoginInputClass,
  juxaLoginLabelClass,
  juxaLoginMutedClass,
  juxaLoginPrimaryButtonClass,
  juxaLoginTitleClass,
} from "@/components/auth-page-styles";
import { ActionErrorDetails } from "@/components/action-error-details";
import { JuxaBrand } from "@/components/juxa-brand";
import { JuxaLoginShell } from "@/components/juxa-login-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initial: AcceptInviteState | null = null;

export function InvitacionAcceptClient({
  email,
  token,
  memoryMode,
  organizationName,
  roleLabel,
}: {
  email: string;
  token: string;
  memoryMode: boolean;
  organizationName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(acceptOrganizationInvite, initial);

  useEffect(() => {
    if (state?.message) {
      if (state.ok) {
        toast.success(state.message);
        router.push("/login");
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router]);

  return (
    <JuxaLoginShell
      topRight={<ThemeToggle className="text-zinc-400 hover:bg-white/10 hover:text-white" />}
      heroTitle={
        <h1 className="text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl">
          <span className="font-semibold">Únete al equipo</span>
          <span className="text-zinc-500"> — activa tu cuenta en Juxa Sign.</span>
        </h1>
      }
      heroLead={
        <p>
          Define una contraseña segura; después podrás iniciar sesión con tu correo y acceder al panel de tu
          organización.
        </p>
      }
    >
      <div className={juxaLoginCardClass}>
        <JuxaBrand variant="loginPanel" className="mb-8" memoryMode={memoryMode} />
        <div className="space-y-1">
          <h2 className={juxaLoginTitleClass}>Crear acceso</h2>
          <p className={juxaLoginEyebrowClass}>Contraseña para tu usuario</p>
          <p className={cn(juxaLoginMutedClass, "mt-4")}>
            Correo asignado:{" "}
            <span className="font-medium text-zinc-200" title={email}>
              {email}
            </span>
          </p>
          <p className={cn(juxaLoginMutedClass, "mt-2")}>
            Organización: <span className="font-medium text-zinc-200">{organizationName}</span>
            {" · "}
            Rol en el panel: <span className="font-medium text-zinc-200">{roleLabel}</span>
          </p>
        </div>
        <form action={formAction} className="mt-8 space-y-5">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-2">
            <Label htmlFor="password" className={juxaLoginLabelClass}>
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={cn("h-11", juxaLoginInputClass)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className={juxaLoginLabelClass}>
              Confirmar contraseña
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={cn("h-11", juxaLoginInputClass)}
            />
          </div>
          <Button type="submit" className={juxaLoginPrimaryButtonClass} disabled={pending}>
            {pending ? "Creando cuenta…" : "Crear cuenta e iniciar sesión"}
          </Button>
          <ActionErrorDetails failed={state != null && !state.ok} message={state?.message} />
        </form>
      </div>
    </JuxaLoginShell>
  );
}
