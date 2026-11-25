import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre completo").max(80),
  email: z.string().trim().email("Email inválido").toLowerCase(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100),
  whatsappPhone: z.string().trim().max(24).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { name, email, password, whatsappPhone, departmentId, cityId } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        whatsappPhone: whatsappPhone || null,
        departmentId: departmentId || null,
        cityId: cityId || null,
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

    await setSessionCookie(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
