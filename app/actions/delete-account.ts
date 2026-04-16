"use server";

import { Prisma } from "@prisma/client";
import { isMemoryDataStore } from "@/lib/data/mode";
import { prisma } from "@/lib/prisma";
import { DEMO_SYNTHETIC_USER_ID, resolveSession } from "@/lib/session";

export type DeleteOwnAccountResult = { success: true } | { error: string };

/**
 * Elimina la cuenta del usuario autenticado (y sus API keys asociadas, requerido por FK Restrict en schema).
 */
export async function deleteOwnAccount(): Promise<DeleteOwnAccountResult> {
  const session = await resolveSession();
  const userId = session?.user?.id;

  if (!session?.user || !userId) {
    return { error: "Debes iniciar sesión para eliminar tu cuenta." };
  }

  if (userId === DEMO_SYNTHETIC_USER_ID) {
    return { error: "La sesión de demostración no puede eliminarse desde el panel." };
  }

  if (isMemoryDataStore()) {
    return { error: "La eliminación de cuenta no está disponible en el almacén en memoria." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.apiKey.deleteMany({ where: { ownerUserId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    return { success: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return { error: "No se encontró tu usuario en la base de datos." };
      }
      if (e.code === "P2003") {
        return { error: "No se pudo eliminar la cuenta por dependencias en el sistema. Contacta a soporte." };
      }
    }
    return { error: "No se pudo eliminar la cuenta. Intenta de nuevo más tarde." };
  }
}
