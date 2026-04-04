# Juxa Sign

Panel Next.js para gestionar empresas, firmantes y documentos con **DIGID México**. Las credenciales DIGID solo se usan en el servidor (Server Actions y API routes).

## Requisitos

- Node.js 20+
- PostgreSQL 16 (o Docker)
- Credenciales DIGID en modo prueba (`Modo=T`, URLs `dev.digidmexico.com.mx`)

## Entorno local (menos de 15 minutos)

1. **Clonar e instalar**

   ```bash
   cd juxa-sign
   npm install
   ```

2. **Base de datos con Docker (recomendado)**

   ```bash
   npm run db:docker
   ```

   Usuario / contraseña / base definidos en [`docker-compose.yml`](docker-compose.yml): `juxa` / `juxa` / `juxa_sign` en el puerto `5432`.

3. **Variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Completa al menos las variables del bloque **Mínimo para E2E** en [`.env.example`](.env.example). Para `DATABASE_URL` con el compose anterior:

   ```env
   DATABASE_URL="postgresql://juxa:juxa@localhost:5432/juxa_sign?schema=public"
   ```

4. **Esquema Prisma**

   ```bash
   npm run db:push
   ```

   Opcional — **datos demo solo en DB local** (empresa + firmantes con IDs ficticios `888888xxx`; no sirven contra la API DIGID hasta que registres de verdad):

   ```bash
   npm run db:seed
   ```

5. **Verificar env (sin mostrar secretos)**

   ```bash
   npm run check:env
   ```

6. **Arrancar la app**

   ```bash
   npm run dev
   ```

   Abre **`http://localhost:3333`** (puerto del script `npm run dev`). Si entras por **3000** o **3008** y “no carga”, es que el servidor está en otro puerto: abre la URL que imprime la terminal o ejecuta `npm run dev:3000` / `npm run dev:3008` y alinea `NEXT_PUBLIC_APP_URL` y, si aplica, `AUTH_URL` en `.env` con ese host y puerto (NextAuth y enlaces internos dependen de ello).

### Acceso al panel (login)

- **NextAuth** (recomendado sin demo pública): define `AUTH_SECRET` y crea usuario en BD (`npm run db:seed` puede generar admin con `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env.example`).
- **Contraseña demo:** `DEMO_PASSWORD` + `DEMO_AUTH_SECRET` + `DEMO_ORGANIZATION_ID` (cuid de `Organization`); ver `.env.example` y `npm run check:env`.

### Reset de base local

```bash
npm run db:docker:down
docker volume rm juxa-sign_juxa_sign_pg  # nombre puede variar: docker volume ls
npm run db:docker
npm run db:push
```

### Staging / segunda URL DIGID

Puedes duplicar `.env` como `.env.staging` con otra `DATABASE_URL` y las mismas claves DIGID de prueba. Carga el archivo que use tu herramienta (`dotenv` no está en runtime de Next por defecto: conviene exportar variables o usar un gestor). Antes de una demo: `npm run build` y un paso manual del [checklist](docs/checklist-pruebas-firma.md).

## Scripts

| Script              | Descripción                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Next.js en desarrollo (Turbopack)                |
| `npm run build`     | `prisma generate` + build producción             |
| `npm run lint`      | ESLint                                           |
| `npm run check:env` | Comprueba variables mínimas E2E                  |
| `npm run check:env:production` | Go-live: URL pública, webhook, `AUTH_SECRET` si no hay demo, etc. |
| `npm run check:env:production:pending-url` | Mismo rol con avisos si aún no hay dominio definitivo |
| `npm run predeploy` | `lint` + `build` (ejecutar con `.env` de staging/prod cargado) |
| `npm run db:push`   | Sincroniza schema con la DB                      |
| `npm run db:studio` | Prisma Studio                                    |
| `npm run db:seed`   | Empresa + firmantes demo en DB local (IDs ficticios; ver `prisma/seed.mjs`) |
| `npm run db:docker` | Levanta Postgres con Docker Compose              |

## Documentación

| Documento | Contenido |
| --------- | --------- |
| [docs/checklist-pruebas-firma.md](docs/checklist-pruebas-firma.md) | Prueba E2E en sandbox (también en la app: ruta **`/prueba-e2e`**) |
| [docs/flujo-producto.md](docs/flujo-producto.md) | Resumen en repo; **guía completa en la app: `/flujo-producto`** (TSX, no Markdown embebido) |
| [docs/map-acciones-api.md](docs/map-acciones-api.md) | Server Actions ↔ endpoints DIGID |
| [docs/runbook-fallos.md](docs/runbook-fallos.md) | Síntomas y causas habituales |
| [docs/api-digid.md](docs/api-digid.md) | Diccionario de API DIGID |
| [docs/despliegue.md](docs/despliegue.md) | Checklist previa a producción |

## Opcional: webhook DIGID en local

DIGID debe poder llamar a una URL pública. Usa **ngrok**, **Cloudflare Tunnel** u otro túnel, asigna esa URL a `NEXT_PUBLIC_APP_URL` y registra el webhook en **Configuración**. Detalle en [docs/runbook-fallos.md](docs/runbook-fallos.md#webhook-en-local-túnel).

## CI

GitHub Actions ejecuta `lint` y `build` con una `DATABASE_URL` ficticia solo para `prisma generate` (ver `.github/workflows/ci.yml`).

## Próximas iteraciones (producto)

- Roles y permisos más finos; 2FA opcional; almacenamiento de constancias en objeto (S3) en despliegues efímeros.
- KYC por firmante ya está en la pantalla **Enviar** (checkbox por fila).

## Licencia

Privado (según el repositorio).
