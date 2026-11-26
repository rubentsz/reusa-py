import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await prisma.commercialStore.findUnique({
      where: { slug },
      include: { city: { select: { name: true } } },
    });
    if (!store) {
      return { title: "Tienda Oficial — ReUsa PY" };
    }
    return {
      title: `${store.name} — Tienda Oficial 3D | ReUsa PY`,
      description:
        store.description ||
        `${store.tagline} · Explorá el showroom 3D y catálogo oficial de ${store.name}${
          store.city ? ` en ${store.city.name}` : ""
        }.`,
    };
  } catch {
    return { title: "Tienda Oficial — ReUsa PY" };
  }
}

export default async function CommercialStoreDirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getBootstrapData();
  const matched = data.initialCommercialStores.find((s) => s.slug === slug);

  return (
    <ReUsaShell
      {...data}
      initialCommercialStoreSlug={matched ? matched.slug : undefined}
      initialRoute={
        matched
          ? undefined
          : { kind: "commercialStore", payload: { slug }, title: "Tienda Oficial" }
      }
    />
  );
}
