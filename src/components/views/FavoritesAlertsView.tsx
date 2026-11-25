"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, Bell, Bookmark, Heart, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { ListingCard } from "@/components/ListingCard";
import type { ListingDTO } from "@/types/marketplace";
import { formatPrice } from "@/lib/format";

interface FavoriteEntry {
  id: string;
  savedPrice: number;
  priceDropped: boolean;
  listing: ListingDTO;
}

export function FavoritesAlertsView() {
  const {
    user,
    savedSearches,
    refreshSavedSearches,
    openExplorerWithFilters,
    openAuth,
    notifyToast,
  } = useApp();

  const [tab, setTab] = useState<"favorites" | "searches">("favorites");
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.favorites) setFavorites(data.favorites);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <Heart className="h-10 w-10 text-rose-500" />
        <h2 className="mt-3 text-base font-bold text-slate-900">Favoritos y Alertas</h2>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          Iniciá sesión para guardar avisos, recibir alertas cuando bajen de precio y monitorear
          búsquedas guardadas.
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

  const handleDeleteSearch = async (id: string) => {
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    await refreshSavedSearches();
    notifyToast("Alerta eliminada", "info");
  };

  return (
    <div className="fluent-scroll flex h-full flex-col overflow-y-auto bg-[#f8fafd] p-4">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("favorites")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            tab === "favorites"
              ? "bg-[#0067c0] text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Heart className="h-3.5 w-3.5" /> Favoritos ({favorites.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("searches")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            tab === "searches"
              ? "bg-[#0067c0] text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Bell className="h-3.5 w-3.5" /> Búsquedas guardadas ({savedSearches.length})
        </button>
      </div>

      {tab === "favorites" ? (
        loading ? (
          <p className="text-xs text-slate-500">Cargando favoritos...</p>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
            Todavía no guardaste publicaciones. Tocá el corazón en cualquier aviso para seguir su
            precio.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) => (
              <div key={fav.id} className="space-y-1">
                {fav.priceDropped && (
                  <div className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    Bajó desde {formatPrice(fav.savedPrice, fav.listing.currency)}
                  </div>
                )}
                <ListingCard listing={fav.listing} />
              </div>
            ))}
          </div>
        )
      ) : savedSearches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
          Aún no tenés búsquedas guardadas. Aplicá cualquier filtro en el Explorador y tocá
          &quot;Guardar alerta&quot;.
        </div>
      ) : (
        <div className="space-y-2.5">
          {savedSearches.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 shrink-0 text-amber-500" />
                  <h3 className="truncate text-sm font-bold text-slate-900">{s.name}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {s.matchCount} publicaciones activas coinciden ahora
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openExplorerWithFilters(s.query, true)}
                  className="rounded-xl bg-[#0067c0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0058a6]"
                >
                  Ver avisos
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSearch(s.id)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Eliminar alerta"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
