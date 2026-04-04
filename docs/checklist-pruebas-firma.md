# Checklist: prueba de firma end-to-end (Juxa Sign)

Sigue este orden en la app local (`npm run dev`) con credenciales DIGID de **pruebas** (`Modo=T`, bases `dev.digidmexico.com.mx`).

## Pre-requisitos

0. **Login:** con `DEMO_PASSWORD` completa `DEMO_AUTH_SECRET` y `DEMO_ORGANIZATION_ID` (salvo `JUXA_DATA_STORE=memory`) y entra en `/login`. Sin demo, usa NextAuth (correo + contraseña) y `AUTH_SECRET` en `.env`.
1. PostgreSQL en marcha (p. ej. `npm run db:docker` y `npm run db:push`), salvo modo memoria.
2. Archivo `.env` con `DATABASE_URL` y todas las variables `DIGID_*` de [`.env.example`](../.env.example).
3. `npm run check:env` para validar variables mínimas (no muestra secretos).
4. `npm run build` sin errores (opcional pero recomendado antes de demos).

En la app también puedes abrir la ruta **`/prueba-e2e`** para ver este checklist renderizado.

## Paso a paso completo: cuentas, folios y firma de un contrato

Orden sugerido para probar de punta a punta. El rol **SUPERADMIN** gestiona la plataforma (`/superadmin`); el usuario que **sube el contrato y dispara el envío** necesita folios en su cartera.

### A. Preparar superadmin y base de datos

1. En `.env`, define al menos **`SUPERADMIN_EMAIL`** y **`SUPERADMIN_PASSWORD`** (ver [`.env.example`](../.env.example)).
2. Con PostgreSQL: `npx prisma migrate deploy` (o el flujo que uses) y **`npm run db:seed`** (equivalente a `prisma db seed`) para crear la organización por defecto y los usuarios del seed.
3. En **modo memoria** (`JUXA_DATA_STORE=memory`), usa las cuentas sembradas del store (p. ej. `JUXA_MEMORY_SUPERADMIN_*` en `.env.example`) y entra por `/login` con NextAuth.

### B. Alta de usuarios del panel (quién “genera” la cuenta hoy)

En el código actual **no hay un formulario en `/superadmin` que cree usuarios con contraseña**. Puedes dar de alta cuentas así:

1. **Semilla (recomendado para el primer ciclo):** en `.env` configura **`ADMIN_EMAIL`** / **`ADMIN_PASSWORD`** y, si quieres otro operador, **`OPERATOR_EMAIL`** / **`OPERATOR_PASSWORD`**. Ejecuta **`npm run db:seed`**. Esos usuarios quedan en la organización `default` y el seed les asigna **folios iniciales** (`folioBalance`).
2. **Invitación (nuevos miembros):** inicia sesión como **ADMIN** de la organización (o un SUPERADMIN que use el panel de esa misma org), ve a **Configuración → Equipo**, crea una **invitación** (correo + rol). El invitado abre el enlace, define contraseña y ya aparece en el listado. Si el nuevo usuario arranca con **0 folios**, sigue el paso C.

### C. Asignar folios con SUPERADMIN (consumo en envíos)

1. Cierra sesión e inicia con la cuenta **SUPERADMIN**.
2. Abre **Plataforma → Folios y catálogo** (`/superadmin/folios`).
3. En **Acreditar semilla (folios)**, elige el **usuario** al que quieres cargar saldo, indica la **cantidad** y envía el formulario. El movimiento queda registrado como acreditación de plataforma (`SUPERADMIN_GRANT`).
4. (Alternativa solo dentro de la misma organización) un **ADMIN** de org puede usar **Configuración → Folios del equipo** (`/configuracion/folios`) para transferir folios a miembros (`ADMIN_TRANSFER`).

Comprueba en **Mis folios** (`/folios`) con la cuenta del operador que el saldo sea el esperado antes de enviar.

### D. Flujo de firma del contrato (usuario que envía)

1. Cierra sesión e inicia con el usuario que hará el trabajo operativo (**ADMIN**, **OPERATOR** o **USER** con permisos y folios).
2. Ejecuta la tabla **Flujo en la aplicación (documento y firma)** de la siguiente sección en orden (empresa → firmantes → PDF → marcas → enviar → URLs → firma en DIGID).

---

## Flujo en la aplicación (documento y firma)

| Paso | Pantalla / acción | API DIGID (referencia) |
|------|-------------------|-------------------------|
| 1 | **Empresas** → Nueva empresa | 1 `RegistrarEmpresa` |
| 2 | **Firmantes** → elegir empresa → Nuevo firmante (email o teléfono) | 2.1 `save_signatory` |
| 3 | **Documentos** → Subir PDF | 3 `create_doc` |
| 4 | **Visor** del documento → zoom **100%** → Modo marcar ON → clic en posición de firma | (coordenadas locales → API 8) |
| 5 | **Enviar** → Asignar firmantes (mismos ids que en las marcas) | 5 `add_assigned_doc` |
| 6 | **Enviar** → Enviar a firmar (tipo firma, color, **recordatorio** 24/48/72 h) | 8 `send_doc` |
| 7 | **Enviar** → Generar URLs por firmante o pantalla DIGID | 11 / 7 |
| 8 | Abrir URL en navegador y completar firma en DIGID | — |
| 9 | (Opcional) Sincronizar estado en el visor o webhook + túnel | 9 / 16 |

## Si algo falla

- **send_doc:** revisa mensaje DIGID; `FolioPremium` y `kyc` usan `0`/`1` por defecto; si el sandbox exige booleanos, define `DIGID_FLAG_SERIALIZATION=boolean` en `.env`.
- **add_assigned_doc:** KYC **por firmante** en **Enviar** (checkbox por fila); serialización `0`/`1` vs boolean con `DIGID_FLAG_SERIALIZATION`.
- **PDF en blanco en el visor:** revisa consola; el worker debe cargar desde unpkg.
- **Proxy PDF 403:** la `UrlDocumento` debe ser de host `digidmexico.com.mx` o `dev.digidmexico.com.mx`.
- **fetch a UrlDocumento falla (certify):** la URL podría requerir sesión; probar otro PDF o flujo según soporte DIGID.

## Documentación de contratos

Ver [api-digid.md](./api-digid.md) como fuente de verdad de endpoints.
