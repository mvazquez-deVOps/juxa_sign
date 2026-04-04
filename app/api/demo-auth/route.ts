import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { DEMO_SESSION_COOKIE } from "@/lib/demo-auth-verify";

const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function signSessionToken(expUnix: number, secret: string): string {
  const expStr = String(expUnix);
  const sig = createHmac("sha256", secret).update(expStr, "utf8").digest("hex");
  return `${expStr}.${sig}`;
}

function safeEqualPassword(submitted: string, expected: string): boolean {
  const h1 = createHash("sha256").update(submitted, "utf8").digest();
  const h2 = createHash("sha256").update(expected, "utf8").digest();
  return h1.length === h2.length && timingSafeEqual(h1, h2);
}

/** Evita redirección abierta: solo rutas relativas internas. */
function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  return t;
}

export async function POST(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD?.trim();
  const secret = process.env.DEMO_AUTH_SECRET?.trim();
  if (!password || !secret) {
    return NextResponse.json({ error: "Demo auth no habilitada" }, { status: 404 });
  }

  let submitted = "";
  let redirectTo = "/";
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const body = (await request.json()) as { password?: string; redirect?: string };
      submitted = body.password ?? "";
      redirectTo = safeRedirectPath(body.redirect);
    } catch {
      submitted = "";
    }
  } else {
    const form = await request.formData();
    submitted = form.get("password")?.toString() ?? "";
    redirectTo = safeRedirectPath(form.get("redirect")?.toString());
  }

  if (!safeEqualPassword(submitted, password)) {
    const fail = new URL("/login", request.url);
    fail.searchParams.set("error", "1");
    return NextResponse.redirect(fail);
  }

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const token = signSessionToken(exp, secret);
  const target = request.nextUrl.clone();
  target.pathname = redirectTo;
  target.search = "";

  const res = NextResponse.redirect(target);
  res.cookies.set(DEMO_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return res;
}
