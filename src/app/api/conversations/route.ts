import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ conversations: [], totalUnread: 0 });
  }

  try {
    const rows = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            currency: true,
            isFree: true,
            status: true,
            showWhatsapp: true,
            images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
          },
        },
        buyer: { select: { id: true, name: true, avatarUrl: true, whatsappPhone: true } },
        seller: { select: { id: true, name: true, avatarUrl: true, whatsappPhone: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const unreadCounts = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: rows.map((r) => r.id) },
        senderId: { not: user.id },
        readAt: null,
      },
      _count: { id: true },
    });
    const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count.id]));

    let totalUnread = 0;
    const conversations = rows.map((row) => {
      const other = row.buyerId === user.id ? row.seller : row.buyer;
      const unreadCount = unreadMap.get(row.id) ?? 0;
      totalUnread += unreadCount;
      const lastMsg = row.messages[0] ?? null;

      return {
        id: row.id,
        listingId: row.listingId,
        listing: {
          id: row.listing.id,
          slug: row.listing.slug,
          title: row.listing.title,
          price: row.listing.price,
          currency: row.listing.currency,
          isFree: row.listing.isFree,
          status: row.listing.status,
          images: row.listing.images,
        },
        buyerId: row.buyerId,
        sellerId: row.sellerId,
        otherUser: {
          id: other.id,
          name: other.name,
          avatarUrl: other.avatarUrl,
          whatsappPhone:
            other.id === row.sellerId && !row.listing.showWhatsapp ? null : other.whatsappPhone,
        },
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              body: lastMsg.body,
              kind: lastMsg.kind as "TEXT" | "OFFER",
              offerAmount: lastMsg.offerAmount,
              offerCurrency: lastMsg.offerCurrency as "PYG" | "USD" | null,
              offerStatus: lastMsg.offerStatus as
                | "PENDING"
                | "ACCEPTED"
                | "REJECTED"
                | "COUNTERED"
                | null,
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt.toISOString(),
              readAt: lastMsg.readAt ? lastMsg.readAt.toISOString() : null,
            }
          : null,
        unreadCount,
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ conversations, totalUnread });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json({ error: "Error cargando mensajes" }, { status: 500 });
  }
}

const createConvSchema = z.object({
  listingId: z.string().min(1),
  initialMessage: z.string().trim().max(1500).optional(),
  offerAmount: z.number().positive().optional(),
  offerCurrency: z.enum(["PYG", "USD"]).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para chatear" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createConvSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: { id: true, slug: true, title: true, sellerId: true, currency: true, isFree: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }
    if (listing.sellerId === user.id) {
      return NextResponse.json(
        { error: "No podés iniciar un chat con tu propia publicación" },
        { status: 400 }
      );
    }

    let conversation = await prisma.conversation.findUnique({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: user.id } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          listingId: listing.id,
          buyerId: user.id,
          sellerId: listing.sellerId,
        },
      });
    }

    const hasOffer = typeof parsed.data.offerAmount === "number" && parsed.data.offerAmount > 0;
    if (hasOffer) {
      const currency = parsed.data.offerCurrency || (listing.currency as "PYG" | "USD");
      await prisma.message.updateMany({
        where: { conversationId: conversation.id, kind: "OFFER", offerStatus: "PENDING" },
        data: { offerStatus: "COUNTERED" },
      });
      const formattedAmt =
        currency === "USD"
          ? `US$ ${Math.round(parsed.data.offerAmount!).toLocaleString("es-PY")}`
          : `Gs. ${Math.round(parsed.data.offerAmount!).toLocaleString("es-PY")}`;
      const note = parsed.data.initialMessage?.trim() || `Te ofrezco ${formattedAmt} por este producto.`;

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          body: note,
          kind: "OFFER",
          offerAmount: parsed.data.offerAmount!,
          offerCurrency: currency,
          offerStatus: "PENDING",
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: "MESSAGE",
          title: `Nueva oferta de ${user.name}: ${formattedAmt}`,
          body: `${listing.title} — "${note.slice(0, 90)}"`,
          linkUrl: `/chat?c=${conversation.id}`,
          listingId: listing.id,
        },
      });
    } else if (parsed.data.initialMessage && parsed.data.initialMessage.length > 0) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          body: parsed.data.initialMessage,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      await prisma.notification.create({
        data: {
          userId: listing.sellerId,
          type: "MESSAGE",
          title: `Nuevo mensaje de ${user.name}`,
          body: `${listing.title}: "${parsed.data.initialMessage.slice(0, 90)}"`,
          linkUrl: `/chat?c=${conversation.id}`,
          listingId: listing.id,
        },
      });
    }

    return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json({ error: "No se pudo abrir el chat" }, { status: 500 });
  }
}
