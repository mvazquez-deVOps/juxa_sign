"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { deleteOwnAccount } from "@/app/actions/delete-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CONFIRM_WORD = "ELIMINAR";

export function DeleteAccountZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const readyToSubmit = confirmText === CONFIRM_WORD;

  function handleOpenChange(next: boolean) {
    if (!next && isDeleting) return;
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setDeleteError(null);
    }
  }

  async function handleConfirmDelete() {
    if (confirmText !== CONFIRM_WORD || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    const result = await deleteOwnAccount();
    setIsDeleting(false);

    if ("error" in result) {
      setDeleteError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Tu cuenta fue eliminada.");
    setConfirmText("");
    setOpen(false);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Card className="border-destructive/50 bg-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-destructive">Zona de peligro</CardTitle>
            <CardDescription className="text-balance">
              Eliminar tu cuenta es <span className="font-medium text-foreground">irreversible</span>. Perderás el
              acceso al panel y se borrarán las <span className="font-medium text-foreground">API keys</span> asociadas
              a tu usuario.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" onClick={() => handleOpenChange(true)} disabled={isDeleting}>
          Eliminar mi cuenta
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => {
              if (isDeleting) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (isDeleting) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Confirmar eliminación de cuenta</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer. Escribe{" "}
                <span className="font-mono font-semibold text-foreground">{CONFIRM_WORD}</span> para habilitar la
                confirmación.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <Label htmlFor="delete-account-confirm">Confirmación</Label>
              <Input
                id="delete-account-confirm"
                name="delete-account-confirm"
                autoComplete="off"
                autoFocus
                placeholder={CONFIRM_WORD}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                className="font-mono"
              />
            </div>
            {deleteError ? (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!readyToSubmit || isDeleting}
                onClick={() => void handleConfirmDelete()}
              >
                {isDeleting ? "Eliminando…" : "Confirmar eliminación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
