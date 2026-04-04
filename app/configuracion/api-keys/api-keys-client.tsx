"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiKey, revokeApiKey, type ApiKeyCreateState, type ApiKeyRevokeState } from "@/app/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  ownerEmail: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type WalletOption = { id: string; email: string };

export function ApiKeysClient({
  initialKeys,
  walletUsers,
  defaultOwnerUserId,
}: {
  initialKeys: KeyRow[];
  walletUsers: WalletOption[];
  defaultOwnerUserId: string;
}) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(createApiKey, null as ApiKeyCreateState | null);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeApiKey, null as ApiKeyRevokeState | null);
  const [revealed, setRevealed] = useState<string | null>(null);

  const defaultOwner =
    walletUsers.some((u) => u.id === defaultOwnerUserId) && defaultOwnerUserId
      ? defaultOwnerUserId
      : (walletUsers[0]?.id ?? "");

  useEffect(() => {
    if (createState?.message) {
      if (createState.ok) {
        toast.success(createState.message);
        if (createState.plainKey) setRevealed(createState.plainKey);
        router.refresh();
      } else toast.error(createState.message);
    }
  }, [createState, router]);

  useEffect(() => {
    if (revokeState?.message) {
      if (revokeState.ok) {
        toast.success(revokeState.message);
        router.refresh();
      } else toast.error(revokeState.message);
    }
  }, [revokeState, router]);

  return (
    <div className="space-y-6">
      {revealed ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Copia tu clave ahora</CardTitle>
            <CardDescription>No volverá a mostrarse. Guárdala en un gestor de secretos.</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md border bg-background p-3 text-sm">{revealed}</code>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setRevealed(null)}>
              Entendido, ocultar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Crear clave</CardTitle>
          <CardDescription>
            Prefijo visible para identificarla; el secreto completo empieza con juxa_. Los envíos con esta clave usan la
            cartera del usuario indicado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {walletUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay usuarios con cartera asignable (excluye visores). Invita o ajusta roles en Equipo.
            </p>
          ) : (
            <form action={createAction} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre interno</Label>
                  <Input id="name" name="name" placeholder="p. ej. Producción CRM" required disabled={createPending} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerUserId">Cartera (usuario)</Label>
                  <select
                    id="ownerUserId"
                    name="ownerUserId"
                    required
                    disabled={createPending}
                    defaultValue={defaultOwner}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {walletUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={createPending} className="w-fit">
                {createPending ? "Creando…" : "Generar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claves activas</CardTitle>
        </CardHeader>
        <CardContent>
          {initialKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay claves. Crea una para usar la API.</p>
          ) : (
            <ul className="space-y-3">
              {initialKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Prefijo {k.keyPrefix}… · cartera {k.ownerEmail} · creada{" "}
                      {new Date(k.createdAt).toLocaleString("es-MX")}
                      {k.lastUsedAt ? ` · último uso ${new Date(k.lastUsedAt).toLocaleString("es-MX")}` : ""}
                    </p>
                  </div>
                  <form action={revokeAction}>
                    <input type="hidden" name="keyId" value={k.id} />
                    <Button type="submit" variant="destructive" size="sm" disabled={revokePending}>
                      Revocar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
