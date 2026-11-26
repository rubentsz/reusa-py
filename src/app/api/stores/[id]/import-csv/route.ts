import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { computeSavingsPercent, sanitizeExternalUrl, slugify } from "@/lib/format";

const importCsvSchema = z.object({
  csvText: z.string().min(5, "Pegá o subí un archivo CSV con al menos un producto").max(250000),
});

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCondition(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "brand_new" || v === "nuevo" || v === "new") return "BRAND_NEW";
  if (v === "outlet" || v === "exhibicion" || v === "saldo") return "OUTLET";
  if (v === "like_new" || v === "como nuevo" || v === "sin uso") return "LIKE_NEW";
  if (v === "very_good" || v === "muy bueno") return "VERY_GOOD";
  if (v === "good" || v === "bueno" || v === "usado") return "GOOD";
  return "BRAND_NEW";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const store = await prisma.commercialStore.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        city: true,
        department: true,
        category: true,
        _count: { select: { listings: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    if (store.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para importar catálogo" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = importCsvSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "CSV inválido" },
        { status: 400 }
      );
    }

    const lines = parsed.data.csvText
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "El CSV debe tener una fila de encabezados y al menos una fila de producto" },
        { status: 400 }
      );
    }

    // Auto-detect comma vs semicolon (Excel in Spanish often exports ;)
    const headerLine = lines[0];
    const delimiter =
      (headerLine.match(/;/g)?.length || 0) > (headerLine.match(/,/g)?.length || 0) ? ";" : ",";
    const headers = parseCsvLine(headerLine, delimiter).map(normalizeHeader);

    const [categories, fallbackCity] = await Promise.all([
      prisma.category.findMany({ select: { id: true, slug: true, parentId: true } }),
      store.cityId
        ? Promise.resolve(null)
        : prisma.city.findFirst({
            where: { slug: "asuncion-ciudad" },
            select: { id: true, departmentId: true, lat: true, lng: true },
          }),
    ]);

    const catBySlug = new Map(categories.map((c) => [c.slug, c]));
    const defaultCategoryId =
      store.categoryId || categories.find((c) => c.slug === "otros")?.id || categories[0]?.id;

    const deptId = store.departmentId || fallbackCity?.departmentId;
    const cityId = store.cityId || fallbackCity?.id;
    const baseLat = store.approxLat ?? store.city?.lat ?? fallbackCity?.lat ?? -25.2967;
    const baseLng = store.approxLng ?? store.city?.lng ?? fallbackCity?.lng ?? -57.6359;

    if (!defaultCategoryId || !deptId || !cityId) {
      return NextResponse.json(
        { error: "Configurá primero el departamento y ciudad de tu tienda" },
        { status: 400 }
      );
    }

    let remainingQuota = Math.max(0, store.maxProducts - store._count.listings);
    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    for (let r = 1; r < lines.length; r++) {
      if (remainingQuota <= 0) {
        errors.push(`Fila ${r + 1}: límite máximo de ${store.maxProducts} productos alcanzado.`);
        skippedCount++;
        continue;
      }

      const cols = parseCsvLine(lines[r], delimiter);
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          const idx = headers.indexOf(k);
          if (idx !== -1 && cols[idx] !== undefined) return cols[idx].trim();
        }
        return "";
      };

      const title = getVal("titulo", "title", "nombre", "producto");
      const priceRaw = getVal("precio", "price").replace(/[^\d.]/g, "");
      const price = Number(priceRaw);
      const currencyRaw = getVal("moneda", "currency").toUpperCase();
      const currency = currencyRaw === "USD" || currencyRaw === "US$" ? "USD" : "PYG";
      const refRaw = getVal("precio_anterior", "precio_nuevo", "reference_price", "precio_lista").replace(
        /[^\d.]/g,
        ""
      );
      const referenceNewPrice = refRaw && Number(refRaw) > price ? Number(refRaw) : null;
      const condition = parseCondition(getVal("condicion", "condition", "estado"));
      const stockRaw = getVal("stock", "cantidad", "stock_quantity").replace(/[^\d]/g, "");
      const stockQuantity = stockRaw ? Number(stockRaw) : null;
      const sku = getVal("sku", "codigo", "code") || null;
      const description =
        getVal("descripcion", "description", "detalle") ||
        `${title} — Disponible en ${store.name} (${store.city?.name || "Paraguay"}).`;
      const catSlug = getVal("categoria", "categoria_slug", "category").toLowerCase();
      const photoUrlRaw = getVal("foto", "foto_url", "imagen", "image_url");

      if (!title || title.length < 3 || Number.isNaN(price) || price <= 0) {
        errors.push(`Fila ${r + 1}: requiere título válido y precio mayor a 0.`);
        skippedCount++;
        continue;
      }

      const matchedCat = catBySlug.get(catSlug);
      const categoryId = matchedCat?.parentId || matchedCat?.id || defaultCategoryId;
      const subcategoryId = matchedCat?.parentId ? matchedCat.id : null;

      let imageUrl = "/uploads/seed/laptop.jpg";
      if (photoUrlRaw) {
        if (photoUrlRaw.startsWith("/")) {
          imageUrl = photoUrlRaw;
        } else {
          const safe = sanitizeExternalUrl(photoUrlRaw);
          if (safe) imageUrl = safe;
        }
      } else if (store.logoUrl) {
        imageUrl = store.logoUrl;
      }

      const slug = `${slugify(title)}-${crypto.randomBytes(3).toString("hex")}`;
      const savingsPercent = computeSavingsPercent(price, referenceNewPrice, false);

      await prisma.listing.create({
        data: {
          slug,
          title: title.slice(0, 120),
          description: description.slice(0, 3800),
          sellerId: store.ownerId,
          storeId: store.id,
          categoryId,
          subcategoryId,
          status: "ACTIVE",
          condition,
          sku: sku ? sku.slice(0, 48) : null,
          stockQuantity,
          isFree: false,
          currency,
          price,
          referenceNewPrice,
          savingsPercent,
          isFeatured: store.planTier !== "BASIC",
          pickupInPerson: true,
          localDelivery: true,
          nationalShipping: true,
          showWhatsapp: true,
          departmentId: deptId,
          cityId,
          approxLat: baseLat,
          approxLng: baseLng,
          expiresAt,
          images: {
            create: [{ url: imageUrl, order: 0, isCover: true }],
          },
        },
      });

      createdCount++;
      remainingQuota--;
    }

    return NextResponse.json({
      ok: true,
      createdCount,
      skippedCount,
      errors: errors.slice(0, 15),
    });
  } catch (error) {
    console.error("POST /api/stores/[id]/import-csv error:", error);
    return NextResponse.json({ error: "Error importando CSV" }, { status: 500 });
  }
}
