"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import {
  createOrganizationInvite,
  revokeMemberAccess,
  revokeOrganizationInvite,
  updateOrganizationMaxUsers,
  type OrgLimitsState,
  type TeamInviteState,
  type TeamRevokeState,
} from "@/app/actions/team";
import { ActionErrorDetails } from "@/components/action-error-details";
import type { UserRole } from "@prisma/client";
import { panelRoleLabel } from "@/lib/roles";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const inviteInitial: TeamInviteState | null = null;
const revokeInitial: TeamRevokeState | null = null;
const limitsInitial: OrgLimitsState | null = null;

export type TeamMemberRow = {
  id: string;
  email: string;
  role: string;
  folioBalance: number;
  kycBalance: number;
};

export function TeamEquipoClient({
  users,
  invites,
  maxUsers,
  isAdmin,
  currentUserId,
}: {
  users: TeamMemberRow[];
  invites: { id: string; email: string; role: string; expiresAt: string }[];
  maxUsers: number | null;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMemberRow[]>(users);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; email: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [role, setRole] = useState<string>("USER");
  const [inviteState, inviteAction, invitePending] = useActionState(createOrganizationInvite, inviteInitial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeOrganizationInvite, revokeInitial);
  const [limitsState, limitsAction, limitsPending] = useActionState(updateOrganizationMaxUsers, limitsInitial);

  useEffect(() => {
    setMembers(users);
  }, [users]);

  useEffect(() => {
    if (inviteState?.message) {
      if (inviteState.ok) toast.success(inviteState.message);
      else toast.error(inviteState.message);
    }
  }, [inviteState]);

  useEffect(() => {
    if (revokeState?.message) {
      if (revokeState.ok) toast.success(revokeState.message);
      else toast.error(revokeState.message);
    }
  }, [revokeState]);

  useEffect(() => {
    if (limitsState?.message) {
      if (limitsState.ok) toast.success(limitsState.message);
      else toast.error(limitsState.message);
    }
  }, [limitsState]);

  async function handleConfirmRevokeMember() {
    if (!revokeTarget) return;
    setRevokeError(null);
    setIsRevoking(true);
    const result = await revokeMemberAccess(revokeTarget.id);
    setIsRevoking(false);

    if (!result.ok) {
      const msg = result.message;
      setRevokeError(msg);
      toast.error(msg);
      return;
    }

    toast.success(result.message ?? "Acceso revocado.");
    setMembers((prev) => prev.filter((m) => m.id !== revokeTarget.id));
    setRevokeTarget(null);
    router.refresh();
  }

  function handleRevokeDialogOpenChange(open: boolean) {
    if (!open) {
      setRevokeTarget(null);
      setRevokeError(null);
    }
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Límite de usuarios</CardTitle>
            <CardDescription>
              Define un máximo de colaboradores para llevar un control sobre el acceso al panel de tu organización.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={limitsAction} className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Máximo de usuarios</Label>
                <Input
                  id="maxUsers"
                  name="maxUsers"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Sin límite"
                  defaultValue={maxUsers ?? ""}
                  className="w-48"
                />
              </div>
              <Button type="submit" disabled={limitsPending}>
                {limitsPending ? "Guardando…" : "Guardar"}
              </Button>
            </form>
            <ActionErrorDetails failed={limitsState != null && !limitsState.ok} message={limitsState?.message} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Miembros</CardTitle>
          <CardDescription>Usuarios con acceso al panel de esta organización.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios listados.</p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {members.map((u) => {
                const showRevoke = isAdmin && currentUserId != null && u.id !== currentUserId;

                return (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:flex-nowrap"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{u.email}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">
                        {panelRoleLabel(u.role as UserRole)} · {u.folioBalance} folios · {u.kycBalance} KYC
                      </span>
                      {showRevoke ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setRevokeError(null);
                            setRevokeTarget({ id: u.id, email: u.email });
                          }}
                        >
                          <UserX className="size-4" aria-hidden />
                          Revocar acceso
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={revokeTarget != null} onOpenChange={handleRevokeDialogOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (isRevoking) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isRevoking) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Revocar acceso al panel</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres revocar el acceso de{" "}
              <span className="font-semibold text-foreground">{revokeTarget?.email}</span> a la organización? Esta
              persona dejará de poder usar el panel con su cuenta actual.
            </DialogDescription>
          </DialogHeader>
          {revokeError ? (
            <p className="text-sm text-destructive" role="alert">
              {revokeError}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRevokeDialogOpenChange(false)}
              disabled={isRevoking}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={isRevoking} onClick={handleConfirmRevokeMember}>
              {isRevoking ? "Cargando…" : "Confirmar revocación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones pendientes</CardTitle>
          <CardDescription>
            Los enlaces expiran en 7 días. Se enviará a tus invitados un correo con el enlace y las instrucciones para
            unirse al equipo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay invitaciones activas.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{i.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Rol {panelRoleLabel(i.role as UserRole)} · vence{" "}
                      {new Date(i.expiresAt).toLocaleString("es-MX")}
                    </p>
                  </div>
                  {isAdmin ? (
                    <form action={revokeAction}>
                      <input type="hidden" name="inviteId" value={i.id} />
                      <Button type="submit" variant="outline" size="sm" disabled={revokePending}>
                        Revocar
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {isAdmin ? (
            <>
              <form action={inviteAction} className="space-y-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Correo del invitado</Label>
                    <Input id="invite-email" name="email" type="email" required autoComplete="off" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol en el panel</Label>
                    <input type="hidden" name="role" value={role} />
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">Solo visualización</SelectItem>
                        <SelectItem value="USER">Usuario (operación y folios)</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={invitePending}>
                  {invitePending ? "Creando…" : "Generar invitación"}
                </Button>
                <ActionErrorDetails failed={inviteState != null && !inviteState.ok} message={inviteState?.message} />
              </form>
              {inviteState?.ok && inviteState.inviteUrl ? (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  {inviteState.inviteEmailSent ? (
                    <p className="text-xs text-green-700 dark:text-green-400">Correo enviado al invitado.</p>
                  ) : null}
                  {inviteState.inviteEmailError ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Correo no enviado: {inviteState.inviteEmailError}
                    </p>
                  ) : null}
                  <p className="font-medium">Enlace de invitación (solo se muestra ahora)</p>
                  <code className="mt-2 block break-all text-xs">{inviteState.inviteUrl}</code>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(inviteState.inviteUrl!);
                      toast.success("Enlace copiado");
                    }}
                  >
                    Copiar enlace
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">
              Solo un administrador puede invitar a nuevos miembros.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
