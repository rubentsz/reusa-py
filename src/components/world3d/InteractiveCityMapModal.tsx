"use client";

import { useState } from "react";
import { BadgeCheck, Compass, MapPin, Sparkles, Store, Waves, X } from "lucide-react";
import { STORE_THEMES } from "@/components/world3d/vicePalette";
import type { CommercialStoreDTO } from "@/types/marketplace";

type MapFilter = "all" | "commercial" | "categories" | "vacant";

interface InteractiveCityMapModalProps {
  open: boolean;
  onClose: () => void;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  commercialStores: CommercialStoreDTO[];
  listingCountByCategory: Record<string, number>;
  listingCountByStore: Record<string, number>;
  onTeleportCategory: (slug: string) => void;
  onTeleportCommercial: (slug: string) => void;
  onTeleportPier: () => void;
  onOpenRentStore: () => void;
}

export function InteractiveCityMapModal({
  open,
  onClose,
  playerX,
  playerZ,
  playerYaw,
  commercialStores,
  listingCountByCategory,
  listingCountByStore,
  onTeleportCategory,
  onTeleportCommercial,
  onTeleportPier,
  onOpenRentStore,
}: InteractiveCityMapModalProps) {
  const [filter, setFilter] = useState<MapFilter>("all");

  if (!open) return null;

  // Build rows of commercial stores + 2 vacant lots on Avenida de Marcas (south of Ocean Blvd)
  const totalBrandSlots = commercialStores.length + 2;
  const brandRowCount = Math.ceil(totalBrandSlots / 2);

  // Normalize player marker onto visual vertical spine (-100 pier to southEnd)
  const maxSouthZ = 52 + Math.max(0, brandRowCount - 1) * 20 + 18;
  const playerPctY = Math.max(4, Math.min(96, ((playerZ - -98) / (maxSouthZ - -98)) * 100));
  const playerPctX = Math.max(18, Math.min(82, 50 + (playerX / 24) * 32));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1210] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#00f0ff]/30 bg-[#0d081e]/96 text-white shadow-[0_30px_80px_rgba(0,0,0,0.75)]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#ff2a9d] text-slate-950 shadow-md">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-black tracking-tight sm:text-base">
                Mapa 2D · Ocean Blvd &amp; Avenida de Marcas
              </h2>
              <p className="text-[11px] text-cyan-200/80">
                Tocá cualquier tienda para teletransportarte al instante (Atajo: tecla M)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-slate-300 transition hover:bg-rose-500 hover:text-white"
            aria-label="Cerrar mapa"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2 sm:px-5">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "all", label: "Vista completa" },
                { id: "commercial", label: `★ Tiendas Oficiales (${commercialStores.length})` },
                { id: "categories", label: "Usados · 10 Rubros" },
                { id: "vacant", label: "Locales Disponibles (2)" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                  filter === tab.id
                    ? "bg-gradient-to-r from-[#ff2a9d] to-[#00b4d8] text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#00f0ff]" />
            Tu posición en vivo
          </span>
        </div>

        {/* Interactive Aerial Map Canvas */}
        <div className="fluent-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#062847] via-[#170e33] to-[#1d102c] p-4 sm:p-6">
            {/* Central Road Spine + Live Player Beacon */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-slate-900/80 ring-1 ring-[#ff2a9d]/35 sm:w-14">
              <div className="mx-auto h-full w-0.5 border-l-2 border-dashed border-amber-400/55" />
            </div>

            {/* Live Player Dot */}
            <div
              style={{
                top: `${playerPctY}%`,
                left: `${playerPctX}%`,
              }}
              title="Tu avatar ahora"
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#00f0ff] text-slate-950 shadow-[0_0_16px_#00f0ff]">
                <span
                  style={{ transform: `rotate(${Math.round((-playerYaw * 180) / Math.PI + 180)}deg)` }}
                  className="text-xs font-black leading-none"
                >
                  ▲
                </span>
              </div>
            </div>

            {/* NORTH: Vice Beach & Sunset Pier */}
            <div className="relative z-10 mb-5 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTeleportPier();
                }}
                className="group inline-flex items-center gap-2 rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500/25 via-sky-500/30 to-teal-500/25 px-4 py-2 text-xs font-extrabold text-cyan-100 shadow-lg backdrop-blur-sm transition hover:scale-[1.03] hover:border-cyan-200 hover:bg-cyan-500/40"
              >
                <Waves className="h-4 w-4 text-cyan-300" />
                Playa &amp; Muelle Vice · Ir al atardecer
              </button>
            </div>

            {/* ZONE 1: OCEAN BOULEVARD — 10 COMMUNITY SECONDHAND STORES */}
            {(filter === "all" || filter === "categories") && (
              <div className="relative z-10 mb-6">
                <div className="mb-3 flex justify-center">
                  <span className="rounded-full border border-fuchsia-400/30 bg-[#1a0d38]/95 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-200">
                    Ocean Boulevard · 10 Tiendas de Usados
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 sm:gap-x-20">
                  {STORE_THEMES.map((theme) => {
                    const count = listingCountByCategory[theme.categorySlug] ?? 0;
                    return (
                      <button
                        key={theme.categorySlug}
                        type="button"
                        onClick={() => {
                          onClose();
                          onTeleportCategory(theme.categorySlug);
                        }}
                        style={{ borderColor: `${theme.neonColor}55` }}
                        className="group flex items-center justify-between gap-2 rounded-2xl border bg-[#120b29]/90 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:bg-white/12 hover:shadow-lg"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                              style={{ backgroundColor: theme.neonColor }}
                            />
                            <span className="truncate text-xs font-extrabold text-white group-hover:text-[#00f0ff]">
                              {theme.viceName}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-slate-400">{theme.tagline}</p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ARCHWAY DIVIDER */}
            <div className="relative z-10 my-5 flex justify-center">
              <div className="rounded-2xl border-2 border-amber-400/75 bg-gradient-to-r from-[#1a0f35] via-[#261447] to-[#1a0f35] px-5 py-1.5 text-center shadow-[0_0_24px_rgba(251,191,36,0.28)]">
                <p className="text-[11px] font-black tracking-wider text-amber-300">
                  ★ AVENIDA DE MARCAS · TIENDAS OFICIALES 3D ★
                </p>
              </div>
            </div>

            {/* ZONE 2: AVENIDA DE MARCAS — COMMERCIAL STORES + VACANT LOTS */}
            {(filter === "all" || filter === "commercial" || filter === "vacant") && (
              <div className="relative z-10 grid grid-cols-1 gap-x-12 gap-y-3 sm:grid-cols-2 sm:gap-x-20">
                {(filter === "all" || filter === "commercial") &&
                  commercialStores.map((st) => {
                    const liveCount = listingCountByStore[st.id] ?? st.activeListingsCount ?? 0;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          onTeleportCommercial(st.slug);
                        }}
                        style={{
                          borderColor: `${st.neonColor}88`,
                          boxShadow: `0 0 20px ${st.neonColor}22`,
                        }}
                        className="group flex items-center gap-3 rounded-2xl border-2 bg-[#110c28]/95 p-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white/14"
                      >
                        {st.logoUrl ? (
                          <img
                            src={st.logoUrl}
                            alt={st.name}
                            className="h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-slate-950 object-contain p-1"
                          />
                        ) : (
                          <span
                            style={{ backgroundColor: st.neonColor }}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-950"
                          >
                            <Store className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-xs font-black text-white group-hover:text-[#00f0ff]">
                              {st.name}
                            </span>
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#00f0ff]" />
                          </div>
                          <p className="truncate text-[10px] text-slate-300">{st.tagline}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-300">
                            <MapPin className="h-2.5 w-2.5" />
                            {st.city?.name || "Paraguay"} · {liveCount} prod. · Entrar →
                          </p>
                        </div>
                      </button>
                    );
                  })}

                {(filter === "all" || filter === "vacant") &&
                  [1, 2].map((n) => (
                    <button
                      key={`vacant-${n}`}
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRentStore();
                      }}
                      className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-amber-400/70 bg-amber-500/12 p-2.5 text-left transition hover:border-amber-300 hover:bg-amber-500/20"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-amber-200">
                          LOCAL DISPONIBLE #{commercialStores.length + n}
                        </p>
                        <p className="text-[10.5px] text-amber-100/80">
                          Colocá el logo y catálogo de tu negocio aquí →
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
