import { NextRequest, NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/demo-auth-verify";

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const res = NextResponse.redirect(url);
  res.cookies.set(DEMO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
