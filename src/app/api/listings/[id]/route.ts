import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getUserFavoriteSet, LISTING_INCLUDE, serializeListing } from "@/lib/listings-query";
import { computeSavingsPercent, sanitizeExternalUrl } from "@/lib/format";
import {
  notifyFavoritesOnPriceDrop,
  notifyFavoritesOnStatusChange,
} from "@/lib/alerts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();

    const listing = await prisma.listing.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: LISTING_INCLUDE,
    });

    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    await prisma.listing.update({
      where: { id: listing.id },
      data: { viewsCount: { increment: 1 } },
    });

    const favSet = await getUserFavoriteSet(currentUser?.id);
    return NextResponse.json({ listing: serializeListing(listing, favSet) });
  } catch (error) {
    console.error("GET /api/listings/[id] error:", error);
    return NextResponse.json({ error: "Error cargando publicación" }, { status: 500 });
  }
}

const patchListingSchema = z.object({
  title: z.string().trim().min(4).max(120).optional(),
  description: z.string().trim().min(10).max(4000).optional(),
  status: z.enum(["ACTIVE", "RESERVED", "SOLD", "PAUSED"]).optional(),
  condition: z
    .enum(["BRAND_NEW", "OUTLET", "LIKE_NEW", "VERY_GOOD", "GOOD", "WITH_DETAILS", "FOR_PARTS"])
    .optional(),
  sku: z.string().trim().max(48).optional().nullable(),
  stockQuantity: z.number().int().min(0).max(99999).optional().nullable(),
  isFree: z.boolean().optional(),
  currency: z.enum(["PYG", "USD"]).optional(),
  price: z.number().min(0).optional(),
  referenceNewPrice: z.number().positive().optional().nullable(),
  referenceNewUrl: z.string().max(600).optional().nullable(),
  isNegotiable: z.boolean().optional(),
  acceptsTrade: z.boolean().optional(),
  pickupInPerson: z.boolean().optional(),
  publicMeetup: z.boolean().optional(),
  localDelivery: z.boolean().optional(),
  localDeliveryFree: z.boolean().optional(),
  nationalShipping: z.boolean().optional(),
  nationalShippingFree: z.boolean().optional(),
  showWhatsapp: z.boolean().optional(),
  renew: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await prisma.listing.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { store: { select: { ownerId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    const isStoreOwner = existing.store?.ownerId === currentUser.id;
    if (existing.sellerId !== currentUser.id && !isStoreOwner && currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para editar este aviso" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const nextIsFree = d.isFree !== undefined ? d.isFree : existing.isFree;
    const nextPrice = nextIsFree ? 0 : d.price !== undefined ? d.price : existing.price;
    const nextRefPrice =
      d.referenceNewPrice !== undefined ? d.referenceNewPrice : existing.referenceNewPrice;
    const nextCurrency = d.currency ?? existing.currency;
    const nextSavings = computeSavingsPercent(nextPrice, nextRefPrice, nextIsFree);
    const priceDropped = !nextIsFree && nextCurrency === existing.currency && nextPrice < existing.price;
    const statusChanged = d.status !== undefined && d.status !== existing.status;

    const updated = await prisma.listing.update({
      where: { id: existing.id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.condition !== undefined ? { condition: d.condition } : {}),
        ...(d.sku !== undefined ? { sku: d.sku } : {}),
        ...(d.stockQuantity !== undefined ? { stockQuantity: d.stockQuantity } : {}),
        isFree: nextIsFree,
        currency: nextCurrency,
        price: nextPrice,
        ...(priceDropped ? { previousPrice: existing.price } : {}),
        referenceNewPrice: nextIsFree ? null : nextRefPrice,
        ...(d.referenceNewUrl !== undefined
          ? { referenceNewUrl: sanitizeExternalUrl(d.referenceNewUrl) }
          : {}),
        savingsPercent: nextSavings,
        ...(d.isNegotiable !== undefined ? { isNegotiable: d.isNegotiable } : {}),
        ...(d.acceptsTrade !== undefined ? { acceptsTrade: d.acceptsTrade } : {}),
        ...(d.pickupInPerson !== undefined ? { pickupInPerson: d.pickupInPerson } : {}),
        ...(d.publicMeetup !== undefined ? { publicMeetup: d.publicMeetup } : {}),
        ...(d.localDelivery !== undefined ? { localDelivery: d.localDelivery } : {}),
        ...(d.localDeliveryFree !== undefined ? { localDeliveryFree: d.localDeliveryFree } : {}),
        ...(d.nationalShipping !== undefined ? { nationalShipping: d.nationalShipping } : {}),
        ...(d.nationalShippingFree !== undefined
          ? { nationalShippingFree: d.nationalShippingFree }
          : {}),
        ...(d.showWhatsapp !== undefined ? { showWhatsapp: d.showWhatsapp } : {}),
        ...(d.renew
          ? { expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), status: "ACTIVE" }
          : {}),
      },
      include: LISTING_INCLUDE,
    });

    if (priceDropped) {
      await notifyFavoritesOnPriceDrop(
        updated.id,
        updated.title,
        updated.slug,
        updated.currency,
        existing.price,
        nextPrice
      );
    }
    if (statusChanged && d.status) {
      await notifyFavoritesOnStatusChange(updated.id, updated.title, updated.slug, d.status);
    }

    const favSet = await getUserFavoriteSet(currentUser.id);
    return NextResponse.json({ listing: serializeListing(updated, favSet) });
  } catch (error) {
    console.error("PATCH /api/listings/[id] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la publicación" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await prisma.listing.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    if (existing.sellerId !== currentUser.id && currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para eliminar" }, { status: 403 });
    }

    await prisma.listing.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/listings/[id] error:", error);
    return NextResponse.json({ error: "No se pudo eliminar la publicación" }, { status: 500 });
  }
}
