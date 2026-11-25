import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserFavoriteSet, LISTING_INCLUDE, serializeListing } from "@/lib/listings-query";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        whatsappPhone: true,
        showWhatsappByDefault: true,
        role: true,
        createdAt: true,
        department: { select: { id: true, name: true, slug: true } },
        city: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const isSelfOrAdmin = currentUser && (currentUser.id === user.id || currentUser.role === "ADMIN");

    const [listings, reviews, favSet] = await Promise.all([
      prisma.listing.findMany({
        where: {
          sellerId: user.id,
          ...(isSelfOrAdmin ? {} : { status: { in: ["ACTIVE", "RESERVED", "SOLD"] } }),
        },
        include: LISTING_INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.findMany({
        where: { targetUserId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          listing: { select: { id: true, slug: true, title: true } },
        },
      }),
      getUserFavoriteSet(currentUser?.id),
    ]);

    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : 0;

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        whatsappPhone: user.showWhatsappByDefault || isSelfOrAdmin ? user.whatsappPhone : null,
        createdAt: user.createdAt.toISOString(),
        department: user.department,
        city: user.city,
        avgRating,
        reviewCount: reviews.length,
        activeCount: listings.filter((l) => l.status === "ACTIVE").length,
        soldCount: listings.filter((l) => l.status === "SOLD").length,
      },
      listings: listings.map((l) => serializeListing(l, favSet)),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        author: r.author,
        listing: r.listing,
      })),
    });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json({ error: "Error cargando perfil" }, { status: 500 });
  }
}
