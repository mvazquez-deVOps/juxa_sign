import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { dbCertificateFindFirstInOrg } from "@/lib/data/repository";
import { resolveSession } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  const session = await resolveSession();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const cert = await dbCertificateFindFirstInOrg(id, session.user.organizationId);
  if (!cert?.filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = path.resolve(process.cwd(), "uploads", "certificates");
  const resolved = path.resolve(cert.filePath);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buf = await fs.readFile(resolved);
    const name = cert.fileName?.replace(/[^\w.\-]+/g, "_") || "constancia.pdf";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": cert.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
