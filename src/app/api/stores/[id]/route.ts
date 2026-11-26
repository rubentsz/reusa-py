import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  COMMERCIAL_STORE_INCLUDE,
  serializeCommercialStore,
} from "@/lib/stores-query";
import { getUserFavoriteSet, LISTING_INCLUDE, serializeListing } from "@/lib/listings-query";
import { sanitizeExternalUrl } from "@/lib/format";
import { STORE_PLANS } from "@/lib/storePlans";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const includeAllListings = searchParams.get("includeAll") === "true";
    const user = await getCurrentUser();

    const store = await prisma.commercialStore.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: COMMERCIAL_STORE_INCLUDE,
    });
    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const isOwnerOrAdmin = Boolean(
      user && (user.role === "ADMIN" || user.id === store.ownerId)
    );

    if (store.status !== "ACTIVE" && !isOwnerOrAdmin) {
      return NextResponse.json({ error: "Esta tienda no está activa" }, { status: 404 });
    }

    const [listingRows, favSet] = await Promise.all([
      prisma.listing.findMany({
        where: {
          storeId: store.id,
          ...(includeAllListings && isOwnerOrAdmin ? {} : { status: "ACTIVE" }),
        },
        include: LISTING_INCLUDE,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 250,
      }),
      getUserFavoriteSet(user?.id),
    ]);

    return NextResponse.json({
      store: serializeCommercialStore(store, isOwnerOrAdmin),
      listings: listingRows.map((l) => serializeListing(l, favSet)),
      canManage: isOwnerOrAdmin,
    });
  } catch (error) {
    console.error("GET /api/stores/[id] error:", error);
    return NextResponse.json({ error: "Error cargando tienda" }, { status: 500 });
  }
}

const patchStoreSchema = z.object({
  // Branding & business fields (Owner + Admin)
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(110).optional(),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.string().optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  bannerUrl: z.string().max(500).optional().nullable(),
  facadeColor: z.string().trim().max(20).optional(),
  neonColor: z.string().trim().max(20).optional(),
  secondaryNeon: z.string().trim().max(20).optional(),
  npcGreeting: z.string().trim().max(500).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  openingHours: z.string().trim().max(140).optional().nullable(),
  whatsappPhone: z.string().trim().max(40).optional().nullable(),
  instagramUrl: z.string().trim().max(300).optional().nullable(),
  websiteUrl: z.string().trim().max(300).optional().nullable(),

  // Admin-only commercial control fields
  status: z.enum(["PENDING", "ACTIVE", "PAUSED", "EXPIRED"]).optional(),
  planTier: z.enum(["BASIC", "FEATURED", "FLAGSHIP"]).optional(),
  maxProducts: z.number().int().min(1).max(2000).optional(),
  monthlyPricePyg: z.number().min(0).optional(),
  slotOrder: z.number().int().min(0).max(9999).optional(),
  expiresAt: z.string().optional().nullable(),
  extendDays: z.number().int().min(1).max(1825).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const existing = await prisma.commercialStore.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    if (existing.ownerId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Sin permisos para editar esta tienda" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }
    const d = parsed.data;

    let coordsPatch: { approxLat?: number; approxLng?: number } = {};
    if (d.cityId && d.cityId !== existing.cityId) {
      const city = await prisma.city.findUnique({ where: { id: d.cityId } });
      if (city) {
        coordsPatch = { approxLat: city.lat, approxLng: city.lng };
      }
    }

    // Compute admin-only fields safely
    const adminData: Record<string, unknown> = {};
    if (isAdmin) {
      if (d.status !== undefined) adminData.status = d.status;
      if (d.planTier !== undefined) {
        adminData.planTier = d.planTier;
        if (d.maxProducts === undefined) {
          adminData.maxProducts = STORE_PLANS[d.planTier].maxProducts;
        }
        if (d.monthlyPricePyg === undefined) {
          adminData.monthlyPricePyg = STORE_PLANS[d.planTier].monthlyPricePyg;
        }
      }
      if (d.maxProducts !== undefined) adminData.maxProducts = d.maxProducts;
      if (d.monthlyPricePyg !== undefined) adminData.monthlyPricePyg = d.monthlyPricePyg;
      if (d.slotOrder !== undefined) adminData.slotOrder = d.slotOrder;
      if (d.expiresAt !== undefined) {
        adminData.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
      }
      if (d.extendDays) {
        const base =
          existing.expiresAt && existing.expiresAt.getTime() > Date.now()
            ? existing.expiresAt.getTime()
            : Date.now();
        adminData.expiresAt = new Date(base + d.extendDays * 24 * 60 * 60 * 1000);
        adminData.status = "ACTIVE";
      }
    }

    const updated = await prisma.commercialStore.update({
      where: { id: existing.id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.tagline !== undefined ? { tagline: d.tagline } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
        ...(d.logoUrl !== undefined ? { logoUrl: d.logoUrl } : {}),
        ...(d.bannerUrl !== undefined ? { bannerUrl: d.bannerUrl } : {}),
        ...(d.facadeColor !== undefined ? { facadeColor: d.facadeColor } : {}),
        ...(d.neonColor !== undefined ? { neonColor: d.neonColor } : {}),
        ...(d.secondaryNeon !== undefined ? { secondaryNeon: d.secondaryNeon } : {}),
        ...(d.npcGreeting !== undefined ? { npcGreeting: d.npcGreeting } : {}),
        ...(d.departmentId !== undefined ? { departmentId: d.departmentId } : {}),
        ...(d.cityId !== undefined ? { cityId: d.cityId } : {}),
        ...(d.address !== undefined ? { address: d.address } : {}),
        ...(d.openingHours !== undefined ? { openingHours: d.openingHours } : {}),
        ...(d.whatsappPhone !== undefined ? { whatsappPhone: d.whatsappPhone } : {}),
        ...(d.instagramUrl !== undefined
          ? { instagramUrl: sanitizeExternalUrl(d.instagramUrl) }
          : {}),
        ...(d.websiteUrl !== undefined ? { websiteUrl: sanitizeExternalUrl(d.websiteUrl) } : {}),
        ...coordsPatch,
        ...adminData,
      },
      include: COMMERCIAL_STORE_INCLUDE,
    });

    return NextResponse.json({ store: serializeCommercialStore(updated, true) });
  } catch (error) {
    console.error("PATCH /api/stores/[id] error:", error);
    return NextResponse.json({ error: "No se pudo actualizar la tienda" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const existing = await prisma.commercialStore.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    await prisma.commercialStore.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/stores/[id] error:", error);
    return NextResponse.json({ error: "No se pudo eliminar la tienda" }, { status: 500 });
  }
}
