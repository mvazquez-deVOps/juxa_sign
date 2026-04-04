import Link from "next/link";
import { DevRoadmapChecklist } from "@/components/dev-roadmap-checklist";
import { InternalGuideComment } from "@/components/internal-guide-comment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDevRoadmapViewerContext } from "@/lib/org-scope";

export const dynamic = "force-dynamic";

export default async function HojaDeRutaDevsPage() {
  const { role } = await requireDevRoadmapViewerContext();

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hoja de ruta para desarrollo</h1>
          <p className="mt-2 text-muted-foreground">
            Estado del front y del panel Juxa Sign: lo implementado, lo pendiente y cómo probar sin
            PostgreSQL.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/proyecto">Avance del proyecto (ponderado)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>

      <DevRoadmapChecklist />

      <Card>
        <CardHeader>
          <CardTitle>Infraestructura y runtime</CardTitle>
          <CardDescription>
            Mapa para quien entra al repo: cómo corre el panel, dónde viven los datos y cómo se integra DIGID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Aplicación</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Next.js 15 (App Router): páginas RSC, Server Actions en <code className="text-xs">app/actions/</code> y route
                handlers en <code className="text-xs">app/api/</code>.
              </li>
              <li>
                El navegador habla solo con tu dominio; las credenciales DIGID y la base se usan en el servidor.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Datos</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Producción: PostgreSQL + Prisma. Variable <code className="text-xs">DATABASE_URL</code>.
              </li>
              <li>
                Conmutación Postgres / memoria: <code className="text-xs">JUXA_DATA_STORE=memory</code> y capa{" "}
                <code className="text-xs">lib/data/repository.ts</code> (funciones <code className="text-xs">db*</code>) según{" "}
                <code className="text-xs">lib/data/mode.ts</code>; en memoria, <code className="text-xs">lib/store/memory-store.ts</code>.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Autenticación</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                NextAuth v5 en <code className="text-xs">auth.ts</code>; sesión resuelta con{" "}
                <code className="text-xs">lib/session.ts</code> (<code className="text-xs">resolveSession</code>).
              </li>
              <li>
                <code className="text-xs">middleware.ts</code>: rutas protegidas, bloqueo de <code className="text-xs">/superadmin</code>{" "}
                sin rol SUPERADMIN, y modo demo con <code className="text-xs">DEMO_PASSWORD</code> (cookie firmada; en demo no hay
                panel superadmin).
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">DIGID y webhooks</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Cliente HTTP y tipos en <code className="text-xs">lib/digid.ts</code>; mock según variables de entorno.
              </li>
              <li>
                Entrada de eventos: <code className="text-xs">app/api/webhooks/digid/route.ts</code> (URL pública HTTPS +{" "}
                <code className="text-xs">DIGID_WEBHOOK_SECRET</code> en query).
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">API de producto (integradores)</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Prefijo <code className="text-xs">/api/v1/</code> (p. ej. envío batch); verificación de API keys en{" "}
                <code className="text-xs">lib/api-key-verify.ts</code> y límites en <code className="text-xs">lib/api-v1-rate-limit.ts</code>.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Despliegue y salud</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Checklist operativa: <Link href="/ayuda" className="text-primary underline">Ayuda</Link> en la app y en el repo{" "}
                <code className="text-xs">docs/despliegue.md</code> (variables, <code className="text-xs">prisma migrate deploy</code>, smoke{" "}
                <code className="text-xs">GET /api/health</code>).
              </li>
              <li>
                Plantilla de variables: <code className="text-xs">.env.example</code>; validación <code className="text-xs">npm run check:env*</code>.
              </li>
            </ul>
          </div>
          <InternalGuideComment role={role} title="Flujo de datos (resumen)" description="Referencia rápida para onboarding de backend.">
            <ol className="list-inside list-decimal space-y-1 text-xs">
              <li>Navegador → páginas Next (RSC)</li>
              <li>RSC / Server Actions → Prisma → PostgreSQL (o memory store)</li>
              <li>Server Actions → cliente DIGID (API remota)</li>
              <li>Webhook DIGID → <code className="rounded bg-amber-100/50 px-0.5 dark:bg-amber-900/40">app/api/webhooks/digid</code> → actualización de estado</li>
            </ol>
          </InternalGuideComment>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Stack y arquitectura</CardTitle>
          <CardDescription>Base técnica actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Next.js 15 (App Router), React 19, TypeScript estricto.</li>
            <li>Estilos: Tailwind CSS, componentes estilo shadcn/ui (Radix primitives).</li>
            <li>Auth: NextAuth v5 (JWT) con proveedor Credentials contra Prisma o, en memoria, el mismo flujo.</li>
            <li>Datos: Prisma + PostgreSQL en producción; capa <code className="text-xs">lib/data/repository.ts</code>{" "}
              expone funciones <code className="text-xs">db*</code> que delegan en Prisma o en{" "}
              <code className="text-xs">lib/store/memory-store.ts</code> si <code className="text-xs">JUXA_DATA_STORE=memory</code>.
            </li>
            <li>
              Integración con el proveedor de firma (cliente HTTP en el repo); con mock de servidor o modo memoria, el
              módulo de simulación devuelve respuestas sintéticas.
            </li>
            <li>Demo con contraseña: middleware + cookie firmada; sesión sintética vía{" "}
              <code className="text-xs">resolveSession()</code> cuando hay <code className="text-xs">DEMO_PASSWORD</code> (ver{" "}
              <code className="text-xs">lib/session.ts</code>).</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Pantallas y flujos ya cubiertos</CardTitle>
          <CardDescription>Funcionalidad orientada a producto que ya existe en el repo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Autenticación y layout</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Login NextAuth (email + contraseña) y variante “acceso demo” con contraseña compartida.</li>
              <li>Shell con navegación lateral / móvil, bloque de sesión (email, rol, cierre).</li>
              <li>Tema claro / oscuro / sistema (<code className="text-xs">next-themes</code>) y barra de progreso de navegación.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Dominio de firma (panel)</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Alta de empresas (registro en proveedor + persistencia local del Id. de cliente).</li>
              <li>Firmantes por empresa (sincronización con proveedor, alta/edición, borrado local).</li>
              <li>
                Documentos: subida PDF, visor con marcas de firma, asignación de firmantes, envío a firmar con asistente por
                pasos en <code className="text-xs">/documentos/…/enviar</code>, validación marcas/asignación/contacto, orden de
                firma (<code className="text-xs">sortOrder</code> → <code className="text-xs">position</code> en DIGID;
                validar secuencia en sandbox), reenvío de invitación (API 12) y capa de correo transaccional opcional (
                <code className="text-xs">lib/mail</code>).
              </li>
              <li>URLs de firma (layout y por firmante) cuando el proveedor responde correctamente.</li>
              <li>Envíos / listado de documentos con sincronización masiva de estado (info documento).</li>
              <li>Webhooks entrantes: persistencia, idempotencia por hash, actualización de estado; tabla de depuración en configuración.</li>
              <li>Constancias / certify: descarga cuando hay PDF almacenado; ruta segura de certificados.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">UI / UX</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Inicio con métricas por organización y onboarding.</li>
              <li>Tablas con ordenación en cliente (TanStack Table) en empresas, documentos y envíos.</li>
              <li>Animación ligera en hero del inicio (Framer Motion).</li>
              <li>Guías embebidas: flujo de producto, checklist E2E (rutas existentes en <code className="text-xs">/flujo-producto</code>,{" "}
                <code className="text-xs">/prueba-e2e</code>).</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Roles, folios y consumo</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Roles de panel: VIEWER (solo visualización), OPERATOR (usuario final operativo), USER, SANDBOX (pruebas /
                sandbox en inicio), ADMIN de
                organización y SUPERADMIN de plataforma;
                permisos centralizados en <code className="text-xs">lib/roles.ts</code> y comprobaciones en servidor.
              </li>
              <li>
                Cartera de folios por usuario (<code className="text-xs">folioBalance</code>); descuento al enviar según tipo de
                envío en <code className="text-xs">app/actions/signing.ts</code>.
              </li>
              <li>
                Pantallas <code className="text-xs">/folios</code> (saldo y ledger propio),{" "}
                <code className="text-xs">/folios/planes</code> (catálogo de paquetes),{" "}
                <code className="text-xs">/superadmin/folios</code> (acreditación global y CRUD de paquetes).
              </li>
              <li>
                Administradores de organización: <code className="text-xs">/configuracion/folios</code> para acreditar folios a
                miembros del equipo (auditoría <code className="text-xs">ADMIN_TRANSFER</code>) y ver ledger filtrado por org.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Brechas y trabajo pendiente (priorizado)</CardTitle>
          <CardDescription>Lo que típicamente falta para un producto “cerrado” con equipos y escala.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Alta prioridad</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Avance del proyecto medible: criterios en <code className="text-xs">lib/mvp-criteria.ts</code>, UI para admins en{" "}
                <code className="text-xs">/admin/proyecto</code> y tarjeta resumida en hoja de ruta.
              </li>
              <li>Multi-tenant estricto en todas las lecturas: auditar que ninguna query global filtre por otra organización (varias pantallas ya usan <code className="text-xs">requireOrgContext</code>).</li>
              <li>Tests automatizados: E2E (Playwright) sobre flujo feliz memoria + flujo con Postgres sandbox.</li>
              <li>Manejo de errores del proveedor unificado (códigos 300/400/500, mensajes al usuario, logs estructurados).</li>
              <li>Variables de entorno y secretos: validación en CI (<code className="text-xs">check-env</code>), rotación de credenciales del proveedor.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Media prioridad</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                Roles: revisar VIEWER acción por acción; la administración básica de usuarios y folios por org ya tiene base en{" "}
                <code className="text-xs">/configuracion/equipo</code> y <code className="text-xs">/configuracion/folios</code>.
              </li>
              <li>
                Observabilidad: tracing de llamadas al proveedor, correlación con <code className="text-xs">documentId</code> /{" "}
                id. remoto del documento.
              </li>
              <li>Plantillas del proveedor (endpoints 13–15): UI si el producto las requiere.</li>
              <li>Internacionalización si el panel debe ser bilingüe.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Baja prioridad / nice-to-have</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>React Query u otra capa de caché en cliente sobre server actions (optimistic updates).</li>
              <li>Command palette (cmdk) para saltar entre empresas y documentos.</li>
              <li>Export CSV de listados, auditoría multi-tenant puntual en mutaciones sensibles.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Modo memoria y pruebas sin Postgres</CardTitle>
          <CardDescription>Para demos a stakeholders y smoke tests antes de pasar a los devs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2">
            <li>
              En <code className="text-xs">.env</code>: <code className="text-xs">JUXA_DATA_STORE=memory</code>. Opcional:{" "}
              <code className="text-xs">JUXA_MEMORY_DEMO_PASSWORD</code> (por defecto <code className="text-xs">demo1234</code>).
            </li>
            <li>
              Cuentas sembradas (NextAuth): ADMIN (<code className="text-xs">demo@juxa.local</code> /{" "}
              <code className="text-xs">JUXA_MEMORY_PANEL_EMAIL</code>) y OPERATOR (<code className="text-xs">operador@juxa.local</code> /{" "}
              <code className="text-xs">JUXA_MEMORY_OPERATOR_*</code>). Alternativa:{" "}
              <code className="text-xs">DEMO_PASSWORD</code> + <code className="text-xs">DEMO_AUTH_SECRET</code>.
            </li>
            <li>
              En modo memoria no hacen falta credenciales reales del proveedor: las llamadas usan mock automático; PDF de
              prueba en <code className="text-xs">public/mock-doc.pdf</code>.
            </li>
            <li>Los datos se pierden al reiniciar el proceso Node: no usar para datos reales.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Documentación en repo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Revisa <code className="text-xs">docs/</code> (API del proveedor, despliegue, runbook),{" "}
            <code className="text-xs">README.md</code> y los scripts <code className="text-xs">npm run check:env*</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Camino a solo DIGID + pruebas de sistema</CardTitle>
          <CardDescription>
            Checklist para dejar mock/memoria y validar contra el proveedor real en un entorno controlado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>
              Variables y secretos: prefijo <code className="text-xs">DIGID_*</code>,{" "}
              <code className="text-xs">NEXT_PUBLIC_APP_URL</code>, <code className="text-xs">DIGID_WEBHOOK_SECRET</code>; ejecutar{" "}
              <code className="text-xs">npm run check:env</code> / variantes del repo según CI.
            </li>
            <li>
              Base de datos: aplicar migraciones en el entorno de prueba (<code className="text-xs">prisma migrate deploy</code> o
              flujo equivalente) para que el esquema coincida con el código.
            </li>
            <li>
              Conexión al proveedor: desactivar o acotar simulación (<code className="text-xs">DIGID_MOCK</code>,{" "}
              <code className="text-xs">JUXA_DATA_STORE</code>) según el entorno; confirmar URLs y credenciales contra{" "}
              <code className="text-xs">docs/api-digid.md</code>.
            </li>
            <li>
              Pruebas: suite E2E en <code className="text-xs">e2e/</code> y <code className="text-xs">playwright.config.ts</code>; guía
              manual <code className="text-xs">docs/checklist-pruebas-firma.md</code>.
            </li>
            <li>
              Criterios del proyecto: <code className="text-xs">lib/mvp-criteria.ts</code> y seguimiento en{" "}
              <code className="text-xs">/admin/proyecto</code>.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Mantenimiento de esta vista</CardTitle>
          <CardDescription>
            Los checks de fases 0–7 y el trabajo “sin DB” viven en{" "}
            <code className="text-xs">lib/dev-roadmap-phases.ts</code>: actualízalos al cerrar hitos (staging, producción).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Al cerrar hitos de staging o producción, actualiza los estados en{" "}
            <code className="text-xs">lib/dev-roadmap-phases.ts</code> para que esta vista siga siendo fiel al entorno real.
          </p>
          <InternalGuideComment role={role} title="Producto (SUPERADMIN)" description="Priorización de vistas de plataforma.">
            <p>
              La vista de plataforma debe privilegiar métricas de negocio (folios activos, precios de venta, paquetes) en{" "}
              <Link href="/superadmin/folios" className="font-medium text-primary underline">
                /superadmin/folios
              </Link>
              . El consumo tipo cartera del panel (“Mis folios”) es rol de usuario u operador, no el foco principal del
              superadministrador.
            </p>
          </InternalGuideComment>
        </CardContent>
      </Card>
    </div>
  );
}
