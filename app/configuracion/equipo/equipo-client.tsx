"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createOrganizationInvite,
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

export function TeamEquipoClient({
  users,
  invites,
  maxUsers,
  isAdmin,
}: {
  users: { id: string; email: string; role: string; folioBalance: number }[];
  invites: { id: string; email: string; role: string; expiresAt: string }[];
  maxUsers: number | null;
  isAdmin: boolean;
}) {
  const [role, setRole] = useState<string>("OPERATOR");
  const [inviteState, inviteAction, invitePending] = useActionState(createOrganizationInvite, inviteInitial);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeOrganizationInvite, revokeInitial);
  const [limitsState, limitsAction, limitsPending] = useActionState(updateOrganizationMaxUsers, limitsInitial);

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
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay usuarios listados.</p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="font-medium">{u.email}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {panelRoleLabel(u.role as UserRole)} · {u.folioBalance} folios
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitaciones pendientes</CardTitle>
            <CardDescription>
            Los enlaces expiran en 7 días. Se enviará a tus invitados un correo con el enlace y las instrucciones para unirse al equipo.
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
                        <SelectItem value="OPERATOR">Operador</SelectItem>
                        <SelectItem value="VIEWER">Solo visualización</SelectItem>
                        <SelectItem value="USER">Consumidor de folios (operación)</SelectItem>
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
            <p className="text-sm text-muted-foreground border-t pt-4">
              Solo un administrador puede invitar a nuevos miembros.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
