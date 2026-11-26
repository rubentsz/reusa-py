import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const trackSchema = z.object({
  event: z.enum(["visit", "product_click", "whatsapp_click"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    }

    const store = await prisma.commercialStore.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const ev = parsed.data.event;
    await prisma.commercialStore.update({
      where: { id: store.id },
      data:
        ev === "visit"
          ? { visitsCount: { increment: 1 } }
          : ev === "product_click"
          ? { productClicksCount: { increment: 1 } }
          : { whatsappClicksCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/stores/[id]/track error:", error);
    return NextResponse.json({ error: "Error registrando métrica" }, { status: 500 });
  }
}
