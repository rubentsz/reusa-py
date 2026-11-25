import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeName = path.basename(filename);
    if (!safeName || safeName !== filename || !/^[a-zA-Z0-9._-]+$/.test(safeName)) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", safeName);
    const data = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === ".webp"
        ? "image/webp"
        : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
}
