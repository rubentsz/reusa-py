import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(300).optional().nullable(),
  whatsappPhone: z.string().trim().max(24).optional().nullable(),
  showWhatsappByDefault: z.boolean().optional(),
  departmentId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: current.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio || null } : {}),
        ...(parsed.data.whatsappPhone !== undefined
          ? { whatsappPhone: parsed.data.whatsappPhone || null }
          : {}),
        ...(parsed.data.showWhatsappByDefault !== undefined
          ? { showWhatsappByDefault: parsed.data.showWhatsappByDefault }
          : {}),
        ...(parsed.data.departmentId !== undefined
          ? { departmentId: parsed.data.departmentId || null }
          : {}),
        ...(parsed.data.cityId !== undefined ? { cityId: parsed.data.cityId || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        whatsappPhone: true,
        showWhatsappByDefault: true,
        role: true,
        departmentId: true,
        cityId: true,
        createdAt: true,
        department: { select: { id: true, name: true, slug: true } },
        city: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);
    return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
  }
}
