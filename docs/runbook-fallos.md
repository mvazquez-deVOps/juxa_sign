# Runbook: fallos habituales

Síntoma → causas probables y qué revisar. Complementa el [checklist E2E](checklist-pruebas-firma.md).

## PDF en el visor (403, en blanco, CORS)

- **Proxy `/api/proxy-pdf` devuelve 403:** la `UrlDocumento` puede exigir el mismo Bearer que DIGID. Revisa que el token en `.env` sea válido y que la URL no haya expirado.
- **Sesión embebida en URL:** algunas URLs son de un solo uso o caducan; vuelve a cargar el documento desde el panel o refresca metadata desde DIGID.

## Coordenadas / marcas desalineadas en firma

- **Zoom distinto de 100 %:** coloca marcas solo con zoom 100 % en la barra del visor; si cambias el zoom después, DIGID puede recibir coordenadas inconsistentes.
- **Páginas o tamaño de página:** confirma que el PDF mostrado es el mismo que DIGID procesa (sin sustitución de archivo sin re-subir).

## `FolioPremium`, KYC y flags

- Si DIGID rechaza el JSON con `true`/`false`, prueba `DIGID_FLAG_SERIALIZATION=boolean` en `.env` (o quítalo para volver a 0/1). Ver [.env.example](../.env.example).

## Webhook en local (túnel)

DIGID debe invocar una URL **pública** HTTPS (o la que acepte el sandbox).

1. Levanta la app (`npm run dev`).
2. Abre un túnel (ej. [ngrok](https://ngrok.com/) o Cloudflare Tunnel) hacia el puerto de Next.
3. Pon en `.env` la URL base del túnel: `NEXT_PUBLIC_APP_URL=https://xxxx.ngrok-free.app` (sin barra final o con, según convenga; el código arma la ruta del webhook).
4. En **Configuración**, registra el webhook para el `IdClient` deseado (`add_webhook`).
5. Si usas `DIGID_WEBHOOK_SECRET`, la URL incluirá `?secret=...`; debe coincidir con lo que valida [`app/api/webhooks/digid/route.ts`](../app/api/webhooks/digid/route.ts).
6. Dispara un evento en DIGID y revisa logs del servidor o la tabla `WebhookEvent` si está activa la persistencia.
7. **Idempotencia:** el mismo cuerpo (y la misma cabecera `X-Digid-Delivery-Id` o `X-Request-Id` si DIGID la envía) en **7 días** devuelve `{ duplicate: true }` sin insertar otro registro ni volver a actualizar el documento.
8. En **producción**, la tabla de eventos en Configuración está oculta; para verla define `JUXA_WEBHOOK_DEBUG_UI=1` en el servidor.

Sin túnel, el estado del documento solo se actualizará con **“Sincronizar estado”** o el sync masivo en envíos.

## Errores genéricos “Error” o JSON

- Revisa el bloque **“Detalle del error”** bajo el formulario en el panel (texto completo del servidor).
- Activa logs de red en el servidor o añade temporalmente trazas en `lib/digid.ts` **sin** registrar tokens.

## Acceso al panel (login)

- **Demo** (`DEMO_PASSWORD`): si el panel carga pero las acciones fallan, falta `DEMO_ORGANIZATION_ID` (cuid de `Organization` en Postgres) o no coincide con tus datos. `npm run check:env` lo valida junto a `DEMO_AUTH_SECRET`.
- **NextAuth** (sin `DEMO_PASSWORD`): sin `AUTH_SECRET` las sesiones no persisten; el usuario debe existir en la BD (`npm run db:seed` puede crear admin).
- Tras cambiar `.env`, reinicia el proceso de Next.

## Base de datos

- **`P1001` / no conecta:** Postgres no está arriba → `npm run db:docker`, luego `npm run db:push`.
- **Schema desfasado:** `npm run db:push` tras cambios en `prisma/schema.prisma`.

## CI / build

- `prisma generate` necesita `DATABASE_URL` definida aunque sea ficticia; el workflow de CI la inyecta solo para generar el cliente.
