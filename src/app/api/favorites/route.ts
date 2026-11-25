import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { LISTING_INCLUDE, serializeListing } from "@/lib/listings-query";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ favorites: [] });
  }

  try {
    const rows = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { include: LISTING_INCLUDE },
      },
    });

    const favSet = new Set(rows.map((r) => r.listingId));
    const favorites = rows.map((r) => ({
      id: r.id,
      savedPrice: r.savedPrice,
      priceDropped: !r.listing.isFree && r.listing.price < r.savedPrice,
      createdAt: r.createdAt.toISOString(),
      listing: serializeListing(r.listing, favSet),
    }));

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ error: "Error cargando favoritos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para guardar favoritos" }, { status: 401 });
  }

  try {
    const { listingId } = (await request.json()) as { listingId?: string };
    if (!listingId) {
      return NextResponse.json({ error: "Falta listingId" }, { status: 400 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: user.id, listingId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, price: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    await prisma.favorite.create({
      data: {
        userId: user.id,
        listingId: listing.id,
        savedPrice: listing.price,
      },
    });

    return NextResponse.json({ favorited: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json({ error: "No se pudo actualizar favorito" }, { status: 500 });
  }
}
