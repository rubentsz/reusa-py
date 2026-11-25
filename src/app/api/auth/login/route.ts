import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").toLowerCase(),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Credenciales inválidas" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const userRecord = await prisma.user.findUnique({
      where: { email },
      include: {
        department: { select: { id: true, name: true, slug: true } },
        city: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!userRecord || !(await verifyPassword(password, userRecord.passwordHash))) {
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
    }

    await setSessionCookie(userRecord.id);

    const { passwordHash: _, ...user } = userRecord;
    return NextResponse.json({ user });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
