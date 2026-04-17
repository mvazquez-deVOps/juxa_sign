"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import {
  juxaLoginInputClass,
  juxaLoginLabelClass,
  juxaLoginLinkClass,
  juxaLoginMutedClass,
  juxaLoginPrimaryButtonClass,
} from "@/components/auth-page-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CredentialsLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(true);
        return;
      }
      router.push(safeCallback);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className={juxaLoginLabelClass}>
          Correo
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn("h-11 rounded-xl", juxaLoginInputClass, error && "border-red-500/60")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className={juxaLoginLabelClass}>
          Contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn("h-11 rounded-xl", juxaLoginInputClass, error && "border-red-500/60")}
        />
      </div>
      {error ? <p className="text-sm text-red-300">Credenciales incorrectas o usuario inexistente.</p> : null}
      <Button type="submit" className={juxaLoginPrimaryButtonClass} disabled={pending}>
        {pending ? "Entrando…" : "Acceder"}
      </Button>
      <p className={cn("text-center text-xs", juxaLoginMutedClass)}>
        ¿Sin cuenta?{"    "}
        <Link href="/registro" className={juxaLoginLinkClass}>
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
