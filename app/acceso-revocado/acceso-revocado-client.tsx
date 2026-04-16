"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ShieldAlert } from "lucide-react";
import { deleteOwnAccount } from "@/app/actions/delete-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";

export function AccesoRevocadoClient() {
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteData() {
    setDeleting(true);
    const result = await deleteOwnAccount();
    setDeleting(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Tu cuenta y datos asociados fueron eliminados.");
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute right-5 top-5 z-10 md:right-8 md:top-8">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg border-border shadow-md">
          <CardHeader className="space-y-4 text-center sm:text-left">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
              <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl tracking-tight text-foreground">Acceso Revocado</CardTitle>
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Tus permisos en Juxa Sign han sido retirados por el administrador de tu organización. Por favor,
                contacta a tu administrador para más información.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={() => void signOut({ callbackUrl: "/login" })}
            >
              Cerrar sesión y salir
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-5 sm:flex-col">
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Si además deseas eliminar por completo tu cuenta y datos en la plataforma, puedes hacerlo aquí. Esta
              acción es permanente.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
              onClick={() => void handleDeleteData()}
            >
              {deleting ? "Eliminando…" : "Eliminar mis datos permanentemente"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
