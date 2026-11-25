import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  buildListingWhere,
  getUserFavoriteSet,
  LISTING_INCLUDE,
  serializeListing,
} from "@/lib/listings-query";
import {
  addPrivacyJitter,
  computeSavingsPercent,
  sanitizeExternalUrl,
  slugify,
} from "@/lib/format";
import { notifySavedSearchesOnNewListing } from "@/lib/alerts";
import type { ListingFilters } from "@/types/marketplace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentUser = await getCurrentUser();

    const filters: ListingFilters & {
      sellerId?: string;
      status?: string;
      includeAllStatuses?: boolean;
    } = {
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      subcategory: searchParams.get("subcategory") || undefined,
      department: searchParams.get("department") || undefined,
      city: searchParams.get("city") || undefined,
      neighborhood: searchParams.get("neighborhood") || undefined,
      currency: (searchParams.get("currency") as ListingFilters["currency"]) || "",
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      minSavings: searchParams.get("minSavings") || undefined,
      condition: searchParams.get("condition") || undefined,
      isFree: searchParams.get("isFree") === "true",
      isNegotiable: searchParams.get("isNegotiable") === "true",
      acceptsTrade: searchParams.get("acceptsTrade") === "true",
      delivery: (searchParams.get("delivery") as ListingFilters["delivery"]) || "",
      vehicleBrand: searchParams.get("vehicleBrand") || undefined,
      vehicleYearMin: searchParams.get("vehicleYearMin") || undefined,
      vehicleTransmission: searchParams.get("vehicleTransmission") || undefined,
      vehicleFuel: searchParams.get("vehicleFuel") || undefined,
      realEstateOperation:
        (searchParams.get("realEstateOperation") as ListingFilters["realEstateOperation"]) || "",
      realEstateType: searchParams.get("realEstateType") || undefined,
      bedroomsMin: searchParams.get("bedroomsMin") || undefined,
      apparelSize: searchParams.get("apparelSize") || undefined,
      sellerId: searchParams.get("sellerId") || undefined,
      status: searchParams.get("status") || undefined,
      includeAllStatuses: searchParams.get("includeAll") === "true",
      sort: (searchParams.get("sort") as ListingFilters["sort"]) || "recent",
    };

    // Only owner or admin can request non-ACTIVE listings of a seller
    if (filters.includeAllStatuses) {
      const canSeeAll =
        currentUser &&
        (currentUser.role === "ADMIN" ||
          (filters.sellerId && currentUser.id === filters.sellerId));
      if (!canSeeAll) {
        filters.includeAllStatuses = false;
      }
    }

    const where = buildListingWhere(filters);

    let orderBy: Record<string, "asc" | "desc">[] = [{ isFeatured: "desc" }, { createdAt: "desc" }];
    if (filters.sort === "savings") {
      orderBy = [{ savingsPercent: "desc" }, { createdAt: "desc" }];
    } else if (filters.sort === "price_asc") {
      orderBy = [{ price: "asc" }, { createdAt: "desc" }];
    } else if (filters.sort === "price_desc") {
      orderBy = [{ price: "desc" }, { createdAt: "desc" }];
    }

    const limit = Math.min(Number(searchParams.get("limit") || 60), 100);

    const [rows, total, favSet] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: LISTING_INCLUDE,
        orderBy,
        take: limit,
      }),
      prisma.listing.count({ where }),
      getUserFavoriteSet(currentUser?.id),
    ]);

    return NextResponse.json({
      listings: rows.map((r) => serializeListing(r, favSet)),
      total,
    });
  } catch (error) {
    console.error("GET /api/listings error:", error);
    return NextResponse.json({ error: "Error cargando publicaciones" }, { status: 500 });
  }
}

const createListingSchema = z.object({
  title: z.string().trim().min(4, "El título debe tener al menos 4 caracteres").max(120),
  description: z.string().trim().min(10, "Contanos un poco más del producto").max(4000),
  categoryId: z.string().min(1, "Elegí una categoría"),
  subcategoryId: z.string().optional().nullable(),
  condition: z.enum(["LIKE_NEW", "VERY_GOOD", "GOOD", "WITH_DETAILS", "FOR_PARTS"]),
  isFree: z.boolean().default(false),
  currency: z.enum(["PYG", "USD"]).default("PYG"),
  price: z.number().min(0).default(0),
  referenceNewPrice: z.number().positive().optional().nullable(),
  referenceNewUrl: z.string().max(600).optional().nullable(),
  isNegotiable: z.boolean().default(false),
  acceptsTrade: z.boolean().default(false),
  pickupInPerson: z.boolean().default(true),
  publicMeetup: z.boolean().default(false),
  localDelivery: z.boolean().default(false),
  localDeliveryFree: z.boolean().default(false),
  nationalShipping: z.boolean().default(false),
  nationalShippingFree: z.boolean().default(false),
  scheduleVisitOnly: z.boolean().default(false),
  showWhatsapp: z.boolean().default(true),
  departmentId: z.string().min(1, "Elegí un departamento"),
  cityId: z.string().min(1, "Elegí una ciudad"),
  neighborhoodId: z.string().optional().nullable(),
  vehicleBrand: z.string().trim().max(60).optional().nullable(),
  vehicleModel: z.string().trim().max(60).optional().nullable(),
  vehicleYear: z.number().int().min(1950).max(2027).optional().nullable(),
  vehicleMileageKm: z.number().int().min(0).max(2000000).optional().nullable(),
  vehicleFuel: z.string().trim().max(40).optional().nullable(),
  vehicleTransmission: z.string().trim().max(40).optional().nullable(),
  vehicleDocs: z.string().trim().max(100).optional().nullable(),
  realEstateOperation: z.enum(["SALE", "RENT"]).optional().nullable(),
  realEstateType: z.string().trim().max(40).optional().nullable(),
  areaTotalM2: z.number().positive().optional().nullable(),
  areaBuiltM2: z.number().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).max(30).optional().nullable(),
  bathrooms: z.number().int().min(0).max(30).optional().nullable(),
  parkingSpaces: z.number().int().min(0).max(20).optional().nullable(),
  furnished: z.boolean().optional().nullable(),
  apparelSize: z.string().trim().max(40).optional().nullable(),
  apparelBrand: z.string().trim().max(60).optional().nullable(),
  apparelGender: z.string().trim().max(40).optional().nullable(),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        isCover: z.boolean().optional(),
      })
    )
    .min(1, "Subí al menos 1 foto del producto")
    .max(10, "Máximo 10 fotos por publicación"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para publicar" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de publicación inválidos" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    if (!data.isFree && data.price <= 0) {
      return NextResponse.json(
        { error: "Ingresá un precio mayor a 0 o marcá la opción Gratis / Regalo" },
        { status: 400 }
      );
    }

    const [category, department, city, neighborhood] = await Promise.all([
      prisma.category.findUnique({ where: { id: data.categoryId } }),
      prisma.department.findUnique({ where: { id: data.departmentId } }),
      prisma.city.findUnique({ where: { id: data.cityId } }),
      data.neighborhoodId
        ? prisma.neighborhood.findUnique({ where: { id: data.neighborhoodId } })
        : Promise.resolve(null),
    ]);

    if (!category || !department || !city) {
      return NextResponse.json({ error: "Categoría o ubicación inválida" }, { status: 400 });
    }

    const isVisitVertical =
      category.verticalType === "VEHICLE" || category.verticalType === "REAL_ESTATE";
    const scheduleVisitOnly = isVisitVertical ? true : data.scheduleVisitOnly;

    const effectivePrice = data.isFree ? 0 : data.price;
    const cleanRefUrl = sanitizeExternalUrl(data.referenceNewUrl);
    const savingsPercent = computeSavingsPercent(
      effectivePrice,
      data.referenceNewPrice,
      data.isFree
    );

    const uniqueSuffix = crypto.randomBytes(3).toString("hex");
    const slug = `${slugify(data.title)}-${uniqueSuffix}`;
    const baseLat = neighborhood?.lat ?? city.lat;
    const baseLng = neighborhood?.lng ?? city.lng;
    const jitter = addPrivacyJitter(baseLat, baseLng, slug);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const hasExplicitCover = data.images.some((img) => img.isCover);

    const created = await prisma.listing.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        sellerId: user.id,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId || null,
        status: "ACTIVE",
        condition: data.condition,
        isFree: data.isFree,
        currency: data.currency,
        price: effectivePrice,
        referenceNewPrice: data.isFree ? null : data.referenceNewPrice ?? null,
        referenceNewUrl: cleanRefUrl,
        savingsPercent,
        isNegotiable: data.isFree ? false : data.isNegotiable,
        acceptsTrade: data.isFree ? false : data.acceptsTrade,
        pickupInPerson: scheduleVisitOnly ? false : data.pickupInPerson,
        publicMeetup: scheduleVisitOnly ? false : data.publicMeetup,
        localDelivery: scheduleVisitOnly ? false : data.localDelivery,
        localDeliveryFree: scheduleVisitOnly ? false : data.localDelivery && data.localDeliveryFree,
        nationalShipping: scheduleVisitOnly ? false : data.nationalShipping,
        nationalShippingFree:
          scheduleVisitOnly ? false : data.nationalShipping && data.nationalShippingFree,
        scheduleVisitOnly,
        showWhatsapp: data.showWhatsapp,
        departmentId: data.departmentId,
        cityId: data.cityId,
        neighborhoodId: data.neighborhoodId || null,
        approxLat: jitter.lat,
        approxLng: jitter.lng,
        vehicleBrand: data.vehicleBrand || null,
        vehicleModel: data.vehicleModel || null,
        vehicleYear: data.vehicleYear ?? null,
        vehicleMileageKm: data.vehicleMileageKm ?? null,
        vehicleFuel: data.vehicleFuel || null,
        vehicleTransmission: data.vehicleTransmission || null,
        vehicleDocs: data.vehicleDocs || null,
        realEstateOperation: data.realEstateOperation || null,
        realEstateType: data.realEstateType || null,
        areaTotalM2: data.areaTotalM2 ?? null,
        areaBuiltM2: data.areaBuiltM2 ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        parkingSpaces: data.parkingSpaces ?? null,
        furnished: data.furnished ?? null,
        apparelSize: data.apparelSize || null,
        apparelBrand: data.apparelBrand || null,
        apparelGender: data.apparelGender || null,
        expiresAt,
        images: {
          create: data.images.map((img, idx) => ({
            url: img.url,
            order: idx,
            isCover: hasExplicitCover ? Boolean(img.isCover) : idx === 0,
          })),
        },
      },
      include: LISTING_INCLUDE,
    });

    // Trigger alerts for matching saved searches (non-blocking)
    await notifySavedSearchesOnNewListing({
      id: created.id,
      slug: created.slug,
      title: created.title,
      description: created.description,
      sellerId: created.sellerId,
      categorySlug: category.slug,
      departmentSlug: department.slug,
      citySlug: city.slug,
      currency: created.currency,
      price: created.price,
      isFree: created.isFree,
      savingsPercent: created.savingsPercent,
      acceptsTrade: created.acceptsTrade,
    });

    return NextResponse.json({ listing: serializeListing(created) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/listings error:", error);
    return NextResponse.json({ error: "No se pudo crear la publicación" }, { status: 500 });
  }
}
