import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        listing: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    await prisma.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        body: m.body,
        kind: m.kind,
        offerAmount: m.offerAmount,
        offerCurrency: m.offerCurrency,
        offerStatus: m.offerStatus,
        readAt: m.readAt ? m.readAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Error cargando mensajes" }, { status: 500 });
  }
}

const sendMsgSchema = z.object({
  body: z.string().trim().max(1500).optional(),
  offerAmount: z.number().positive().optional(),
  offerCurrency: z.enum(["PYG", "USD"]).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: { listing: { select: { id: true, title: true, currency: true } } },
    });
    if (!conv || (conv.buyerId !== user.id && conv.sellerId !== user.id)) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const reqBody = await request.json();
    const parsed = sendMsgSchema.safeParse(reqBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
    }

    const isOffer = typeof parsed.data.offerAmount === "number" && parsed.data.offerAmount > 0;
    const textBody = parsed.data.body?.trim() || "";
    if (!isOffer && !textBody) {
      return NextResponse.json({ error: "Escribí un mensaje o un monto de oferta" }, { status: 400 });
    }

    let finalBody = textBody;
    const currency = parsed.data.offerCurrency || (conv.listing.currency as "PYG" | "USD");

    if (isOffer) {
      await prisma.message.updateMany({
        where: { conversationId: id, kind: "OFFER", offerStatus: "PENDING" },
        data: { offerStatus: "COUNTERED" },
      });
      const formattedAmt =
        currency === "USD"
          ? `US$ ${Math.round(parsed.data.offerAmount!).toLocaleString("es-PY")}`
          : `Gs. ${Math.round(parsed.data.offerAmount!).toLocaleString("es-PY")}`;
      if (!finalBody) {
        finalBody =
          conv.sellerId === user.id
            ? `Te propongo contraoferta de ${formattedAmt}.`
            : `Te ofrezco ${formattedAmt}.`;
      }
    }

    const msg = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: user.id,
        body: finalBody,
        kind: isOffer ? "OFFER" : "TEXT",
        offerAmount: isOffer ? parsed.data.offerAmount! : null,
        offerCurrency: isOffer ? currency : null,
        offerStatus: isOffer ? "PENDING" : null,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const recipientId = conv.buyerId === user.id ? conv.sellerId : conv.buyerId;
    const formattedTitle = isOffer
      ? `${conv.sellerId === user.id ? "Contraoferta" : "Oferta"} de ${user.name}`
      : `Mensaje de ${user.name}`;
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "MESSAGE",
        title: formattedTitle,
        body: `${conv.listing.title}: "${finalBody.slice(0, 90)}"`,
        linkUrl: `/chat?c=${conv.id}`,
        listingId: conv.listing.id,
      },
    });

    return NextResponse.json(
      {
        message: {
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          body: msg.body,
          kind: msg.kind,
          offerAmount: msg.offerAmount,
          offerCurrency: msg.offerCurrency,
          offerStatus: msg.offerStatus,
          readAt: null,
          createdAt: msg.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
  }
}
