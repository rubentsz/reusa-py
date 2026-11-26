import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { COMMERCIAL_STORE_INCLUDE, serializeCommercialStore } from "@/lib/stores-query";
import { STORE_PLANS, type StorePlanTier } from "@/lib/storePlans";
import { sanitizeExternalUrl, slugify } from "@/lib/format";

const patchInquirySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "APPROVED", "REJECTED"]).optional(),
  approveAndCreateStore: z.boolean().optional(),
  planTier: z.enum(["BASIC", "FEATURED", "FLAGSHIP"]).optional(),
  durationDays: z.number().int().min(1).max(1825).default(30),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const inquiry = await prisma.storeInquiry.findUnique({ where: { id } });
    if (!inquiry) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchInquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const d = parsed.data;

    if (d.approveAndCreateStore) {
      const planTier = (d.planTier || inquiry.desiredPlan || "FEATURED") as StorePlanTier;
      const plan = STORE_PLANS[planTier];

      // Find or create owner user
      const email = inquiry.contactEmail.toLowerCase();
      let owner =
        (inquiry.userId
          ? await prisma.user.findUnique({ where: { id: inquiry.userId } })
          : null) || (await prisma.user.findUnique({ where: { email } }));

      let generatedCredentials: { email: string; password: string } | null = null;
      if (!owner) {
        const tempPassword = `ReUsa${crypto.randomBytes(3).toString("hex")}`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        owner = await prisma.user.create({
          data: {
            email,
            name: inquiry.contactName,
            passwordHash,
            role: "USER",
            whatsappPhone: inquiry.contactPhone,
          },
        });
        generatedCredentials = { email, password: tempPassword };
      }

      // Match best city & category if available
      const [matchedCity, matchedCat] = await Promise.all([
        prisma.city.findFirst({
          where: { name: { contains: inquiry.cityName.slice(0, 12), mode: "insensitive" } },
        }),
        prisma.category.findFirst({
          where: {
            parentId: null,
            name: { contains: inquiry.rubro.slice(0, 10), mode: "insensitive" },
          },
        }),
      ]);

      const baseSlug = slugify(inquiry.businessName) || `local-${crypto.randomBytes(2).toString("hex")}`;
      const taken = await prisma.commercialStore.findUnique({ where: { slug: baseSlug } });
      const finalSlug = taken ? `${baseSlug}-${crypto.randomBytes(2).toString("hex")}` : baseSlug;

      const igOrWeb = inquiry.instagramOrWeb?.trim() || "";
      const instagramUrl = igOrWeb.startsWith("@")
        ? `https://instagram.com/${igOrWeb.slice(1)}`
        : igOrWeb.includes("instagram.com")
        ? sanitizeExternalUrl(igOrWeb)
        : null;
      const websiteUrl =
        igOrWeb && !instagramUrl ? sanitizeExternalUrl(igOrWeb) : null;

      const createdStore = await prisma.commercialStore.create({
        data: {
          slug: finalSlug,
          name: inquiry.businessName,
          tagline: `${inquiry.rubro} · ${inquiry.cityName}`,
          description:
            inquiry.notes ||
            `Tienda oficial de ${inquiry.businessName} en ReUsa PY (${inquiry.cityName}).`,
          ownerId: owner.id,
          categoryId: matchedCat?.id ?? null,
          status: "ACTIVE",
          planTier,
          maxProducts: plan.maxProducts,
          monthlyPricePyg: plan.monthlyPricePyg,
          expiresAt: new Date(Date.now() + d.durationDays * 24 * 60 * 60 * 1000),
          slotOrder: plan.defaultSlotOrder,
          facadeColor: "#ecfeff",
          neonColor: plan.accentColor,
          secondaryNeon: "#00f0ff",
          npcGreeting: `¡Bienvenido a ${inquiry.businessName}! Explorá nuestro catálogo y armá tu pedido por WhatsApp.`,
          departmentId: matchedCity?.departmentId ?? null,
          cityId: matchedCity?.id ?? null,
          approxLat: matchedCity?.lat ?? null,
          approxLng: matchedCity?.lng ?? null,
          whatsappPhone: inquiry.contactPhone,
          instagramUrl,
          websiteUrl,
        },
        include: COMMERCIAL_STORE_INCLUDE,
      });

      const updatedInquiry = await prisma.storeInquiry.update({
        where: { id: inquiry.id },
        data: { status: "APPROVED" },
      });

      return NextResponse.json({
        inquiry: { ...updatedInquiry, createdAt: updatedInquiry.createdAt.toISOString() },
        store: serializeCommercialStore(createdStore, true),
        generatedCredentials,
      });
    }

    const updated = await prisma.storeInquiry.update({
      where: { id: inquiry.id },
      data: { status: d.status ?? inquiry.status },
    });

    return NextResponse.json({
      inquiry: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (error) {
    console.error("PATCH /api/store-inquiries/[id] error:", error);
    return NextResponse.json({ error: "Error actualizando solicitud" }, { status: 500 });
  }
}
