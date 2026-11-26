import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const updateOfferSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT", "RESERVE_LISTING"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { id, messageId } = await context.params;
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, title: true, sellerId: true, status: true } },
      },
    });
    if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || msg.conversationId !== id || msg.kind !== "OFFER") {
      return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const { action } = parsed.data;

    if (action === "RESERVE_LISTING") {
      if (conv.sellerId !== user.id && user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Solo el vendedor puede marcar el aviso como reservado" },
          { status: 403 }
        );
      }
      await prisma.listing.update({
        where: { id: conv.listing.id },
        data: { status: "RESERVED" },
      });
      await prisma.notification.create({
        data: {
          userId: conv.buyerId,
          type: "FAV_STATUS",
          title: "¡Producto reservado para vos!",
          body: `${user.name} marcó "${conv.listing.title}" como Reservado.`,
          linkUrl: `/chat?c=${conv.id}`,
          listingId: conv.listing.id,
        },
      });
      return NextResponse.json({ reserved: true });
    }

    // Only the recipient of a PENDING offer can accept or reject it
    if (msg.senderId === user.id) {
      return NextResponse.json(
        { error: "Esperá la respuesta de la otra parte sobre tu oferta" },
        { status: 400 }
      );
    }
    if (msg.offerStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Esta oferta ya fue respondida" },
        { status: 400 }
      );
    }

    const nextStatus = action === "ACCEPT" ? "ACCEPTED" : "REJECTED";
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { offerStatus: nextStatus },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const formattedAmt =
      msg.offerCurrency === "USD"
        ? `US$ ${Math.round(msg.offerAmount || 0).toLocaleString("es-PY")}`
        : `Gs. ${Math.round(msg.offerAmount || 0).toLocaleString("es-PY")}`;

    await prisma.notification.create({
      data: {
        userId: msg.senderId,
        type: "MESSAGE",
        title:
          nextStatus === "ACCEPTED"
            ? `¡${user.name} aceptó tu oferta de ${formattedAmt}!`
            : `${user.name} rechazó tu oferta de ${formattedAmt}`,
        body: conv.listing.title,
        linkUrl: `/chat?c=${conv.id}`,
        listingId: conv.listing.id,
      },
    });

    return NextResponse.json({
      message: {
        id: updated.id,
        conversationId: updated.conversationId,
        senderId: updated.senderId,
        body: updated.body,
        kind: updated.kind,
        offerAmount: updated.offerAmount,
        offerCurrency: updated.offerCurrency,
        offerStatus: updated.offerStatus,
        readAt: updated.readAt ? updated.readAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/conversations/[id]/messages/[messageId] error:", error);
    return NextResponse.json({ error: "Error procesando la oferta" }, { status: 500 });
  }
}
