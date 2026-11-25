import { prisma } from "@/lib/prisma";
import { formatPrice, STATUS_LABELS } from "@/lib/format";

export async function notifyFavoritesOnPriceDrop(
  listingId: string,
  title: string,
  slug: string,
  currency: string,
  oldPrice: number,
  newPrice: number
) {
  if (newPrice >= oldPrice) return;
  const favorites = await prisma.favorite.findMany({
    where: { listingId },
    select: { userId: true },
  });
  if (favorites.length === 0) return;

  await prisma.notification.createMany({
    data: favorites.map((fav) => ({
      userId: fav.userId,
      type: "PRICE_DROP",
      title: "¡Bajó de precio un favorito!",
      body: `"${title}" bajó de ${formatPrice(oldPrice, currency)} a ${formatPrice(newPrice, currency)}.`,
      linkUrl: `/aviso/${slug}`,
      listingId,
    })),
  });
}

export async function notifyFavoritesOnStatusChange(
  listingId: string,
  title: string,
  slug: string,
  newStatus: string
) {
  if (newStatus !== "RESERVED" && newStatus !== "SOLD") return;
  const favorites = await prisma.favorite.findMany({
    where: { listingId },
    select: { userId: true },
  });
  if (favorites.length === 0) return;

  const label = STATUS_LABELS[newStatus] ?? newStatus;
  await prisma.notification.createMany({
    data: favorites.map((fav) => ({
      userId: fav.userId,
      type: "FAV_STATUS",
      title: `Actualización en favorito (${label})`,
      body: `"${title}" cambió su estado a ${label}.`,
      linkUrl: `/aviso/${slug}`,
      listingId,
    })),
  });
}

interface SavedQuery {
  q?: string;
  category?: string;
  department?: string;
  city?: string;
  currency?: string;
  minPrice?: number;
  maxPrice?: number;
  minSavings?: number;
  isFree?: boolean;
  acceptsTrade?: boolean;
}

export async function notifySavedSearchesOnNewListing(listing: {
  id: string;
  slug: string;
  title: string;
  description: string;
  sellerId: string;
  categorySlug: string;
  departmentSlug: string;
  citySlug: string;
  currency: string;
  price: number;
  isFree: boolean;
  savingsPercent: number | null;
  acceptsTrade: boolean;
}) {
  const searches = await prisma.savedSearch.findMany({
    where: { userId: { not: listing.sellerId } },
  });
  if (searches.length === 0) return;

  const matches: { userId: string; searchName: string }[] = [];
  const haystack = `${listing.title} ${listing.description}`.toLowerCase();

  for (const s of searches) {
    try {
      const q = JSON.parse(s.queryJson) as SavedQuery;
      if (q.q && !haystack.includes(q.q.toLowerCase())) continue;
      if (q.category && q.category !== listing.categorySlug) continue;
      if (q.department && q.department !== listing.departmentSlug) continue;
      if (q.city && q.city !== listing.citySlug) continue;
      if (q.currency && q.currency !== listing.currency) continue;
      if (typeof q.minPrice === "number" && listing.price < q.minPrice) continue;
      if (typeof q.maxPrice === "number" && listing.price > q.maxPrice) continue;
      if (typeof q.minSavings === "number" && (listing.savingsPercent ?? 0) < q.minSavings) continue;
      if (q.isFree && !listing.isFree) continue;
      if (q.acceptsTrade && !listing.acceptsTrade) continue;
      matches.push({ userId: s.userId, searchName: s.name });
    } catch {
      continue;
    }
  }

  if (matches.length === 0) return;
  await prisma.notification.createMany({
    data: matches.map((m) => ({
      userId: m.userId,
      type: "SAVED_SEARCH",
      title: `Nueva alerta: ${m.searchName}`,
      body: `Se publicó "${listing.title}" (${formatPrice(listing.price, listing.currency, listing.isFree)}).`,
      linkUrl: `/aviso/${listing.slug}`,
      listingId: listing.id,
    })),
  });
}
