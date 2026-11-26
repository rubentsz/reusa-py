import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const rows = await prisma.storeInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      inquiries: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/store-inquiries error:", error);
    return NextResponse.json({ error: "Error cargando solicitudes" }, { status: 500 });
  }
}

const createInquirySchema = z.object({
  businessName: z.string().trim().min(2, "Ingresá el nombre de tu local").max(80),
  contactName: z.string().trim().min(2, "Ingresá tu nombre").max(80),
  contactPhone: z.string().trim().min(6, "Ingresá un número de WhatsApp válido").max(40),
  contactEmail: z.string().trim().email("Ingresá un email válido"),
  rubro: z.string().trim().min(2, "Indicá el rubro del local").max(60),
  cityName: z.string().trim().min(2, "Indicá tu ciudad").max(60),
  desiredPlan: z.enum(["BASIC", "FEATURED", "FLAGSHIP"]).default("FEATURED"),
  instagramOrWeb: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const parsed = createInquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Completá los datos requeridos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const inquiry = await prisma.storeInquiry.create({
      data: {
        businessName: d.businessName,
        contactName: d.contactName,
        contactPhone: d.contactPhone,
        contactEmail: d.contactEmail.toLowerCase(),
        rubro: d.rubro,
        cityName: d.cityName,
        desiredPlan: d.desiredPlan,
        instagramOrWeb: d.instagramOrWeb || null,
        notes: d.notes || null,
        userId: user?.id ?? null,
        status: "NEW",
      },
    });

    return NextResponse.json(
      {
        inquiry: {
          ...inquiry,
          createdAt: inquiry.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/store-inquiries error:", error);
    return NextResponse.json({ error: "No se pudo enviar tu solicitud" }, { status: 500 });
  }
}
