"use client";

import { useState } from "react";
import {
  FolderOpen,
  Gift,
  Heart,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  Percent,
  PlusSquare,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { CategoryIcon } from "@/components/CategoryIcon";

export function StartMenu({ onClose }: { onClose: () => void }) {
  const {
    user,
    categories,
    logout,
    openExplorerWithFilters,
    openPublish,
    openChat,
    openMap,
    openFavorites,
    openProfile,
    openAdmin,
    openAuth,
  } = useApp();

  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    openExplorerWithFilters({ q: query.trim() || undefined });
    onClose();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="win-acrylic win-window-shadow fixed bottom-14 left-1/2 z-[900] w-[580px] max-w-[94vw] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/75"
    >
      {/* Top Search */}
      <form onSubmit={handleSearch} className="p-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0067c0]" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos usados, autos, casas o ciudades en Paraguay..."
            className="w-full rounded-full border border-slate-200/90 bg-white/95 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-xs outline-none focus:border-[#0067c0]"
          />
        </div>
      </form>

      {/* Pinned ReUsa Apps */}
      <div className="px-5 pb-3">
        <p className="mb-2 text-[11px] font-bold text-slate-600">Aplicaciones de ReUsa PY</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "Explorador",
              icon: FolderOpen,
              color: "bg-sky-100 text-[#0067c0]",
              action: () => openExplorerWithFilters({}, true),
            },
            {
              label: "Publicar",
              icon: PlusSquare,
              color: "bg-emerald-100 text-emerald-700",
              action: () => openPublish(),
            },
            {
              label: "Mapa PY",
              icon: MapIcon,
              color: "bg-teal-100 text-teal-700",
              action: () => openMap(),
            },
            {
              label: "Mensajes",
              icon: MessageCircle,
              color: "bg-blue-100 text-blue-700",
              action: () => openChat(),
            },
            {
              label: "Mayor ahorro",
              icon: Percent,
              color: "bg-emerald-100 text-emerald-700",
              action: () => openExplorerWithFilters({ sort: "savings", minSavings: "35" }, true),
            },
            {
              label: "Gratis / Regalo",
              icon: Gift,
              color: "bg-amber-100 text-amber-700",
              action: () => openExplorerWithFilters({ isFree: true }, true),
            },
            {
              label: "Favoritos",
              icon: Heart,
              color: "bg-rose-100 text-rose-600",
              action: () => openFavorites(),
            },
            ...(user?.role === "ADMIN"
              ? [
                  {
                    label: "Moderación",
                    icon: Shield,
                    color: "bg-slate-200 text-slate-800",
                    action: () => openAdmin(),
                  },
                ]
              : [
                  {
                    label: "Mi Perfil",
                    icon: User,
                    color: "bg-indigo-100 text-indigo-700",
                    action: () => openProfile(),
                  },
                ]),
          ].map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.label}
                type="button"
                onClick={() => {
                  app.action();
                  onClose();
                }}
                className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition hover:bg-white/85"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${app.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-semibold text-slate-700">{app.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories Quick Launch */}
      <div className="border-t border-slate-200/70 px-5 py-3">
        <p className="mb-2 text-[11px] font-bold text-slate-600">Explorar por categoría</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                openExplorerWithFilters({ category: cat.slug }, true);
                onClose();
              }}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-white/90 hover:text-[#0067c0]"
            >
              <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 shrink-0 text-[#0067c0]" />
              <span className="truncate">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Account Strip */}
      <div className="flex items-center justify-between border-t border-slate-200/80 bg-white/70 px-5 py-2.5">
        {user ? (
          <>
            <button
              type="button"
              onClick={() => {
                openProfile(user.id);
                onClose();
              }}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-white"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0067c0] text-[11px] font-bold text-white">
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">{user.name}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
            </button>
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate-600">Navegando como invitado</span>
            <button
              type="button"
              onClick={() => {
                openAuth();
                onClose();
              }}
              className="rounded-lg bg-[#0067c0] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0058a6]"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
