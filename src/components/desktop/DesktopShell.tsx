"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Car,
  CheckCheck,
  FolderOpen,
  Heart,
  Home,
  Map as MapIcon,
  MessageCircle,
  Percent,
  Plus,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  User,
} from "lucide-react";
import { useApp, type WindowInstance } from "@/components/AppContext";
import { OsWindow } from "@/components/desktop/OsWindow";
import { StartMenu } from "@/components/desktop/StartMenu";
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

export function DesktopShell() {
  const {
    user,
    listings,
    myStores,
    windows,
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    openWindow,
    openExplorerWithFilters,
    openListing,
    openPublish,
    openChat,
    openMap,
    openFavorites,
    openProfile,
    openAdmin,
    openAuth,
    openRentStore,
    openMerchantDashboard,
    notifications,
    unreadNotifCount,
    markNotificationRead,
    unreadChatCount,
    setForceViewMode,
    setExperienceMode,
  } = useApp();

  const [startOpen, setStartOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [clock, setClock] = useState({ time: "", date: "" });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock({
        time: now.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" }),
        date: now.toLocaleDateString("es-PY", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      });
    };
    updateClock();
    const id = setInterval(updateClock, 20000);
    return () => clearInterval(id);
  }, []);

  const handleEnter3DStore = (storeSlug: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `/tienda/${storeSlug}`;
    } else {
      setExperienceMode("world3d");
    }
  };

  const renderWindowBody = (win: WindowInstance) => {
    switch (win.kind) {
      case "explorer":
        return <ExplorerView />;
      case "listing":
        return (
          <ListingDetailView
            slug={win.payload?.slug || ""}
            onClose={() => closeWindow(win.id)}
          />
        );
      case "publish":
        return (
          <PublishView
            editId={win.payload?.editId}
            onSuccess={(slug, title) => {
              closeWindow(win.id);
              openListing(slug, title);
            }}
          />
        );
      case "chat":
        return <ChatView initialConversationId={win.payload?.conversationId} />;
      case "map":
        return (
          <div className="h-full bg-white p-3">
            <ZoneMap
              listings={listings}
              heightClass="h-full"
              onSelectListing={(slug, title) => openListing(slug, title)}
            />
          </div>
        );
      case "favorites":
        return <FavoritesAlertsView />;
      case "profile":
        return <ProfileView userId={win.payload?.userId} />;
      case "admin":
        return <AdminModerationView />;
      case "auth":
        return <AuthView onAuthenticated={() => closeWindow(win.id)} />;
      case "commercialStore":
        return (
          <CommercialStoreView
            slug={win.payload?.slug || ""}
            onEnter3DStore={handleEnter3DStore}
          />
        );
      case "rentStore":
        return (
          <RentStoreView
            defaultPlan={
              (win.payload?.defaultPlan as "BASIC" | "FEATURED" | "FLAGSHIP" | undefined) ||
              "FEATURED"
            }
          />
        );
      case "merchantDashboard":
        return (
          <MerchantDashboardView
            initialStoreId={win.payload?.storeId}
            onEnter3DStore={handleEnter3DStore}
          />
        );
    }
  };

  const desktopIcons = [
    {
      label: "Explorar Avisos",
      icon: FolderOpen,
      bg: "bg-sky-500",
      onClick: () => openWindow("explorer"),
    },
    {
      label: "Mayor Ahorro %",
      icon: Percent,
      bg: "bg-emerald-600",
      onClick: () => openExplorerWithFilters({ sort: "savings", minSavings: "35" }, true),
    },
    {
      label: "Autos y Motos",
      icon: Car,
      bg: "bg-blue-600",
      onClick: () => openExplorerWithFilters({ category: "vehiculos" }, true),
    },
    {
      label: "Inmuebles",
      icon: Home,
      bg: "bg-teal-600",
      onClick: () => openExplorerWithFilters({ category: "inmuebles" }, true),
    },
    {
      label: "Mapa de Zonas",
      icon: MapIcon,
      bg: "bg-cyan-600",
      onClick: () => openMap(),
    },
    {
      label: "Publicar Aviso",
      icon: Plus,
      bg: "bg-[#0067c0]",
      onClick: () => openPublish(),
    },
    {
      label: "Alquilá Local 3D",
      icon: Store,
      bg: "bg-gradient-to-br from-fuchsia-600 to-amber-500",
      onClick: () => openRentStore(),
    },
    ...(myStores.length > 0
      ? [
          {
            label: "Mi Tienda",
            icon: BarChart3,
            bg: "bg-cyan-700",
            onClick: () => openMerchantDashboard(myStores[0].id),
          },
        ]
      : []),
    {
      label: "Mensajes",
      icon: MessageCircle,
      bg: "bg-indigo-600",
      onClick: () => openChat(),
    },
    {
      label: "Favoritos",
      icon: Heart,
      bg: "bg-rose-500",
      onClick: () => openFavorites(),
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            label: "Admin / Tiendas",
            icon: Shield,
            bg: "bg-slate-800",
            onClick: () => openAdmin(),
          },
        ]
      : []),
  ];

  const handleTaskbarWindowClick = (win: WindowInstance) => {
    if (win.minimized || activeWindowId !== win.id) {
      focusWindow(win.id);
    } else {
      minimizeWindow(win.id);
    }
  };

  return (
    <div
      onClick={() => {
        if (startOpen) setStartOpen(false);
        if (notifOpen) setNotifOpen(false);
      }}
      className="win-desktop-bg relative h-screen w-screen overflow-hidden select-none"
    >
      {/* Desktop Shortcuts Column */}
      <div className="absolute left-2.5 top-2.5 z-[1] grid max-h-[calc(100vh-58px)] grid-flow-col grid-rows-8 gap-0.5">
        {desktopIcons.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="group flex w-[80px] flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 text-center transition hover:bg-white/45 hover:backdrop-blur-md"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} text-white shadow-md transition group-hover:scale-105`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="rounded px-0.5 text-[10.5px] font-semibold leading-tight text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rendered Floating / Maximized OS Windows */}
      {windows.map((win) => (
        <OsWindow key={win.id} win={win} isActive={activeWindowId === win.id}>
          {renderWindowBody(win)}
        </OsWindow>
      ))}

      {/* Windows 11 Start Menu Popup */}
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}

      {/* Fluent Notification Center Flyout */}
      {notifOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="win-acrylic win-window-shadow fixed bottom-14 right-3 z-[900] w-80 overflow-hidden rounded-2xl border border-white/75"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-2.5">
            <span className="text-xs font-bold text-slate-900">Notificaciones</span>
            {unreadNotifCount > 0 && (
              <button
                type="button"
                onClick={() => markNotificationRead()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0067c0] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar leídas
              </button>
            )}
          </div>
          <div className="fluent-scroll max-h-80 overflow-y-auto divide-y divide-slate-100">
            {!user ? (
              <div className="p-5 text-center text-xs text-slate-500">
                Iniciá sesión para recibir alertas de bajas de precio, mensajes y búsquedas
                guardadas.
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500">
                No tenés notificaciones nuevas.
              </div>
            ) : (
              notifications.map((n) => (
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
                  className={`block w-full px-4 py-2.5 text-left transition hover:bg-white/90 ${
                    n.isRead ? "opacity-75" : "bg-sky-50/70"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatRelativeDate(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Windows 11 Bottom Taskbar */}
      <footer className="win-taskbar fixed inset-x-0 bottom-0 z-[950] flex h-12 items-center justify-between px-3">
        {/* Left: Vice City 3D Switcher, Paraguay status & Mobile Preview Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExperienceMode("world3d")}
            title="Volver al Mundo 3D Vice City"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ff2a9d] to-[#00b4d8] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-xs transition hover:brightness-110"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Vice City 3D</span>
          </button>
          <div className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 2xl:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>PYG / USD</span>
          </div>
          <button
            type="button"
            onClick={() => setForceViewMode("mobile")}
            title="Previsualizar como App de Celular"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-white/75 hover:text-[#0067c0]"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden 2xl:inline">Vista App</span>
          </button>
        </div>

        {/* Center: Start Button + Running Windows + Quick Publish */}
        <div className="flex items-center gap-1">
          {/* Start Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNotifOpen(false);
              setStartOpen((v) => !v);
            }}
            title="Inicio — ReUsa PY"
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
              startOpen ? "bg-white/90 shadow-xs" : "hover:bg-white/75"
            }`}
          >
            <img src="/icons/icon.svg" alt="Inicio" className="h-6 w-6 rounded-md" />
          </button>

          {/* Pinned Explorer shortcut if closed */}
          {!windows.some((w) => w.kind === "explorer") && (
            <button
              type="button"
              onClick={() => openWindow("explorer")}
              title="Explorador — ReUsa PY"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#0067c0] transition hover:bg-white/75"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          )}

          {/* Open Windows Pills */}
          <div className="flex max-w-[48vw] items-center gap-1 overflow-x-auto no-scrollbar">
            {windows.map((win) => {
              const active = activeWindowId === win.id && !win.minimized;
              return (
                <button
                  key={win.id}
                  type="button"
                  onClick={() => handleTaskbarWindowClick(win)}
                  title={win.title}
                  className={`relative flex h-9 max-w-[170px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                    active
                      ? "bg-white/95 text-slate-900 shadow-xs"
                      : "text-slate-700 hover:bg-white/70"
                  }`}
                >
                  {win.kind === "explorer" && <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#0067c0]" />}
                  {win.kind === "listing" && <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                  {win.kind === "publish" && <Plus className="h-3.5 w-3.5 shrink-0 text-[#0067c0]" />}
                  {win.kind === "chat" && <MessageCircle className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
                  {win.kind === "map" && <MapIcon className="h-3.5 w-3.5 shrink-0 text-teal-600" />}
                  {win.kind === "favorites" && <Heart className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                  {win.kind === "profile" && <User className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                  {win.kind === "admin" && <Shield className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                  {win.kind === "commercialStore" && <Store className="h-3.5 w-3.5 shrink-0 text-fuchsia-600" />}
                  {win.kind === "rentStore" && <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                  {win.kind === "merchantDashboard" && <BarChart3 className="h-3.5 w-3.5 shrink-0 text-cyan-600" />}
                  <span className="truncate">{win.title.replace(" — ReUsa PY", "")}</span>
                  {/* Windows 11 active indicator pill */}
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all ${
                      active ? "w-5 bg-[#0067c0]" : "w-1.5 bg-slate-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => openPublish()}
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-lg bg-[#0067c0] px-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0058a6]"
          >
            <Plus className="h-3.5 w-3.5" /> Publicar
          </button>
        </div>

        {/* Right: System Tray */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openChat()}
            title="Mensajes"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-white/75"
          >
            <MessageCircle className="h-4 w-4" />
            {unreadChatCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0067c0] px-1 text-[9px] font-bold text-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStartOpen(false);
              setNotifOpen((v) => !v);
            }}
            title="Notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-white/75"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => (user ? openProfile(user.id) : openAuth())}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-800 transition hover:bg-white/75"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0067c0] text-[10px] font-bold text-white">
              {user ? user.name.slice(0, 2).toUpperCase() : "?"}
            </span>
            <span className="hidden max-w-[92px] truncate xl:inline">
              {user ? user.name.split(" ")[0] : "Ingresar"}
            </span>
          </button>

          <div className="ml-1 hidden flex-col items-end px-1.5 leading-tight text-slate-700 md:flex">
            <span className="text-[11px] font-semibold">{clock.time}</span>
            <span className="text-[10px] text-slate-500">{clock.date}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
