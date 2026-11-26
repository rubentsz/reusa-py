import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  COMMERCIAL_STORE_INCLUDE,
  getActiveCommercialStores,
  serializeCommercialStore,
} from "@/lib/stores-query";
import { STORE_PLANS } from "@/lib/storePlans";
import { sanitizeExternalUrl, slugify } from "@/lib/format";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get("includeAll") === "true";
    const mine = searchParams.get("mine") === "true";
    const user = await getCurrentUser();

    if (includeAll) {
      if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
      }
      const rows = await prisma.commercialStore.findMany({
        include: COMMERCIAL_STORE_INCLUDE,
        orderBy: [{ slotOrder: "asc" }, { createdAt: "desc" }],
      });
      return NextResponse.json({
        stores: rows.map((r) => serializeCommercialStore(r, true)),
      });
    }

    if (mine) {
      if (!user) {
        return NextResponse.json({ stores: [] });
      }
      const rows = await prisma.commercialStore.findMany({
        where: user.role === "ADMIN" ? {} : { ownerId: user.id },
        include: COMMERCIAL_STORE_INCLUDE,
        orderBy: [{ slotOrder: "asc" }, { createdAt: "desc" }],
      });
      return NextResponse.json({
        stores: rows.map((r) => serializeCommercialStore(r, true)),
      });
    }

    const stores = await getActiveCommercialStores();
    return NextResponse.json({ stores });
  } catch (error) {
    console.error("GET /api/stores error:", error);
    return NextResponse.json({ error: "Error cargando tiendas comerciales" }, { status: 500 });
  }
}

const createStoreSchema = z.object({
  name: z.string().trim().min(2, "Ingresá el nombre del local").max(80),
  slug: z.string().trim().max(70).optional(),
  tagline: z.string().trim().max(110).optional(),
  description: z.string().trim().max(2000).optional(),
  ownerEmail: z.string().trim().email("Email del dueño inválido"),
  ownerName: z.string().trim().max(80).optional(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["PENDING", "ACTIVE", "PAUSED", "EXPIRED"]).default("ACTIVE"),
  planTier: z.enum(["BASIC", "FEATURED", "FLAGSHIP"]).default("FEATURED"),
  maxProducts: z.number().int().min(1).max(2000).optional(),
  monthlyPricePyg: z.number().min(0).optional(),
  durationDays: z.number().int().min(1).max(1825).default(30),
  slotOrder: z.number().int().min(0).max(9999).optional(),
  logoUrl: z.string().max(500).optional().nullable(),
  bannerUrl: z.string().max(500).optional().nullable(),
  facadeColor: z.string().trim().max(20).default("#ecfeff"),
  neonColor: z.string().trim().max(20).default("#00f0ff"),
  secondaryNeon: z.string().trim().max(20).default("#ff2a9d"),
  npcGreeting: z.string().trim().max(500).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  openingHours: z.string().trim().max(140).optional().nullable(),
  whatsappPhone: z.string().trim().max(40).optional().nullable(),
  instagramUrl: z.string().trim().max(300).optional().nullable(),
  websiteUrl: z.string().trim().max(300).optional().nullable(),
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo administradores pueden crear tiendas comerciales" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de tienda inválidos" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const plan = STORE_PLANS[d.planTier];

    // Find or provision owner account by email
    const normalizedEmail = d.ownerEmail.toLowerCase();
    let owner = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    let generatedPassword: string | null = null;
    if (!owner) {
      generatedPassword = `ReUsa${crypto.randomBytes(3).toString("hex")}`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      owner = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: d.ownerName?.trim() || d.name,
          passwordHash,
          role: "USER",
          whatsappPhone: d.whatsappPhone || null,
          departmentId: d.departmentId || null,
          cityId: d.cityId || null,
        },
      });
    }

    const baseSlug = slugify(d.slug || d.name) || `tienda-${crypto.randomBytes(2).toString("hex")}`;
    const existingSlug = await prisma.commercialStore.findUnique({ where: { slug: baseSlug } });
    const finalSlug = existingSlug
      ? `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`
      : baseSlug;

    let approxLat: number | null = null;
    let approxLng: number | null = null;
    if (d.cityId) {
      const city = await prisma.city.findUnique({ where: { id: d.cityId } });
      if (city) {
        approxLat = city.lat;
        approxLng = city.lng;
      }
    }

    const expiresAt = new Date(Date.now() + d.durationDays * 24 * 60 * 60 * 1000);

    const created = await prisma.commercialStore.create({
      data: {
        slug: finalSlug,
        name: d.name,
        tagline: d.tagline || "Tienda Oficial en ReUsa PY",
        description: d.description || "",
        ownerId: owner.id,
        categoryId: d.categoryId || null,
        status: d.status,
        planTier: d.planTier,
        maxProducts: d.maxProducts ?? plan.maxProducts,
        monthlyPricePyg: d.monthlyPricePyg ?? plan.monthlyPricePyg,
        expiresAt,
        slotOrder: d.slotOrder ?? plan.defaultSlotOrder,
        logoUrl: d.logoUrl || null,
        bannerUrl: d.bannerUrl || null,
        facadeColor: d.facadeColor,
        neonColor: d.neonColor,
        secondaryNeon: d.secondaryNeon,
        npcGreeting:
          d.npcGreeting ||
          `¡Bienvenido a ${d.name}! Revisá nuestro catálogo oficial y armá tu pedido directo por WhatsApp.`,
        departmentId: d.departmentId || null,
        cityId: d.cityId || null,
        address: d.address || null,
        openingHours: d.openingHours || null,
        whatsappPhone: d.whatsappPhone || owner.whatsappPhone || null,
        instagramUrl: sanitizeExternalUrl(d.instagramUrl),
        websiteUrl: sanitizeExternalUrl(d.websiteUrl),
        approxLat,
        approxLng,
      },
      include: COMMERCIAL_STORE_INCLUDE,
    });

    return NextResponse.json(
      {
        store: serializeCommercialStore(created, true),
        generatedCredentials: generatedPassword
          ? { email: owner.email, password: generatedPassword }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/stores error:", error);
    return NextResponse.json({ error: "No se pudo crear la tienda comercial" }, { status: 500 });
  }
}
