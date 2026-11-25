import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.listing.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      city: { select: { name: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  if (!listing) {
    return { title: "Publicación no encontrada" };
  }

  const priceLabel = formatPrice(listing.price, listing.currency, listing.isFree);
  const savingsText = listing.savingsPercent
    ? ` · Ahorrás ${listing.savingsPercent}% vs. nuevo`
    : "";

  return {
    title: `${listing.title} (${priceLabel})`,
    description: `${priceLabel}${savingsText} en ${listing.city.name}, Paraguay. ${listing.description.slice(0, 140)}`,
    openGraph: {
      title: `${listing.title} — ${priceLabel} | ReUsa PY`,
      description: listing.description.slice(0, 160),
      images: listing.images[0]?.url ? [listing.images[0].url] : undefined,
    },
  };
}

export default async function ListingDeepLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [data, listing] = await Promise.all([
    getBootstrapData(),
    prisma.listing.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { slug: true, title: true },
    }),
  ]);

  return (
    <ReUsaShell
      {...data}
      initialRoute={{
        kind: "listing",
        payload: { slug: listing?.slug || slug },
        title: listing ? `${listing.title.slice(0, 42)} — ReUsa PY` : "Publicación — ReUsa PY",
      }}
    />
  );
}
