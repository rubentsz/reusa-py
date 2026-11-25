import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acceso restringido a moderadores" }, { status: 403 });
  }

  try {
    const rows = await prisma.report.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            price: true,
            currency: true,
            isFree: true,
            seller: { select: { id: true, name: true, email: true } },
            images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
          },
        },
        reporter: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      reports: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        moderatorNote: r.moderatorNote,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
        listing: r.listing,
        reporter: r.reporter,
      })),
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Error cargando denuncias" }, { status: 500 });
  }
}

const createReportSchema = z.object({
  listingId: z.string().min(1),
  reason: z.string().trim().min(3, "Seleccioná un motivo").max(120),
  details: z.string().trim().max(800).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para denunciar un aviso" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Denuncia inválida" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    const report = await prisma.report.create({
      data: {
        listingId: listing.id,
        reporterId: user.id,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
      },
    });

    return NextResponse.json({ reportId: report.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json({ error: "No se pudo enviar la denuncia" }, { status: 500 });
  }
}
