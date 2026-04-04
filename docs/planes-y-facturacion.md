# Planes, límites y facturación (post-MVP)

Este documento define **planes comerciales orientativos** para Juxa Sign (panel + DIGID México), alineados con patrones habituales del mercado de **firma electrónica y SaaS B2B** (por asiento, por volumen de transacciones y por funciones). Sirve de base para comercial, producto e ingeniería cuando se implemente cobro.

## Estado actual en el producto (MVP firma)

- **No hay cobro** ni pasarela en la aplicación (botón “Comprar” en catálogo deshabilitado hasta integrar pago).
- **Cartera de folios por usuario:** `User.folioBalance` y `FolioLedgerEntry` (auditoría). Cada **envío a firma** desde el panel descuenta **1** crédito (o **2** si el envío usa folio premium / NOM-151). La sesión que dispara el envío es la que paga.
- **Rol `USER`:** consumidor de folios en panel (navegación reducida); no crea empresas, firmantes ni sube PDFs nuevos; sí puede marcas, asignar y enviar sobre documentos existentes de su organización.
- **Superadmin (`/superadmin/folios`):** acredita semilla, ve ledger global y administra el catálogo `FolioPack` mostrado en **Planes de folios** (`/folios/planes`).
- **API `POST /api/v1/batch/send`:** cada clave tiene un **usuario de cartera** (`ApiKey.ownerUserId`); los envíos descuentan folios de esa cartera (misma lógica que el panel). Autenticación: `Authorization: Bearer juxa_…` o `X-Api-Key`.
- **Demo / E2E:** cookie demo (`DEMO_SYNTHETIC_USER_ID`) o `JUXA_SKIP_FOLIO_DEBIT=1` omiten el descuento.
- **Límites suaves de equipo:** `Configuración → Equipo` (`maxUsers` en `OrganizationSettings`).
- **Gobierno plataforma:** superadmin puede ajustar `maxUsers`, `maxMonthlySends`, `folioPremiumEnabled` por organización (enforce de envíos opcional en iteraciones futuras).

Integración con **Stripe (u otra pasarela)** para **compra de paquetes** (`FolioPack`) y un modelo **`Subscription` por organización** (tabla anterior por asientos) quedan como **evolución**; hoy el catálogo es informativo + acreditación manual por plataforma.

---

## Referencia de mercado (orden de magnitud)

En el mercado global de firma electrónica (DocuSign, Adobe Acrobat Sign, etc.) suele verse:

- **Entrada:** planes por número de envíos o “sobres”, con techo bajo de usuarios o documentos.
- **Medio:** más usuarios, plantillas, integraciones, API limitada.
- **Alto / enterprise:** volumen, SLA, legal/compliance dedicado, precios a medida.

En **México**, productos B2B SMB suelen cotizarse en **MXN mensual** con opción **anual (~15–20 % de descuento** es común en SaaS). Los importes siguientes son **propuesta editorial** para Juxa Sign (no cotización legal ni compromiso comercial); conviene validarlos con costo real de **folios DIGID**, soporte y margen objetivo.

---

## Planes propuestos (orientativos)

| Plan | Perfil objetivo | Precio orientativo (MXN) | Usuarios (panel) | Envíos a firma / mes (orientativo) | Empresas (DIGID) | API keys | Folio premium / NOM-151 | Soporte |
| ---- | ----------------- | ------------------------- | ------------------ | ------------------------------------ | ------------------ | -------- | ------------------------- | -------- |
| **Starter** | Freelancer, despacho chico | **$990 – $1,490** / mes | Hasta **3** | **30 – 50** | **1** | No | Opcional (add-on o plan superior) | Correo, base de conocimiento |
| **Profesional** | PYME con varios trámites | **$2,490 – $3,990** / mes | Hasta **10** | **150 – 250** | Hasta **3** | Sí (límite razonable p. ej. 2 claves) | Incluido o política por org | Correo + chat (horario laboral) |
| **Negocio** | Operación recurrente, varias razones sociales | **$4,990 – $7,900** / mes | Hasta **25** | **500 – 1 000** | **Ilimitadas** razonables | Sí | Política org. + por envío | Prioritario |
| **Enterprise** | Grandes volúmenes, integraciones, SLA | **A cotizar** | A medida | A medida (commit anual) | A medida | A medida | A medida | SLA, CSM opcional |

**Notas:**

- Los rangos reflejan **competencia SaaS de firma y adjacencias** (orden de magnitud SMB/mid-market en MXN), no un benchmark estadístico único.
- **“Envíos a firma”** debe alinearse con costo de **consumo DIGID** (folios, premium); si el proveedor cobra por evento, el plan comercial debe incluir margen o **overages** (excedentes) por paquetes.
- **Descuento anual sugerido:** 15–20 % sobre el total mensual × 12 si se paga por adelantado.

---

## Mapeo a datos y UI

| Concepto comercial | Campo / lugar actual o futuro |
| ------------------ | ------------------------------ |
| Créditos de envío por usuario | `User.folioBalance` + `FolioLedgerEntry` |
| Catálogo de paquetes (precio MXN) | `FolioPack` + UI `/folios/planes` |
| Tope de usuarios en panel | `OrganizationSettings.maxUsers` + UI Equipo |
| Cuota mensual de envíos | `OrganizationSettings.maxMonthlySends` + enforce en `send_doc` / jobs |
| Política folio premium | `OrganizationSettings.folioPremiumEnabled` |
| Plan contratado (nombre, SKU) | Futuro: `Subscription.plan` o `Organization.billingPlan` |
| Estado de pago, renovación | Futuro: Stripe Checkout → acreditar `PURCHASE` en ledger |
| Feature flags (p. ej. API, lotes) | Futuro: flags por plan o por org en BD + chequeo en server actions |

---

## Roadmap técnico sugerido (post-MVP)

1. **Modelo `Subscription` (o `OrganizationBilling`)** en Prisma: `organizationId`, `plan`, `status`, `stripeCustomerId`, `stripeSubscriptionId`, `currentPeriodEnd`, etc.
2. **Stripe:** Checkout o Customer Portal, webhooks (`invoice.paid`, `customer.subscription.updated`, …) para sincronizar estado.
3. **Middleware o gate:** bloquear mutaciones si `past_due` / `canceled` (definir política de gracia).
4. **UI:** pantalla “Facturación y plan” en `Configuración` (solo ADMIN); superadmin puede asignar plan manual en transición.
5. **Enforcement:** aplicar `maxMonthlySends` y, si aplica, límites de API por plan.

---

## Resumen ejecutivo

- Hoy: **sin facturación en app**; límites operativos en **Equipo** y ajustes globales en **Plataforma** (superadmin).
- Mañana: precios cerrados + Stripe + modelo de suscripción + flags; los números de la tabla anterior son **punto de partida comercial** revisable con costos reales DIGID y posicionamiento frente a competidores.
