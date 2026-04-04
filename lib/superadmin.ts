import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session";

export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const session = await resolveSession();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    redirect("/");
  }
  return { userId: session.user.id };
}
