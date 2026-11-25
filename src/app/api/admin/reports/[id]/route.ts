import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const actionSchema = z.object({
  action: z.enum(["PAUSE_LISTING", "DELETE_LISTING", "DISMISS"]),
  moderatorNote: z.string().trim().max(400).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso restringido a moderadores" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: { listing: { select: { id: true, title: true, sellerId: true } } },
    });
    if (!report) {
      return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
    }

    const { action, moderatorNote } = parsed.data;

    if (action === "DELETE_LISTING") {
      await prisma.notification.create({
        data: {
          userId: report.listing.sellerId,
          type: "MODERATION",
          title: "Publicación removida por moderación",
          body: `Tu aviso "${report.listing.title}" fue dado de baja tras revisar una denuncia.${
            moderatorNote ? ` Motivo: ${moderatorNote}` : ""
          }`,
        },
      });
      await prisma.listing.delete({ where: { id: report.listing.id } });
      return NextResponse.json({ ok: true, deletedListing: true });
    }

    if (action === "PAUSE_LISTING") {
      await prisma.listing.update({
        where: { id: report.listing.id },
        data: { status: "PAUSED" },
      });
      await prisma.notification.create({
        data: {
          userId: report.listing.sellerId,
          type: "MODERATION",
          title: "Publicación pausada por moderación",
          body: `Tu aviso "${report.listing.title}" fue pausado preventivamente.${
            moderatorNote ? ` Nota: ${moderatorNote}` : ""
          }`,
          listingId: report.listing.id,
        },
      });
    }

    await prisma.report.update({
      where: { id },
      data: {
        status: action === "DISMISS" ? "DISMISSED" : "RESOLVED",
        moderatorNote: moderatorNote || null,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/admin/reports/[id] error:", error);
    return NextResponse.json({ error: "No se pudo procesar el reporte" }, { status: 500 });
  }
}
