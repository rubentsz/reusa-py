import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CommercialStoreDTO } from "@/types/marketplace";

export const COMMERCIAL_STORE_INCLUDE = {
  owner: { select: { id: true, name: true, email: true, whatsappPhone: true } },
  category: { select: { id: true, name: true, slug: true, icon: true } },
  department: { select: { id: true, name: true, slug: true } },
  city: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      listings: { where: { status: "ACTIVE" } },
    },
  },
} satisfies Prisma.CommercialStoreInclude;

export type CommercialStoreWithRelations = Prisma.CommercialStoreGetPayload<{
  include: typeof COMMERCIAL_STORE_INCLUDE;
}>;

export function serializeCommercialStore(
  row: CommercialStoreWithRelations,
  includeOwnerEmail = false
): CommercialStoreDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    ownerId: row.ownerId,
    owner: row.owner
      ? {
          id: row.owner.id,
          name: row.owner.name,
          email: includeOwnerEmail ? row.owner.email : "",
          whatsappPhone: row.owner.whatsappPhone,
        }
      : undefined,
    categoryId: row.categoryId,
    category: row.category,
    status: row.status as CommercialStoreDTO["status"],
    planTier: row.planTier as CommercialStoreDTO["planTier"],
    maxProducts: row.maxProducts,
    monthlyPricePyg: row.monthlyPricePyg,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    slotOrder: row.slotOrder,
    logoUrl: row.logoUrl,
    bannerUrl: row.bannerUrl,
    facadeColor: row.facadeColor,
    neonColor: row.neonColor,
    secondaryNeon: row.secondaryNeon,
    npcGreeting: row.npcGreeting,
    departmentId: row.departmentId,
    department: row.department,
    cityId: row.cityId,
    city: row.city,
    address: row.address,
    openingHours: row.openingHours,
    whatsappPhone: row.whatsappPhone,
    instagramUrl: row.instagramUrl,
    websiteUrl: row.websiteUrl,
    approxLat: row.approxLat,
    approxLng: row.approxLng,
    visitsCount: row.visitsCount,
    productClicksCount: row.productClicksCount,
    whatsappClicksCount: row.whatsappClicksCount,
    activeListingsCount: row._count.listings,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getActiveCommercialStores(): Promise<CommercialStoreDTO[]> {
  const rows = await prisma.commercialStore.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: COMMERCIAL_STORE_INCLUDE,
    orderBy: [{ slotOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => serializeCommercialStore(r, false));
}
