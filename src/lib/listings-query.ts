import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListingDTO, ListingFilters } from "@/types/marketplace";

export const LISTING_INCLUDE = {
  images: { orderBy: { order: "asc" as const } },
  category: { select: { id: true, name: true, slug: true, icon: true, verticalType: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
  department: { select: { id: true, name: true, slug: true } },
  city: { select: { id: true, name: true, slug: true } },
  neighborhood: { select: { id: true, name: true, slug: true } },
  seller: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      whatsappPhone: true,
      createdAt: true,
      city: { select: { name: true } },
      department: { select: { name: true } },
      reviewsReceived: { select: { rating: true } },
    },
  },
} satisfies Prisma.ListingInclude;

export type ListingWithRelations = Prisma.ListingGetPayload<{
  include: typeof LISTING_INCLUDE;
}>;

export function serializeListing(
  row: ListingWithRelations,
  favoriteIds?: Set<string>
): ListingDTO {
  const ratings = row.seller.reviewsReceived.map((r) => r.rating);
  const reviewCount = ratings.length;
  const avgRating =
    reviewCount > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / reviewCount).toFixed(1)) : 0;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sellerId: row.sellerId,
    seller: {
      id: row.seller.id,
      name: row.seller.name,
      avatarUrl: row.seller.avatarUrl,
      bio: row.seller.bio,
      whatsappPhone: row.showWhatsapp ? row.seller.whatsappPhone : null,
      createdAt: row.seller.createdAt.toISOString(),
      city: row.seller.city,
      department: row.seller.department,
      avgRating,
      reviewCount,
    },
    categoryId: row.categoryId,
    category: {
      ...row.category,
      verticalType: row.category.verticalType as ListingDTO["category"]["verticalType"],
    },
    subcategoryId: row.subcategoryId,
    subcategory: row.subcategory,
    status: row.status as ListingDTO["status"],
    condition: row.condition,
    isFree: row.isFree,
    currency: row.currency as ListingDTO["currency"],
    price: row.price,
    previousPrice: row.previousPrice,
    referenceNewPrice: row.referenceNewPrice,
    referenceNewUrl: row.referenceNewUrl,
    savingsPercent: row.savingsPercent,
    isNegotiable: row.isNegotiable,
    acceptsTrade: row.acceptsTrade,
    pickupInPerson: row.pickupInPerson,
    publicMeetup: row.publicMeetup,
    localDelivery: row.localDelivery,
    localDeliveryFree: row.localDeliveryFree,
    nationalShipping: row.nationalShipping,
    nationalShippingFree: row.nationalShippingFree,
    scheduleVisitOnly: row.scheduleVisitOnly,
    showWhatsapp: row.showWhatsapp,
    departmentId: row.departmentId,
    department: row.department,
    cityId: row.cityId,
    city: row.city,
    neighborhoodId: row.neighborhoodId,
    neighborhood: row.neighborhood,
    approxLat: row.approxLat,
    approxLng: row.approxLng,
    vehicleBrand: row.vehicleBrand,
    vehicleModel: row.vehicleModel,
    vehicleYear: row.vehicleYear,
    vehicleMileageKm: row.vehicleMileageKm,
    vehicleFuel: row.vehicleFuel,
    vehicleTransmission: row.vehicleTransmission,
    vehicleDocs: row.vehicleDocs,
    realEstateOperation: row.realEstateOperation,
    realEstateType: row.realEstateType,
    areaTotalM2: row.areaTotalM2,
    areaBuiltM2: row.areaBuiltM2,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parkingSpaces: row.parkingSpaces,
    furnished: row.furnished,
    apparelSize: row.apparelSize,
    apparelBrand: row.apparelBrand,
    apparelGender: row.apparelGender,
    isFeatured: row.isFeatured,
    viewsCount: row.viewsCount,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    images: row.images,
    isFavorited: favoriteIds ? favoriteIds.has(row.id) : false,
  };
}

export function buildListingWhere(
  filters: ListingFilters & { sellerId?: string; status?: string; includeAllStatuses?: boolean }
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};

  if (!filters.includeAllStatuses) {
    where.status = filters.status || "ACTIVE";
  } else if (filters.status) {
    where.status = filters.status;
  }

  if (filters.sellerId) {
    where.sellerId = filters.sellerId;
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { vehicleBrand: { contains: q, mode: "insensitive" } },
      { vehicleModel: { contains: q, mode: "insensitive" } },
      { apparelBrand: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.subcategory) {
    where.subcategory = { slug: filters.subcategory };
  }
  if (filters.department) {
    where.department = { slug: filters.department };
  }
  if (filters.city) {
    where.city = { slug: filters.city };
  }
  if (filters.neighborhood) {
    where.neighborhood = { slug: filters.neighborhood };
  }
  if (filters.currency === "PYG" || filters.currency === "USD") {
    where.currency = filters.currency;
  }

  const priceFilter: Prisma.FloatFilter = {};
  if (filters.minPrice && !Number.isNaN(Number(filters.minPrice))) {
    priceFilter.gte = Number(filters.minPrice);
  }
  if (filters.maxPrice && !Number.isNaN(Number(filters.maxPrice))) {
    priceFilter.lte = Number(filters.maxPrice);
  }
  if (Object.keys(priceFilter).length > 0) {
    where.price = priceFilter;
  }

  if (filters.minSavings && !Number.isNaN(Number(filters.minSavings))) {
    where.savingsPercent = { gte: Number(filters.minSavings) };
  }

  if (filters.condition) {
    where.condition = filters.condition;
  }
  if (filters.isFree) {
    where.isFree = true;
  }
  if (filters.isNegotiable) {
    where.isNegotiable = true;
  }
  if (filters.acceptsTrade) {
    where.acceptsTrade = true;
  }

  if (filters.delivery === "pickup") where.pickupInPerson = true;
  if (filters.delivery === "meetup") where.publicMeetup = true;
  if (filters.delivery === "local") where.localDelivery = true;
  if (filters.delivery === "national") where.nationalShipping = true;
  if (filters.delivery === "visit") where.scheduleVisitOnly = true;

  if (filters.vehicleBrand) {
    where.vehicleBrand = { contains: filters.vehicleBrand, mode: "insensitive" };
  }
  if (filters.vehicleYearMin && !Number.isNaN(Number(filters.vehicleYearMin))) {
    where.vehicleYear = { gte: Number(filters.vehicleYearMin) };
  }
  if (filters.vehicleTransmission) {
    where.vehicleTransmission = filters.vehicleTransmission;
  }
  if (filters.vehicleFuel) {
    where.vehicleFuel = { contains: filters.vehicleFuel, mode: "insensitive" };
  }

  if (filters.realEstateOperation === "SALE" || filters.realEstateOperation === "RENT") {
    where.realEstateOperation = filters.realEstateOperation;
  }
  if (filters.realEstateType) {
    where.realEstateType = filters.realEstateType;
  }
  if (filters.bedroomsMin && !Number.isNaN(Number(filters.bedroomsMin))) {
    where.bedrooms = { gte: Number(filters.bedroomsMin) };
  }

  if (filters.apparelSize) {
    where.apparelSize = { contains: filters.apparelSize, mode: "insensitive" };
  }

  return where;
}

export async function getUserFavoriteSet(userId?: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const favs = await prisma.favorite.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(favs.map((f) => f.listingId));
}
