"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  BookmarkCheck,
  Check,
  ExternalLink,
  MessageCircle,
  Phone,
  Repeat2,
  Send,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import type { MessageDTO } from "@/types/marketplace";
import { buildWhatsappUrl, formatPrice, formatRelativeDate } from "@/lib/format";

export function ChatView({
  initialConversationId,
  isMobile = false,
}: {
  initialConversationId?: string;
  isMobile?: boolean;
}) {
  const {
    user,
    conversations,
    refreshConversations,
    refreshListings,
    openListing,
    openAuth,
    notifyToast,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Interactive Offer / Counter-Offer Composer
  const [showOfferBox, setShowOfferBox] = useState(false);
  const [offerAmountInput, setOfferAmountInput] = useState("");
  const [offerNoteInput, setOfferNoteInput] = useState("");
  const [offerActionBusyId, setOfferActionBusyId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
    } else if (!isMobile && !selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [initialConversationId, conversations, isMobile, selectedId]);

  const activeConv = conversations.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    setShowOfferBox(false);
    setOfferAmountInput("");
    setOfferNoteInput("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !user) return;
    let active = true;

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedId}/messages`);
        if (res.ok && active) {
          const data = await res.json();
          setMessages(data.messages ?? []);
          refreshConversations();
        }
      } catch {}
    };

    loadMessages();
    const interval = setInterval(loadMessages, 4500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedId, user, refreshConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <MessageCircle className="h-10 w-10 text-[#0067c0]" />
        <h2 className="mt-3 text-base font-bold text-slate-900">Tus mensajes en ReUsa PY</h2>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          Iniciá sesión para chatear directo con compradores y vendedores y negociar ofertas sin
          exponer tu número.
        </p>
        <button
          type="button"
          onClick={openAuth}
          className="mt-4 rounded-xl bg-[#0067c0] px-5 py-2.5 text-sm font-bold text-white"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
      refreshConversations();
    } catch {
      notifyToast("No se pudo enviar el mensaje", "error");
    } finally {
      setSending(false);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !activeConv) return;
    const numeric = Number(offerAmountInput);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      notifyToast("Ingresá un monto válido para tu oferta", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerAmount: numeric,
          offerCurrency: activeConv.listing.currency,
          body: offerNoteInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [
        ...prev.map((m) =>
          m.kind === "OFFER" && m.offerStatus === "PENDING"
            ? { ...m, offerStatus: "COUNTERED" as const }
            : m
        ),
        data.message,
      ]);
      setShowOfferBox(false);
      setOfferAmountInput("");
      setOfferNoteInput("");
      refreshConversations();
      notifyToast(
        activeConv.sellerId === user.id ? "Contraoferta enviada" : "Oferta enviada",
        "success"
      );
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "No se pudo enviar la oferta", "error");
    } finally {
      setSending(false);
    }
  };

  const handleOfferAction = async (
    messageId: string,
    action: "ACCEPT" | "REJECT" | "RESERVE_LISTING"
  ) => {
    if (!selectedId) return;
    setOfferActionBusyId(messageId);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === "RESERVE_LISTING") {
        await Promise.all([refreshConversations(), refreshListings()]);
        notifyToast("¡Aviso marcado como Reservado! Avisamos al comprador.", "success");
      } else if (data.message) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? data.message : m)));
        refreshConversations();
        notifyToast(
          action === "ACCEPT" ? "¡Oferta aceptada! Podés marcar el aviso como reservado." : "Oferta rechazada",
          action === "ACCEPT" ? "success" : "info"
        );
      }
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "No se pudo actualizar la oferta", "error");
    } finally {
      setOfferActionBusyId(null);
    }
  };

  const openCounterOfferComposer = (suggestedAmount?: number) => {
    if (suggestedAmount && suggestedAmount > 0) {
      setOfferAmountInput(String(Math.round(suggestedAmount)));
    }
    setShowOfferBox(true);
  };

  const showList = !isMobile || !selectedId;
  const showThread = !isMobile || Boolean(selectedId);

  const isSellerInActive = activeConv ? activeConv.sellerId === user.id : false;

  return (
    <div className="flex h-full bg-white">
      {/* Conversations List */}
      {showList && (
        <aside
          className={`fluent-scroll flex flex-col overflow-y-auto border-r border-slate-200/80 bg-[#f8fafd] ${
            isMobile ? "w-full" : "w-72 shrink-0"
          }`}
        >
          <div className="border-b border-slate-200/80 bg-white px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">Conversaciones y Ofertas</h2>
            <p className="text-[11px] text-slate-500">
              {conversations.length} {conversations.length === 1 ? "chat activo" : "chats activos"}
            </p>
          </div>

          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Todavía no tenés mensajes. Abrí cualquier publicación y tocá &quot;Chatear&quot; o
              &quot;Hacer oferta&quot; para negociar directo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const thumb = conv.listing.images[0]?.url;
                const lastIsOffer = conv.lastMessage?.kind === "OFFER" && conv.lastMessage.offerAmount;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition ${
                      isSelected ? "bg-[#0067c0]/10" : "hover:bg-white"
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-slate-900">
                          {conv.otherUser.name}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="rounded-full bg-[#0067c0] px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] font-semibold text-[#0067c0]">
                        {conv.listing.title}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {lastIsOffer
                          ? `💰 Oferta: ${formatPrice(
                              conv.lastMessage!.offerAmount!,
                              conv.lastMessage!.offerCurrency || conv.listing.currency
                            )}`
                          : conv.lastMessage?.body || "Conversación iniciada"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      )}

      {/* Active Message Thread */}
      {showThread && (
        <div className="flex min-w-0 flex-1 flex-col bg-[#f5f8fc]">
          {activeConv ? (
            <>
              <header className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {activeConv.otherUser.name}
                      </p>
                      {activeConv.listing.status === "RESERVED" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                          Reservado
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openListing(activeConv.listing.slug, activeConv.listing.title)}
                      className="inline-flex max-w-full items-center gap-1 truncate text-[11px] font-semibold text-[#0067c0] hover:underline"
                    >
                      <span className="truncate">{activeConv.listing.title}</span>
                      <span>
                        (
                        {formatPrice(
                          activeConv.listing.price,
                          activeConv.listing.currency,
                          activeConv.listing.isFree
                        )}
                        )
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </button>
                  </div>
                </div>

                {activeConv.otherUser.whatsappPhone && (
                  <a
                    href={buildWhatsappUrl(
                      activeConv.otherUser.whatsappPhone,
                      activeConv.listing.title
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Phone className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </header>

              <div className="fluent-scroll flex-1 space-y-2.5 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="rounded-xl bg-white p-4 text-center text-xs text-slate-500 shadow-xs">
                    Enviá el primer mensaje o tocá el botón de oferta para negociar el precio.
                  </div>
                )}
                {messages.map((m) => {
                  const isMine = m.senderId === user.id;

                  if (m.kind === "OFFER" && m.offerAmount != null) {
                    const cur = m.offerCurrency || activeConv.listing.currency;
                    const diffPct =
                      activeConv.listing.price > 0
                        ? Math.round(
                            ((m.offerAmount - activeConv.listing.price) /
                              activeConv.listing.price) *
                              100
                          )
                        : null;
                    const busy = offerActionBusyId === m.id;
                    const statusBadge =
                      m.offerStatus === "ACCEPTED"
                        ? { label: "✓ Oferta aceptada", cls: "bg-emerald-100 text-emerald-800" }
                        : m.offerStatus === "REJECTED"
                        ? { label: "✕ Rechazada", cls: "bg-rose-100 text-rose-700" }
                        : m.offerStatus === "COUNTERED"
                        ? { label: "↻ Superada", cls: "bg-slate-100 text-slate-500" }
                        : { label: "⏳ Pendiente", cls: "bg-amber-100 text-amber-800" };

                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`animate-modal-in w-full max-w-[330px] overflow-hidden rounded-2xl border-2 bg-white shadow-sm ${
                            m.offerStatus === "ACCEPTED"
                              ? "border-emerald-400"
                              : m.offerStatus === "PENDING"
                              ? "border-amber-400"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/90 px-3.5 py-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-800">
                              <BadgeDollarSign className="h-3.5 w-3.5 text-amber-500" />
                              {isMine
                                ? isSellerInActive
                                  ? "Tu contraoferta"
                                  : "Tu oferta"
                                : isSellerInActive
                                ? "Oferta del comprador"
                                : "Contraoferta del vendedor"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusBadge.cls}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          <div className="p-3.5">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <span className="text-xl font-black tracking-tight text-slate-900">
                                {formatPrice(m.offerAmount, cur)}
                              </span>
                              {diffPct !== null && diffPct !== 0 && (
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                    diffPct < 0
                                      ? "bg-sky-50 text-[#0067c0]"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`} vs lista
                                </span>
                              )}
                            </div>

                            {m.body && (
                              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                                {m.body}
                              </p>
                            )}

                            {/* Action Buttons for Recipient of PENDING offer */}
                            {m.offerStatus === "PENDING" && !isMine && (
                              <div className="mt-3 grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleOfferAction(m.id, "ACCEPT")}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2 text-[11px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <Check className="h-3.5 w-3.5" /> Aceptar
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    openCounterOfferComposer(
                                      Math.round((m.offerAmount! + activeConv.listing.price) / 2)
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-2 py-2 text-[11px] font-extrabold text-white transition hover:bg-amber-600 disabled:opacity-50"
                                >
                                  <Repeat2 className="h-3.5 w-3.5" /> Contra
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleOfferAction(m.id, "REJECT")}
                                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5" /> No
                                </button>
                              </div>
                            )}

                            {/* 1-Click Reserve Listing button for Seller after offer accepted */}
                            {m.offerStatus === "ACCEPTED" &&
                              isSellerInActive &&
                              activeConv.listing.status === "ACTIVE" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleOfferAction(m.id, "RESERVE_LISTING")}
                                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 py-2 text-xs font-extrabold text-white shadow-xs transition hover:brightness-110 disabled:opacity-50"
                                >
                                  <BookmarkCheck className="h-4 w-4" />
                                  Marcar aviso como Reservado
                                </button>
                              )}

                            <p className="mt-2 text-right text-[10px] text-slate-400">
                              {formatRelativeDate(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                          isMine
                            ? "rounded-br-sm bg-[#0067c0] text-white"
                            : "rounded-bl-sm border border-slate-200/80 bg-white text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            isMine ? "text-sky-100" : "text-slate-400"
                          }`}
                        >
                          {formatRelativeDate(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Inline Offer / Counter-Offer Drawer */}
              {showOfferBox && !activeConv.listing.isFree && (
                <form
                  onSubmit={handleSendOffer}
                  className="animate-sheet-up border-t border-amber-200 bg-amber-50/90 px-3.5 py-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-950">
                      <BadgeDollarSign className="h-4 w-4 text-amber-600" />
                      {isSellerInActive ? "Enviar contraoferta" : "Enviar nueva oferta"} (
                      {activeConv.listing.currency})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOfferBox(false)}
                      className="rounded-full p-1 text-amber-800 hover:bg-amber-200/60"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Quick % Suggestion Pills */}
                  {activeConv.listing.price > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {[0.9, 0.85, 0.8].map((mult) => {
                        const suggested =
                          activeConv.listing.currency === "PYG"
                            ? Math.round((activeConv.listing.price * mult) / 5000) * 5000
                            : Math.round(activeConv.listing.price * mult);
                        const pctOff = Math.round((1 - mult) * 100);
                        return (
                          <button
                            key={mult}
                            type="button"
                            onClick={() => setOfferAmountInput(String(suggested))}
                            className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                          >
                            -{pctOff}% ({formatPrice(suggested, activeConv.listing.currency)})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={offerAmountInput}
                      onChange={(e) => setOfferAmountInput(e.target.value)}
                      placeholder={`Monto en ${activeConv.listing.currency}`}
                      className="w-40 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-600"
                    />
                    <input
                      type="text"
                      value={offerNoteInput}
                      onChange={(e) => setOfferNoteInput(e.target.value)}
                      placeholder="Nota opcional (ej. Paso hoy en efectivo)"
                      className="min-w-[160px] flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-600"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      Enviar oferta
                    </button>
                  </div>
                </form>
              )}

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-slate-200/80 bg-white p-3"
              >
                {!activeConv.listing.isFree && (
                  <button
                    type="button"
                    onClick={() => setShowOfferBox((v) => !v)}
                    title={isSellerInActive ? "Enviar contraoferta" : "Hacer oferta"}
                    className={`inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold transition ${
                      showOfferBox
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    <BadgeDollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isSellerInActive ? "Contraoferta" : "Ofertar"}
                    </span>
                  </button>
                )}
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Escribí un mensaje..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-[#0067c0] focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0067c0] text-white transition hover:bg-[#0058a6] disabled:opacity-50"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
              <MessageCircle className="mb-2 h-8 w-8 text-slate-300" />
              Elegí una conversación para ver mensajes y ofertas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
