import Link from "next/link";
import { HelpCircle, ListOrdered } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Centro de ayuda",
};

export default function AyudaIndexPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">¿Qué encontrarás aquí?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Respuestas breves y pasos numerados para enviar documentos a firma sin adivinar el orden del menú. Si tu
          organización usa <strong className="text-foreground">empresa</strong> o{" "}
          <strong className="text-foreground">persona física</strong> como titular ante el proveedor, el flujo en Juxa
          Sign es el mismo: primero das de alta ese <strong className="text-foreground">cliente</strong> (menú
          Clientes), luego firmantes, documentos y envío.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <ListOrdered className="mb-2 h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Primeros pasos</CardTitle>
            <CardDescription>Orden recomendado desde cero hasta el primer envío a firma.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ayuda/primeros-pasos" className="text-sm font-medium text-primary underline">
              Abrir guía paso a paso
            </Link>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <HelpCircle className="mb-2 h-8 w-8 text-primary" />
            <CardTitle className="text-lg">Preguntas frecuentes</CardTitle>
            <CardDescription>Roles, folios, visor PDF, webhooks y entorno de prueba.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ayuda/faq" className="text-sm font-medium text-primary underline">
              Ver preguntas frecuentes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
