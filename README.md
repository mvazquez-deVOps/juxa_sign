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

5. **Verificar env (sin mostrar secretos)**

   ```bash
   npm run check:env
   ```

6. **Arrancar la app**

   ```bash
   npm run dev
   ```

   Abre `http://localhost:3000` (o el puerto que indique la consola).

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
| `npm run db:push`   | Sincroniza schema con la DB                      |
| `npm run db:studio` | Prisma Studio                                    |
| `npm run db:seed`   | Mensaje guía (no inserta datos DIGID)            |
| `npm run db:docker` | Levanta Postgres con Docker Compose              |

## Documentación

| Documento | Contenido |
| --------- | --------- |
| [docs/checklist-pruebas-firma.md](docs/checklist-pruebas-firma.md) | Prueba E2E en sandbox (también en la app: ruta **`/prueba-e2e`**) |
| [docs/flujo-producto.md](docs/flujo-producto.md) | Actores, pantallas y flujo |
| [docs/map-acciones-api.md](docs/map-acciones-api.md) | Server Actions ↔ endpoints DIGID |
| [docs/runbook-fallos.md](docs/runbook-fallos.md) | Síntomas y causas habituales |
| [docs/api-digid.md](docs/api-digid.md) | Diccionario de API DIGID |

## Opcional: webhook DIGID en local

DIGID debe poder llamar a una URL pública. Usa **ngrok**, **Cloudflare Tunnel** u otro túnel, asigna esa URL a `NEXT_PUBLIC_APP_URL` y registra el webhook en **Configuración**. Detalle en [docs/runbook-fallos.md](docs/runbook-fallos.md#webhook-en-local-túnel).

## CI

GitHub Actions ejecuta `lint` y `build` con una `DATABASE_URL` ficticia solo para `prisma generate` (ver `.github/workflows/ci.yml`).

## Próximas iteraciones (producto)

- Autenticación de usuarios del panel y KYC por firmante en UI si el negocio lo exige. Hoy el prototipo es de uso interno / demo sin login.

## Licencia

Privado (según el repositorio).
