import { redirect } from "next/navigation";

/** Ruta histórica: el avance ponderado vive en /admin/proyecto */
export default function AdminMvpRedirectPage() {
  redirect("/admin/proyecto");
}
