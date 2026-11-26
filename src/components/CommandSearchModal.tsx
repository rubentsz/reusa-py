"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  Gift,
  LayoutGrid,
  Percent,
  Search,
  Sparkles,
  Store,
  Tag,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { STORE_THEMES } from "@/components/world3d/vicePalette";
import { formatPrice } from "@/lib/format";

type QuickScope = "all" | "official" | "savings" | "free";

export function CommandSearchModal() {
  const {
    commandSearchOpen,
    setCommandSearchOpen,
    listings,
    commercialStores,
    categories,
    experienceMode,
    setExperienceMode,
    openListing,
    openCommercialStore,
    openRentStore,
    openExplorerWithFilters,
    requestWorldTeleport,
  } = useApp();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<QuickScope>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandSearchOpen) {
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandSearchOpen]);

  const normalizedQ = query.trim().toLowerCase();

  const matchedStores = useMemo(() => {
    if (scope === "free") return [];
    return commercialStores
      .filter((st) => {
        if (!normalizedQ) return true;
        return (
          st.name.toLowerCase().includes(normalizedQ) ||
          st.tagline.toLowerCase().includes(normalizedQ) ||
          (st.city?.name || "").toLowerCase().includes(normalizedQ)
        );
      })
      .slice(0, 4);
  }, [commercialStores, normalizedQ, scope]);

  const matchedCategories = useMemo(() => {
    if (scope === "official" || scope === "free" || scope === "savings") return [];
    return categories
      .filter((c) => {
        if (!normalizedQ) return false;
        return c.name.toLowerCase().includes(normalizedQ) || c.slug.includes(normalizedQ);
      })
      .slice(0, 3);
  }, [categories, normalizedQ, scope]);

  const matchedListings = useMemo(() => {
    return listings
      .filter((item) => {
        if (scope === "official" && !item.storeId) return false;
        if (scope === "savings" && (item.savingsPercent ?? 0) < 20) return false;
        if (scope === "free" && !item.isFree) return false;
        if (!normalizedQ) return true;
        return (
          item.title.toLowerCase().includes(normalizedQ) ||
          item.description.toLowerCase().includes(normalizedQ) ||
          item.category.name.toLowerCase().includes(normalizedQ) ||
          item.city.name.toLowerCase().includes(normalizedQ) ||
          (item.store?.name || "").toLowerCase().includes(normalizedQ) ||
          (item.sku || "").toLowerCase().includes(normalizedQ)
        );
      })
      .sort((a, b) => {
        if (scope === "savings") return (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0);
        return 0;
      })
      .slice(0, 8);
  }, [listings, normalizedQ, scope]);

  type FlatItem =
    | { type: "store"; id: string; slug: string; name: string }
    | { type: "category"; id: string; slug: string; name: string }
    | { type: "listing"; id: string; slug: string; title: string; storeSlug?: string; catSlug: string };

  const flatItems = useMemo<FlatItem[]>(() => {
    const arr: FlatItem[] = [];
    matchedStores.forEach((s) => arr.push({ type: "store", id: `st-${s.id}`, slug: s.slug, name: s.name }));
    matchedCategories.forEach((c) =>
      arr.push({ type: "category", id: `cat-${c.id}`, slug: c.slug, name: c.name })
    );
    matchedListings.forEach((l) =>
      arr.push({
        type: "listing",
        id: `li-${l.id}`,
        slug: l.slug,
        title: l.title,
        storeSlug: l.store?.slug,
        catSlug: l.category.slug,
      })
    );
    return arr;
  }, [matchedStores, matchedCategories, matchedListings]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQ, scope]);

  if (!commandSearchOpen) return null;

  const executeItem = (item: FlatItem) => {
    setCommandSearchOpen(false);
    if (item.type === "store") {
      if (experienceMode === "world3d") {
        requestWorldTeleport({ kind: "commercial", slug: item.slug });
      } else {
        openCommercialStore(item.slug, item.name);
      }
    } else if (item.type === "category") {
      if (experienceMode === "world3d") {
        requestWorldTeleport({ kind: "category", slug: item.slug });
      } else {
        openExplorerWithFilters({ category: item.slug }, true);
      }
    } else {
      openListing(item.slug, item.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setCommandSearchOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatItems.length > 0) setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatItems.length > 0) setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      e.preventDefault();
      executeItem(flatItems[activeIndex]);
    }
  };

  let runningIdx = 0;

  return (
    <div
      onClick={() => setCommandSearchOpen(false)}
      className="fixed inset-0 z-[1220] flex items-start justify-center bg-slate-950/65 px-3 pt-[8vh] backdrop-blur-md sm:pt-[11vh]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="animate-modal-in flex max-h-[80dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#0e0a1f]/95 text-white shadow-[0_28px_70px_rgba(0,0,0,0.65)]"
      >
        {/* Top Instant Search Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-[#00f0ff]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá iPhone, Corolla, casas, GuaraníTech, bicicletas o ciudades..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-slate-400 outline-none sm:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/20"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={() => setCommandSearchOpen(false)}
            className="rounded-full bg-white/10 p-1.5 text-slate-300 transition hover:bg-rose-500 hover:text-white"
            aria-label="Cerrar buscador"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "Todo", icon: Sparkles },
                { id: "official", label: "Tiendas Oficiales", icon: Store },
                { id: "savings", label: "Mayor Ahorro %", icon: Percent },
                { id: "free", label: "Gratis / Regalo", icon: Gift },
              ] as const
            ).map((pill) => {
              const Icon = pill.icon;
              const active = scope === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setScope(pill.id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                    active
                      ? "bg-gradient-to-r from-[#ff2a9d] to-[#00b4d8] text-white shadow-xs"
                      : "bg-white/10 text-slate-300 hover:bg-white/15"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {pill.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setCommandSearchOpen(false);
              openExplorerWithFilters({ q: query.trim() || undefined }, false);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00f0ff] hover:underline"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Abrir en Catálogo
          </button>
        </div>

        {/* Results Area */}
        <div className="fluent-scroll min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
          {/* Official Brand Stores */}
          {matchedStores.length > 0 && (
            <div>
              <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                ★ Tiendas Oficiales 3D · Avenida de Marcas
              </p>
              <div className="space-y-1">
                {matchedStores.map((st) => {
                  const idx = runningIdx++;
                  const selected = idx === activeIndex;
                  return (
                    <div
                      key={st.id}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition ${
                        selected ? "bg-white/14 ring-1 ring-[#00f0ff]/60" : "hover:bg-white/8"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCommandSearchOpen(false);
                          openCommercialStore(st.slug, st.name);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {st.logoUrl ? (
                          <img
                            src={st.logoUrl}
                            alt={st.name}
                            className="h-10 w-10 shrink-0 rounded-xl border border-white/15 bg-slate-950 object-contain p-1"
                          />
                        ) : (
                          <span
                            style={{ backgroundColor: st.neonColor }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-950"
                          >
                            <Store className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-sm font-extrabold text-white">
                              {st.name}
                            </span>
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#00f0ff]" />
                          </div>
                          <p className="truncate text-[11px] text-slate-300">
                            {st.tagline} · {st.city?.name || "Paraguay"} ({st.activeListingsCount} prod.)
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCommandSearchOpen(false);
                          setExperienceMode("world3d");
                          requestWorldTeleport({ kind: "commercial", slug: st.slug });
                        }}
                        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#38bdf8] px-2.5 py-1.5 text-[11px] font-black text-slate-950 transition hover:brightness-110"
                      >
                        <Compass className="h-3.5 w-3.5" /> Ir en 3D
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Categories */}
          {matchedCategories.length > 0 && (
            <div>
              <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                Categorías / Tiendas en Ocean Blvd
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                {matchedCategories.map((cat) => {
                  const idx = runningIdx++;
                  const selected = idx === activeIndex;
                  const theme = STORE_THEMES.find((t) => t.categorySlug === cat.slug);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        setCommandSearchOpen(false);
                        if (experienceMode === "world3d") {
                          requestWorldTeleport({ kind: "category", slug: cat.slug });
                        } else {
                          openExplorerWithFilters({ category: cat.slug }, true);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-left transition ${
                        selected ? "bg-white/15 ring-1 ring-[#00f0ff]/60" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: theme?.neonColor || "#00f0ff" }}
                      />
                      <span className="truncate text-xs font-bold text-white">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Listings */}
          <div>
            <p className="mb-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {normalizedQ
                ? `Productos y avisos (${matchedListings.length})`
                : "Destacados y recientes en Paraguay"}
            </p>
            {matchedListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                <p className="text-sm font-bold text-white">Sin resultados para &quot;{query}&quot;</p>
                <p className="mt-1 text-xs text-slate-400">
                  Probá con otra palabra (ej. iPhone, Corolla, casa, bicicleta, medias) o explorá el catálogo completo.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {matchedListings.map((item) => {
                  const idx = runningIdx++;
                  const selected = idx === activeIndex;
                  const cover = item.images.find((i) => i.isCover)?.url || item.images[0]?.url;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center gap-3 rounded-2xl px-2.5 py-2 transition ${
                        selected ? "bg-white/14 ring-1 ring-[#00f0ff]/60" : "hover:bg-white/8"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCommandSearchOpen(false);
                          openListing(item.slug, item.title);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                          {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-extrabold text-white sm:text-sm">
                              {item.title}
                            </span>
                            {item.store && (
                              <span className="hidden shrink-0 items-center gap-0.5 rounded-full bg-fuchsia-500/25 px-1.5 py-0.5 text-[9.5px] font-bold text-fuchsia-200 sm:inline-flex">
                                <BadgeCheck className="h-2.5 w-2.5" /> {item.store.name}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="font-extrabold text-[#34d399]">
                              {formatPrice(item.price, item.currency, item.isFree)}
                            </span>
                            {item.savingsPercent && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                <Tag className="h-2.5 w-2.5" />-{item.savingsPercent}%
                              </span>
                            )}
                            <span className="text-slate-400">
                              {item.city.name} · {item.category.name}
                            </span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        title="Teletransportar al local 3D donde está este producto"
                        onClick={() => {
                          setCommandSearchOpen(false);
                          setExperienceMode("world3d");
                          if (item.store?.slug) {
                            requestWorldTeleport({ kind: "commercial", slug: item.store.slug });
                          } else {
                            requestWorldTeleport({ kind: "category", slug: item.category.slug });
                          }
                        }}
                        className="hidden shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 transition hover:bg-[#00f0ff] hover:text-slate-950 sm:inline-flex"
                      >
                        Ir en 3D <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Shortcut Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/35 px-4 py-2 text-[10.5px] text-slate-400">
          <div className="hidden items-center gap-3 sm:flex">
            <span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white">↑↓</kbd>{" "}
              Navegar
            </span>
            <span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white">Enter</kbd>{" "}
              Abrir
            </span>
            <span>
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white">Esc</kbd>{" "}
              Cerrar
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCommandSearchOpen(false);
              openRentStore();
            }}
            className="font-bold text-amber-300 hover:underline"
          >
            ★ ¿Tenés un local real? Poné tu marca en 3D →
          </button>
        </div>
      </div>
    </div>
  );
}
