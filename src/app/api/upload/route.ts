import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storageAdapter } from "@/lib/storage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB per photo
const MAX_FILES = 10;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para subir fotos" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No se recibieron imágenes" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Podés subir hasta ${MAX_FILES} fotos por publicación` },
        { status: 400 }
      );
    }

    const uploaded = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Formato no soportado (${file.type}). Usá JPG, PNG o WebP.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `La foto "${file.name}" supera el límite de 8 MB.` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await storageAdapter.saveImage(buffer, file.name);
      uploaded.push(saved);
    }

    return NextResponse.json({ files: uploaded }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ error: "Error procesando las imágenes" }, { status: 500 });
  }
}
