"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  Phone,
  Send,
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
          Iniciá sesión para chatear directo con compradores y vendedores sin exponer tu número.
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

  const showList = !isMobile || !selectedId;
  const showThread = !isMobile || Boolean(selectedId);

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
            <h2 className="text-sm font-bold text-slate-900">Conversaciones</h2>
            <p className="text-[11px] text-slate-500">
              {conversations.length} {conversations.length === 1 ? "chat activo" : "chats activos"}
            </p>
          </div>

          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Todavía no tenés mensajes. Abrí cualquier publicación y tocá &quot;Chatear&quot; para
              iniciar una conversación.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                const thumb = conv.listing.images[0]?.url;
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
                        {conv.lastMessage?.body || "Conversación iniciada"}
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
                    <p className="truncate text-sm font-bold text-slate-900">
                      {activeConv.otherUser.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => openListing(activeConv.listing.slug, activeConv.listing.title)}
                      className="inline-flex max-w-full items-center gap-1 truncate text-[11px] font-semibold text-[#0067c0] hover:underline"
                    >
                      <span className="truncate">{activeConv.listing.title}</span>
                      <span>
                        ({formatPrice(
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
                    Enviá el primer mensaje para coordinar retiro, delivery o visita.
                  </div>
                )}
                {messages.map((m) => {
                  const isMine = m.senderId === user.id;
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

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-slate-200/80 bg-white p-3"
              >
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
              Elegí una conversación para ver los mensajes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
