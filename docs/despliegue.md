# Antes de desplegar (Juxa Sign)

Checklist operativa. No sustituye la configuración de tu proveedor (Vercel, VM, Kubernetes, etc.).

## 1. Variables de entorno

Define en el panel del host **todas** las de [`.env.example`](../.env.example), con valores de **producción** DIGID si aplica.

| Variable | Notas |
| -------- | ----- |
| `DATABASE_URL` | Postgres administrado; usuario con SSL si el proveedor lo exige (`?sslmode=require`). |
| `DIGID_*` | URLs y credenciales del entorno real (no `dev.digidmexico.com.mx` salvo demo). |
| `NEXT_PUBLIC_APP_URL` | URL **pública** sin barra final rara; debe coincidir con el dominio desde el que sirve Next. |
| `DIGID_WEBHOOK_SECRET` | **Recomendado en cuanto expongas el webhook**: mismo valor en `?secret=` al registrar en DIGID y en el host. |
| `AUTH_SECRET` | NextAuth: obligatorio si **no** usas `DEMO_PASSWORD` (generar con `openssl rand -base64 32`). |
| `DEMO_PASSWORD` / `DEMO_AUTH_SECRET` / `DEMO_ORGANIZATION_ID` | Opcional: contraseña compartida para demos; si está `DEMO_PASSWORD`, el middleware prioriza la cookie demo sobre NextAuth. `DEMO_ORGANIZATION_ID` debe ser el cuid de una `Organization` en la misma base (salvo `JUXA_DATA_STORE=memory`). |

### Sin URL definitiva aún

Puedes preparar base de datos, credenciales DIGID y hacer `build` con `NEXT_PUBLIC_APP_URL` en localhost o vacía. La verificación **estricta** de producción exige dominio público y secreto de webhook; hasta que los tengas usa:

```bash
npm run check:env:production:pending-url
```

(o `DEPLOY_CHECK=pending npm run check:env`, que activa el mismo modo relajado). Solo emite **avisos** por URL y secreto; no falla el proceso.

Cuando ya tengas dominio HTTPS y quieras cierre previo al go-live:

```bash
npm run check:env:production
```

Equivale a `node scripts/check-env.mjs --production` o `DEPLOY_CHECK=1 npm run check:env`. En este modo, si **no** usas `DEMO_PASSWORD`, exige **`AUTH_SECRET`** (NextAuth); con demo activo, aplica el bloque de variables demo ya validado por `npm run check:env`.

## 2. Base de datos

El repo usa `prisma db push` en desarrollo. Para entornos persistentes conviene **migraciones versionadas**:

```bash
# Una vez definidas migraciones en el repo:
npx prisma migrate deploy
```

Hasta entonces, en la primera subida puedes ejecutar `prisma db push` contra la DB del entorno (solo si aceptas el riesgo de drift sin historial).

## 3. Build y arranque

En la máquina o en la pipeline (mismas versiones que CI):

```bash
npm ci
npm run lint
DATABASE_URL="postgresql://…" npm run build   # URL real o dummy solo si el build no toca DB
npm run start
```

En el host, el comando habitual es `npm run start` (o el wrapper del PaaS) con `NODE_ENV=production`.

### Desarrollo local en puerto distinto (3008, 3000, etc.)

Si ejecutas `npm run dev:3008` (o `dev:3000`) y ves **500** o sesión rota, alinea en `.env` la URL con ese puerto, por ejemplo:

- `NEXT_PUBLIC_APP_URL=http://localhost:3008`
- `NEXTAUTH_URL=http://localhost:3008` (o `AUTH_URL` si tu plantilla lo usa)

Con **PostgreSQL apagado**, usa `JUXA_DATA_STORE=memory` y variables mínimas de memoria del `.env.example` para levantar el panel sin BD.

## 4. Smoke test post-deploy

1. `GET /api/health` → `200` y JSON con `"ok": true`.
2. Abrir la home y una pantalla que use Prisma (p. ej. empresas o documentos).
3. **Configuración** → registrar webhook con la URL pública `…/api/webhooks/digid?secret=…`.
4. Opcional: disparar evento desde DIGID y revisar **Últimos webhooks recibidos**.

## 5. Subida de archivos y constancias

La app puede escribir en `uploads/certificates` para constancias PDF. En plataformas **efímeras** (contenedores sin volumen) esos archivos se pierden al redeploy: monta un volumen persistente o mueve el almacenamiento a objeto (S3, etc.) en una iteración posterior.

## 6. Seguridad y acceso

- El panel soporta **NextAuth** (usuarios en BD) y, opcionalmente, **contraseña demo** (`DEMO_PASSWORD` + cookie firmada). No expongas la app a Internet sin uno de los dos activos y secretos fuertes.
- La demo compartida es solo para entornos controlados; rota `DEMO_PASSWORD` y `DEMO_AUTH_SECRET` si sospechas filtración.
- Cabeceras HTTP básicas están en `next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, etc.).

## Referencias

- [runbook-fallos.md](./runbook-fallos.md) — incidencias habituales.
- [checklist-pruebas-firma.md](./checklist-pruebas-firma.md) — flujo E2E en sandbox.
