"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Home,
  Map as MapIcon,
  MessageCircle,
  Monitor,
  Plus,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { ExplorerView } from "@/components/views/ExplorerView";
import { ListingDetailView } from "@/components/views/ListingDetailView";
import { PublishView } from "@/components/views/PublishView";
import { ChatView } from "@/components/views/ChatView";
import { FavoritesAlertsView } from "@/components/views/FavoritesAlertsView";
import { ProfileView } from "@/components/views/ProfileView";
import { AuthView } from "@/components/views/AuthView";
import { AdminModerationView } from "@/components/views/AdminModerationView";
import { CommercialStoreView } from "@/components/views/CommercialStoreView";
import { RentStoreView } from "@/components/views/RentStoreView";
import { MerchantDashboardView } from "@/components/views/MerchantDashboardView";
import { ZoneMap } from "@/components/ZoneMap";
import { formatRelativeDate } from "@/lib/format";

export function MobileShell() {
  const {
    user,
    listings,
    myStores,
    mobileTab,
    setMobileTab,
    mobileOverlay,
    setMobileOverlay,
    openListing,
    openChat,
    openMerchantDashboard,
    unreadChatCount,
    notifications,
    unreadNotifCount,
    markNotificationRead,
    isMobileViewport,
    forceViewMode,
    setForceViewMode,
    setExperienceMode,
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);

  const isDesktopPreviewingMobile = !isMobileViewport && forceViewMode === "mobile";

  const handleEnter3DStore = (storeSlug: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `/tienda/${storeSlug}`;
    } else {
      setExperienceMode("world3d");
    }
  };

  const content = (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f4f7fb]">
      {/* Mobile App Top Bar */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3.5">
        <div className="flex items-center gap-2">
          <img src="/icons/icon.svg" alt="ReUsa PY" className="h-7 w-7 rounded-lg" />
          <div className="leading-none">
            <span className="text-sm font-extrabold tracking-tight text-slate-900">ReUsa PY</span>
            <span className="block text-[10px] font-medium text-slate-400">Paraguay · PYG / USD</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {myStores.length > 0 && (
            <button
              type="button"
              onClick={() => openMerchantDashboard(myStores[0].id)}
              className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm"
            >
              <Store className="h-3 w-3" /> Mi Tienda
            </button>
          )}
          <button
            type="button"
            onClick={() => setExperienceMode("world3d")}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ff2a9d] to-[#00b4d8] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm"
          >
            <Sparkles className="h-3 w-3" /> 3D Vice
          </button>
          {isDesktopPreviewingMobile && (
            <button
              type="button"
              onClick={() => setForceViewMode("auto")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              <Monitor className="h-3 w-3" /> Windows OS
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {unreadNotifCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Notification Sheet */}
      {notifOpen && (
        <div className="absolute inset-x-0 top-13 z-40 max-h-[65vh] overflow-y-auto border-b border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-xs font-bold text-slate-900">Notificaciones</span>
            {unreadNotifCount > 0 && (
              <button
                type="button"
                onClick={() => markNotificationRead()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0067c0]"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="p-5 text-center text-xs text-slate-500">Sin notificaciones nuevas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.type === "MESSAGE") {
                      openChat();
                    } else if (n.linkUrl?.startsWith("/aviso/")) {
                      openListing(n.linkUrl.replace("/aviso/", ""));
                    }
                    setNotifOpen(false);
                  }}
                  className={`block w-full px-4 py-3 text-left ${
                    n.isRead ? "opacity-75" : "bg-sky-50/70"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatRelativeDate(n.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Mobile Tab Viewport */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {mobileTab === "home" && <ExplorerView isMobile />}
        {mobileTab === "map" && (
          <div className="h-full p-2.5">
            <ZoneMap
              listings={listings}
              heightClass="h-full min-h-[420px]"
              onSelectListing={(slug, title) => openListing(slug, title)}
            />
          </div>
        )}
        {mobileTab === "publish" && (
          <PublishView
            onSuccess={(slug, title) => {
              setMobileTab("home");
              openListing(slug, title);
            }}
          />
        )}
        {mobileTab === "chat" && <ChatView isMobile />}
        {mobileTab === "profile" && <ProfileView userId={user?.id} />}
      </main>

      {/* Full-screen App Overlay Sheet (Detail / Auth / Seller Profile / Favorites / Admin / Stores) */}
      {mobileOverlay && (
        <div className="absolute inset-0 z-50 flex flex-col bg-white">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
            <button
              type="button"
              onClick={() => {
                setMobileOverlay(null);
                if (typeof window !== "undefined") {
                  window.history.replaceState(null, "", "/");
                }
              }}
              className="rounded-full p-2 text-slate-700 hover:bg-slate-100"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="truncate text-sm font-bold text-slate-900">
              {mobileOverlay.kind === "listing" && "Detalle de publicación"}
              {mobileOverlay.kind === "profile" && "Perfil del vendedor"}
              {mobileOverlay.kind === "favorites" && "Favoritos y Alertas"}
              {mobileOverlay.kind === "admin" && "Panel Admin y Tiendas"}
              {mobileOverlay.kind === "auth" && "Cuenta ReUsa PY"}
              {mobileOverlay.kind === "publish" && "Editar publicación"}
              {mobileOverlay.kind === "commercialStore" && "Tienda Oficial"}
              {mobileOverlay.kind === "rentStore" && "Alquilá tu Local 3D"}
              {mobileOverlay.kind === "merchantDashboard" && "Panel de Mi Tienda"}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mobileOverlay.kind === "listing" && (
              <ListingDetailView
                slug={mobileOverlay.payload?.slug || ""}
                onClose={() => setMobileOverlay(null)}
              />
            )}
            {mobileOverlay.kind === "profile" && (
              <ProfileView userId={mobileOverlay.payload?.userId} />
            )}
            {mobileOverlay.kind === "favorites" && <FavoritesAlertsView />}
            {mobileOverlay.kind === "admin" && <AdminModerationView />}
            {mobileOverlay.kind === "auth" && (
              <AuthView onAuthenticated={() => setMobileOverlay(null)} />
            )}
            {mobileOverlay.kind === "publish" && (
              <PublishView
                editId={mobileOverlay.payload?.editId}
                onSuccess={(slug) => {
                  setMobileOverlay({ kind: "listing", payload: { slug } });
                }}
              />
            )}
            {mobileOverlay.kind === "commercialStore" && (
              <CommercialStoreView
                slug={mobileOverlay.payload?.slug || ""}
                onEnter3DStore={handleEnter3DStore}
              />
            )}
            {mobileOverlay.kind === "rentStore" && (
              <RentStoreView
                defaultPlan={
                  (mobileOverlay.payload?.defaultPlan as
                    | "BASIC"
                    | "FEATURED"
                    | "FLAGSHIP"
                    | undefined) || "FEATURED"
                }
              />
            )}
            {mobileOverlay.kind === "merchantDashboard" && (
              <MerchantDashboardView
                initialStoreId={mobileOverlay.payload?.storeId}
                onEnter3DStore={handleEnter3DStore}
              />
            )}
          </div>
        </div>
      )}

      {/* Persistent Native-Style 5-Tab Bottom Navigation Bar */}
      <nav className="pb-safe flex shrink-0 items-center justify-around border-t border-slate-200 bg-white/95 px-2 pt-1.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMobileTab("home")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${
            mobileTab === "home" ? "text-[#0067c0]" : "text-slate-500"
          }`}
        >
          <Home className="h-5 w-5" />
          Inicio
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("map")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${
            mobileTab === "map" ? "text-[#0067c0]" : "text-slate-500"
          }`}
        >
          <MapIcon className="h-5 w-5" />
          Mapa
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("publish")}
          className="-mt-4 flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#0067c0]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0067c0] text-white shadow-lg shadow-sky-600/30">
            <Plus className="h-6 w-6" />
          </span>
          Publicar
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${
            mobileTab === "chat" ? "text-[#0067c0]" : "text-slate-500"
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          {unreadChatCount > 0 && (
            <span className="absolute right-2 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
              {unreadChatCount}
            </span>
          )}
          Mensajes
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("profile")}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${
            mobileTab === "profile" ? "text-[#0067c0]" : "text-slate-500"
          }`}
        >
          <User className="h-5 w-5" />
          {user ? "Perfil" : "Ingresar"}
        </button>
      </nav>
    </div>
  );

  // If previewing mobile mode on a large desktop screen, frame it cleanly
  if (isDesktopPreviewingMobile) {
    return (
      <div className="win-desktop-bg flex h-screen w-screen items-center justify-center p-4">
        <div className="win-window-shadow h-[92vh] max-h-[840px] w-full max-w-[420px] overflow-hidden rounded-[32px] border-4 border-slate-900 bg-white">
          {content}
        </div>
      </div>
    );
  }

  return <div className="h-dvh w-screen overflow-hidden">{content}</div>;
}
