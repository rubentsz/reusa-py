import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildListingWhere } from "@/lib/listings-query";
import type { ListingFilters } from "@/types/marketplace";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ savedSearches: [] });
  }

  try {
    const rows = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const savedSearches = await Promise.all(
      rows.map(async (row) => {
        let query: ListingFilters = {};
        try {
          query = JSON.parse(row.queryJson) as ListingFilters;
        } catch {
          query = {};
        }
        const matchCount = await prisma.listing.count({
          where: buildListingWhere(query),
        });
        return {
          id: row.id,
          name: row.name,
          queryJson: row.queryJson,
          query,
          matchCount,
          createdAt: row.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ savedSearches });
  } catch (error) {
    console.error("GET /api/saved-searches error:", error);
    return NextResponse.json({ error: "Error cargando búsquedas guardadas" }, { status: 500 });
  }
}

const createSavedSearchSchema = z.object({
  name: z.string().trim().min(2, "Poné un nombre a tu alerta").max(80),
  query: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para guardar alertas" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSavedSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const created = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        queryJson: JSON.stringify(parsed.data.query),
      },
    });

    return NextResponse.json(
      {
        savedSearch: {
          id: created.id,
          name: created.name,
          queryJson: created.queryJson,
          query: parsed.data.query,
          matchCount: 0,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/saved-searches error:", error);
    return NextResponse.json({ error: "No se pudo guardar la búsqueda" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  await prisma.savedSearch.deleteMany({
    where: { id, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
