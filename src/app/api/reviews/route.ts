import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const reviewSchema = z.object({
  targetUserId: z.string().min(1),
  listingId: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5, "Escribí una breve reseña (mín. 5 caracteres)").max(600),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para calificar" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Reseña inválida" },
        { status: 400 }
      );
    }

    if (parsed.data.targetUserId === user.id) {
      return NextResponse.json({ error: "No podés calificarte a vos mismo" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        authorId: user.id,
        targetUserId: parsed.data.targetUserId,
        listingId: parsed.data.listingId || null,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        listing: { select: { id: true, slug: true, title: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: parsed.data.targetUserId,
        type: "REVIEW",
        title: `Nueva calificación (${parsed.data.rating} ★)`,
        body: `${user.name} dejó una reseña en tu perfil: "${parsed.data.comment.slice(0, 80)}"`,
        linkUrl: `/perfil/${parsed.data.targetUserId}`,
        listingId: parsed.data.listingId || null,
      },
    });

    return NextResponse.json(
      {
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
          author: review.author,
          listing: review.listing,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ error: "No se pudo guardar la reseña" }, { status: 500 });
  }
}
