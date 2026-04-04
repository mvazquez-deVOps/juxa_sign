import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_SESSION_COOKIE, verifyDemoSessionValue } from "@/lib/demo-auth-verify";

/** PDFs en /public usados por DIGID mock en enlaces de firma por correo (el firmante no tiene sesión en el panel). */
const PUBLIC_MOCK_SIGNING_PDFS = new Set(["/demo-sample.pdf", "/mock-doc.pdf", "/firma-prueba"]);

function isPublicMockSigningPdf(pathname: string) {
  return PUBLIC_MOCK_SIGNING_PDFS.has(pathname);
}

function isStatic(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/icon.svg" ||
    (pathname.endsWith(".svg") && !pathname.startsWith("/api"))
  );
}

function isDemoPublic(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/registro" ||
    pathname.startsWith("/registro/") ||
    pathname.startsWith("/invitacion/") ||
    pathname.startsWith("/api/webhooks/digid") ||
    pathname.startsWith("/api/demo-auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1/")
  );
}

async function demoPasswordGate(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" && request.nextUrl.searchParams.get("reason") === "sesion-invalida") {
    const res = NextResponse.next();
    res.cookies.set(DEMO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  if (isStatic(pathname) || isPublicMockSigningPdf(pathname)) {
    return NextResponse.next();
  }

  // Modo demo: sin JWT NextAuth con rol real; el panel plataforma solo aplica con credenciales.
  if (pathname.startsWith("/superadmin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const secret = process.env.DEMO_AUTH_SECRET?.trim();

  if (!secret) {
    if (isDemoPublic(pathname)) {
      return NextResponse.next();
    }
    const u = new URL("/login", request.url);
    u.searchParams.set("misconfig", "1");
    return NextResponse.redirect(u);
  }

  const cookieVal = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
  const sessionOk = Boolean(cookieVal && (await verifyDemoSessionValue(cookieVal, secret)));

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (sessionOk) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isDemoPublic(pathname)) {
    return NextResponse.next();
  }

  if (!sessionOk) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    const res = NextResponse.redirect(login);
    if (cookieVal) {
      res.cookies.set(DEMO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return res;
  }

  return NextResponse.next();
}

const withNextAuth = auth((req) => {
  const path = req.nextUrl.pathname;
  const isLogin = path === "/login" || path.startsWith("/login/");
  const isRegister = path === "/registro" || path.startsWith("/registro/");
  const isInviteAccept = path.startsWith("/invitacion/");
  const isAuthApi = path.startsWith("/api/auth");
  const isWebhook = path.startsWith("/api/webhooks/digid");
  const isPublicApiV1 = path.startsWith("/api/v1/");
  const isStaticPath =
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path === "/icon.svg" ||
    path.endsWith(".svg");

  if (isStaticPath || isPublicMockSigningPdf(path) || isAuthApi || isWebhook || isPublicApiV1) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (isLogin || isInviteAccept || isRegister) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  if (isLogin && req.nextUrl.searchParams.get("reason") === "sesion-invalida") {
    return NextResponse.next();
  }

  if (isLogin || isRegister) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/superadmin") && req.auth?.user?.role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (req.auth?.user?.role === "USER") {
    const blocked =
      path.startsWith("/empresas/nueva") ||
      path.startsWith("/documentos/nuevo") ||
      path.startsWith("/configuracion") ||
      path.startsWith("/admin") ||
      path.startsWith("/hoja-de-ruta");
    if (blocked) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (req.auth?.user?.role === "VIEWER") {
    const enviarPath = /^\/documentos\/[^/]+\/enviar/.test(path);
    const blocked =
      path.startsWith("/empresas/nueva") ||
      path.startsWith("/documentos/nuevo") ||
      enviarPath ||
      path.startsWith("/configuracion") ||
      path.startsWith("/admin") ||
      path.startsWith("/lotes") ||
      path.startsWith("/hoja-de-ruta");
    if (blocked) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export default async function middleware(request: NextRequest) {
  const demoPw = process.env.DEMO_PASSWORD?.trim();
  if (demoPw) {
    return demoPasswordGate(request);
  }
  return withNextAuth(request, {});
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
