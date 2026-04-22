"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { registerOrganization } from "@/app/actions/register-organization";
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

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function RegistroForm() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onOrgNameBlur() {
    if (!slugTouched && orgName.trim()) {
      const s = slugifyName(orgName);
      if (s.length >= 2) setSlug(s);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("organizationName", orgName);
      fd.set("organizationSlug", slug);
      fd.set("email", email.trim());
      fd.set("password", password);
      fd.set("confirm", confirm);
      const result = await registerOrganization(null, fd);
      if (!result.ok) {
        setMessage(result.message ?? "No se pudo registrar.");
        return;
      }
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setMessage("Cuenta creada. Inicia sesión con tu correo y contraseña.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          {message}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="organizationName" className={juxaLoginLabelClass}>
          Nombre de la cuenta
        </Label>
        <Input
          id="organizationName"
          name="organizationName"
          required
          autoComplete="organization"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          onBlur={onOrgNameBlur}
          placeholder="Persona Física o Moral"
          className={cn("h-11 rounded-xl", juxaLoginInputClass)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organizationSlug" className={juxaLoginLabelClass}>
          Identificador único (URL)
        </Label>
        <Input
          id="organizationSlug"
          name="organizationSlug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          placeholder="nueva-cuenta"
          className={cn("h-11 rounded-xl", juxaLoginInputClass)}
        />
        <p className={cn("text-xs", juxaLoginMutedClass)}>
          Solo minúsculas, números y guiones. Se usa internamente para tu espacio de trabajo.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className={juxaLoginLabelClass}>
          Tu correo (serás administrador)
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn("h-11 rounded-xl", juxaLoginInputClass)}
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn("h-11 rounded-xl", juxaLoginInputClass)}
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
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={cn("h-11 rounded-xl", juxaLoginInputClass)}
        />
      </div>
      <p
        className={cn(
          "rounded-lg border border-border bg-muted/40 p-3 text-xs dark:border-white/10 dark:bg-white/5",
          juxaLoginMutedClass,
        )}
      >
        <strong className="text-foreground dark:text-zinc-200">Incluye 1 folio de prueba gratis</strong> en tu cartera
        para un envío estándar.
      </p>
      <Button type="submit" className={juxaLoginPrimaryButtonClass} disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta y entrar"}
      </Button>
      <p className={cn("text-center text-xs", juxaLoginMutedClass)}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className={juxaLoginLinkClass}>
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
