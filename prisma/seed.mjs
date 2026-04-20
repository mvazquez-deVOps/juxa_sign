/**
 * Organización por defecto, empresas huérfanas, usuarios bcrypt: ADMIN, opcional USER (env OPERATOR_*), segunda USER (SANDBOX_*), VIEWER y SUPERADMIN.
 * ADMIN: ADMIN_EMAIL + ADMIN_PASSWORD. OPERATOR_EMAIL + OPERATOR_PASSWORD: usuario operativo (rol USER).
 * SANDBOX_EMAIL + SANDBOX_PASSWORD: segunda cuenta de pruebas (rol USER).
 * VIEWER: VIEWER_EMAIL + VIEWER_PASSWORD. SUPERADMIN: SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD (/superadmin).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.JUXA_DATA_STORE?.trim().toLowerCase() === "memory") {
    console.log(
      "[seed] Omitido: JUXA_DATA_STORE=memory — no se usa PostgreSQL; usuarios y datos de demo salen de lib/store/memory-store al arrancar.",
    );
    return;
  }

  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    create: { name: "Organización principal", slug: "default" },
    update: {},
  });
  console.log(`[seed] Organization "default" → id para DEMO_ORGANIZATION_ID: ${org.id}`);

  const updated = await prisma.company.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  if (updated.count > 0) {
    console.log(`[seed] ${updated.count} empresa(s) asociadas a organización ${org.slug}.`);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const plain = process.env.ADMIN_PASSWORD;
  if (!email || !plain) {
    console.log(
      "[seed] Omitido usuario admin: define ADMIN_EMAIL y ADMIN_PASSWORD en .env para crear administrador.",
    );
  } else {
    const passwordHash = await bcrypt.hash(plain, 12);
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        role: "ADMIN",
        organizationId: org.id,
        folioBalance: 1000,
        kycBalance: 500,
      },
      update: {
        passwordHash,
        role: "ADMIN",
        organizationId: org.id,
      },
    });
    console.log(`[seed] Usuario admin listo: ${email} (rol ADMIN).`);
  }

  const opEmail = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
  const opPlain = process.env.OPERATOR_PASSWORD;
  if (opEmail && opPlain) {
    if (email && opEmail === email) {
      console.warn("[seed] OPERATOR_EMAIL coincide con ADMIN_EMAIL; omite operador para evitar duplicado.");
    } else {
      const opHash = await bcrypt.hash(opPlain, 12);
      await prisma.user.upsert({
        where: { email: opEmail },
        create: {
          email: opEmail,
          passwordHash: opHash,
          role: "USER",
          organizationId: org.id,
          folioBalance: 1000,
          kycBalance: 500,
        },
        update: {
          passwordHash: opHash,
          role: "USER",
          organizationId: org.id,
        },
      });
      console.log(`[seed] Usuario operativo listo: ${opEmail} (rol USER).`);
    }
  } else {
    console.log(
      "[seed] Omitido operador: define OPERATOR_EMAIL y OPERATOR_PASSWORD en .env para usuario que envía y consume folios.",
    );
  }

  const sandboxEmail = process.env.SANDBOX_EMAIL?.trim().toLowerCase();
  const sandboxPlain = process.env.SANDBOX_PASSWORD;
  if (sandboxEmail && sandboxPlain) {
    if (
      (email && sandboxEmail === email) ||
      (opEmail && sandboxEmail === opEmail) ||
      process.env.VIEWER_EMAIL?.trim().toLowerCase() === sandboxEmail ||
      process.env.USER_EMAIL?.trim().toLowerCase() === sandboxEmail ||
      process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() === sandboxEmail
    ) {
      console.warn(
        "[seed] SANDBOX_EMAIL coincide con otro usuario del seed; omite esa cuenta de pruebas para evitar duplicado.",
      );
    } else {
      const sandboxHash = await bcrypt.hash(sandboxPlain, 12);
      await prisma.user.upsert({
        where: { email: sandboxEmail },
        create: {
          email: sandboxEmail,
          passwordHash: sandboxHash,
          role: "USER",
          organizationId: org.id,
          folioBalance: 1000,
          kycBalance: 500,
        },
        update: {
          passwordHash: sandboxHash,
          role: "USER",
          organizationId: org.id,
        },
      });
      console.log(`[seed] Usuario de pruebas listo: ${sandboxEmail} (rol USER).`);
    }
  } else {
    console.log(
      "[seed] Omitido usuario SANDBOX_*: define SANDBOX_EMAIL y SANDBOX_PASSWORD para segunda cuenta USER de pruebas.",
    );
  }

  const superEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const superPlain = process.env.SUPERADMIN_PASSWORD;
  if (superEmail && superPlain) {
    const superHash = await bcrypt.hash(superPlain, 12);
    await prisma.user.upsert({
      where: { email: superEmail },
      create: {
        email: superEmail,
        passwordHash: superHash,
        role: "SUPERADMIN",
        organizationId: org.id,
        kycBalance: 0,
      },
      update: {
        passwordHash: superHash,
        role: "SUPERADMIN",
        organizationId: org.id,
      },
    });
    console.log(`[seed] Usuario superadmin listo: ${superEmail} (rol SUPERADMIN).`);
  } else {
    console.log(
      "[seed] Omitido superadmin: define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD en .env para plataforma /superadmin.",
    );
  }

  const folioUserEmail = process.env.USER_EMAIL?.trim().toLowerCase();
  const folioUserPlain = process.env.USER_PASSWORD;
  if (folioUserEmail && folioUserPlain) {
    const uh = await bcrypt.hash(folioUserPlain, 12);
    await prisma.user.upsert({
      where: { email: folioUserEmail },
      create: {
        email: folioUserEmail,
        passwordHash: uh,
        role: "USER",
        organizationId: org.id,
        folioBalance: 100,
        kycBalance: 50,
      },
      update: {
        passwordHash: uh,
        role: "USER",
        organizationId: org.id,
      },
    });
    console.log(`[seed] Usuario consumidor de folios listo: ${folioUserEmail} (rol USER, saldo inicial 100 si era nuevo).`);
  } else {
    console.log("[seed] Omitido USER: define USER_EMAIL y USER_PASSWORD en .env para rol consumidor de folios.");
  }

  const viewerEmail = process.env.VIEWER_EMAIL?.trim().toLowerCase();
  const viewerPlain = process.env.VIEWER_PASSWORD;
  if (viewerEmail && viewerPlain) {
    const vh = await bcrypt.hash(viewerPlain, 12);
    await prisma.user.upsert({
      where: { email: viewerEmail },
      create: {
        email: viewerEmail,
        passwordHash: vh,
        role: "VIEWER",
        organizationId: org.id,
        folioBalance: 0,
        kycBalance: 0,
      },
      update: {
        passwordHash: vh,
        role: "VIEWER",
        organizationId: org.id,
      },
    });
    console.log(`[seed] Usuario solo visualización listo: ${viewerEmail} (rol VIEWER).`);
  } else {
    console.log(
      "[seed] Omitido VIEWER: define VIEWER_EMAIL y VIEWER_PASSWORD para rol solo visualización (misma organización).",
    );
  }

  const packs = [
    {
      slug: "suscripcion-intro",
      name: "Suscripción mensual — Intro",
      description: "3 folios sin KYC (flujo más común). Ejemplo orientativo; ajusta precio según economía en plataforma.",
      folioAmount: 3,
      priceMxn: "299.00",
      sortOrder: 5,
    },
    {
      slug: "basico",
      name: "Paquete Básico",
      description: "Ideal para pruebas y pocos envíos al mes",
      folioAmount: 50,
      priceMxn: "499.00",
      sortOrder: 10,
    },
    {
      slug: "pro",
      name: "Paquete Pro",
      description: "Volumen recurrente de firmas",
      folioAmount: 200,
      priceMxn: "1799.00",
      sortOrder: 20,
    },
    {
      slug: "empresa",
      name: "Paquete Empresa",
      description: "Mayor volumen con mejor precio por folio",
      folioAmount: 1000,
      priceMxn: "6999.00",
      sortOrder: 30,
    },
  ];
  for (const p of packs) {
    await prisma.folioPack.upsert({
      where: { slug: p.slug },
      create: { ...p, active: true },
      update: {
        name: p.name,
        description: p.description,
        folioAmount: p.folioAmount,
        priceMxn: p.priceMxn,
        sortOrder: p.sortOrder,
        active: true,
      },
    });
  }
  console.log("[seed] Catálogo FolioPack (3 paquetes) actualizado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
