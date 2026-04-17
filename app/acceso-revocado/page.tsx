import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccesoRevocadoClient } from "./acceso-revocado-client";

export const metadata: Metadata = {
  title: "Acceso revocado",
};

export default async function AccesoRevocadoPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!session.user.isRevoked) {
    redirect("/");
  }
  return <AccesoRevocadoClient />;
}
