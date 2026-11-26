"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  CategoryDTO,
  CommercialStoreDTO,
  ConversationDTO,
  DepartmentDTO,
  ListingDTO,
  ListingFilters,
  NotificationDTO,
  SavedSearchDTO,
  UserDTO,
} from "@/types/marketplace";

export type WindowKind =
  | "explorer"
  | "listing"
  | "publish"
  | "chat"
  | "map"
  | "favorites"
  | "profile"
  | "admin"
  | "auth"
  | "commercialStore"
  | "rentStore"
  | "merchantDashboard";

export interface WindowInstance {
  id: string;
  kind: WindowKind;
  title: string;
  payload?: Record<string, string>;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

export type MobileTab = "home" | "map" | "publish" | "chat" | "profile";

export interface MobileOverlay {
  kind:
    | "listing"
    | "profile"
    | "auth"
    | "favorites"
    | "admin"
    | "publish"
    | "commercialStore"
    | "rentStore"
    | "merchantDashboard";
  payload?: Record<string, string>;
}

export interface StoreCartItem {
  listing: ListingDTO;
  qty: number;
}

export interface ToastItem {
  id: string;
  message: string;
  tone?: "info" | "success" | "error";
}

export type AppWorldModal =
  | { kind: "listing"; slug: string; title?: string }
  | { kind: "publish"; editId?: string }
  | { kind: "chat"; conversationId?: string }
  | { kind: "favorites" }
  | { kind: "profile"; userId?: string }
  | { kind: "auth" }
  | { kind: "admin" }
  | { kind: "commercialStore"; slug: string; title?: string }
  | { kind: "rentStore"; defaultPlan?: "BASIC" | "FEATURED" | "FLAGSHIP" }
  | { kind: "merchantDashboard"; storeId?: string }
  | null;

interface InitialAppData {
  initialUser: UserDTO | null;
  initialCategories: CategoryDTO[];
  initialDepartments: DepartmentDTO[];
  initialListings: ListingDTO[];
  initialCommercialStores?: CommercialStoreDTO[];
  initialRoute?: {
    kind: WindowKind;
    payload?: Record<string, string>;
    title?: string;
  };
}

interface AppContextValue {
  user: UserDTO | null;
  setUser: (u: UserDTO | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;

  categories: CategoryDTO[];
  departments: DepartmentDTO[];

  listings: ListingDTO[];
  totalListings: number;
  loadingListings: boolean;
  filters: ListingFilters;
  setFilters: React.Dispatch<React.SetStateAction<ListingFilters>>;
  updateFilters: (patch: Partial<ListingFilters>) => void;
  resetFilters: () => void;
  refreshListings: (overrideFilters?: ListingFilters) => Promise<void>;

  // Commercial Stores ("Avenida de Marcas 3D")
  commercialStores: CommercialStoreDTO[];
  myStores: CommercialStoreDTO[];
  refreshCommercialStores: () => Promise<void>;
  storeCart: Record<string, StoreCartItem[]>;
  addToStoreCart: (storeId: string, listing: ListingDTO) => void;
  updateStoreCartQty: (storeId: string, listingId: string, delta: number) => void;
  clearStoreCart: (storeId: string) => void;
  trackStoreEvent: (
    storeIdOrSlug: string,
    event: "visit" | "product_click" | "whatsapp_click"
  ) => void;

  favoriteIds: Set<string>;
  toggleFavorite: (listingId: string) => Promise<void>;

  notifications: NotificationDTO[];
  unreadNotifCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id?: string) => Promise<void>;

  conversations: ConversationDTO[];
  unreadChatCount: number;
  refreshConversations: () => Promise<void>;

  savedSearches: SavedSearchDTO[];
  refreshSavedSearches: () => Promise<void>;

  // Desktop Window Manager
  windows: WindowInstance[];
  activeWindowId: string | null;
  openWindow: (kind: WindowKind, opts?: { title?: string; payload?: Record<string, string>; uniqueKey?: string }) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  snapWindow: (id: string, side: "left" | "right") => void;

  // 3D Vice City vs Classic OS/App mode
  experienceMode: "world3d" | "classic";
  setExperienceMode: (m: "world3d" | "classic") => void;
  worldModal: AppWorldModal;
  setWorldModal: React.Dispatch<React.SetStateAction<AppWorldModal>>;

  // Mobile App navigation
  isMobileViewport: boolean;
  forceViewMode: "auto" | "desktop" | "mobile";
  setForceViewMode: (m: "auto" | "desktop" | "mobile") => void;
  effectiveMode: "desktop" | "mobile";
  mobileTab: MobileTab;
  setMobileTab: (t: MobileTab) => void;
  mobileOverlay: MobileOverlay | null;
  setMobileOverlay: (o: MobileOverlay | null) => void;

  // High-level cross-shell navigation helpers
  openListing: (slug: string, title?: string) => void;
  openChat: (conversationId?: string) => void;
  openPublish: (editId?: string) => void;
  openProfile: (userId?: string) => void;
  openMap: () => void;
  openFavorites: () => void;
  openAdmin: () => void;
  openAuth: () => void;
  openCommercialStore: (slug: string, title?: string) => void;
  openRentStore: (defaultPlan?: "BASIC" | "FEATURED" | "FLAGSHIP") => void;
  openMerchantDashboard: (storeId?: string) => void;
  openExplorerWithFilters: (patch: Partial<ListingFilters>, resetFirst?: boolean) => void;
  startChatForListing: (listingId: string) => Promise<void>;
  sendOfferForListing: (
    listingId: string,
    offerAmount: number,
    offerCurrency: "PYG" | "USD",
    note?: string
  ) => Promise<boolean>;

  // Global Instant Search (Ctrl+K) & 3D Teleport bridge
  commandSearchOpen: boolean;
  setCommandSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  worldTeleport: WorldTeleportTarget;
  requestWorldTeleport: (target: NonNullable<WorldTeleportTarget>) => void;
  clearWorldTeleport: () => void;

  // Global WhatsApp / IG Story Card Generator
  storyCardTarget: StoryCardTarget;
  setStoryCardTarget: React.Dispatch<React.SetStateAction<StoryCardTarget>>;
  openListingStoryCard: (listing: ListingDTO) => void;
  openStoreStoryCard: (store: CommercialStoreDTO, catalog: ListingDTO[]) => void;

  // Toasts
  toasts: ToastItem[];
  notifyToast: (message: string, tone?: "info" | "success" | "error") => void;
}

export type StoryCardTarget =
  | { kind: "listing"; listing: ListingDTO }
  | { kind: "store"; store: CommercialStoreDTO; catalog: ListingDTO[] }
  | null;

export type WorldTeleportTarget =
  | { kind: "category"; slug: string; ts?: number }
  | { kind: "commercial"; slug: string; ts?: number }
  | { kind: "pier"; ts?: number }
  | null;

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_FILTERS: ListingFilters = {
  sort: "recent",
};

function getDefaultWindowGeometry(kind: WindowKind, indexOffset: number) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1366;
  const vh = typeof window !== "undefined" ? window.innerHeight : 820;
  const usableH = Math.max(540, vh - 68);
  const shift = (indexOffset % 5) * 28;

  switch (kind) {
    case "explorer":
      return {
        x: Math.max(96, Math.round((vw - Math.min(1160, vw - 140)) / 2)),
        y: 18,
        width: Math.min(1160, Math.max(820, vw - 140)),
        height: Math.min(usableH - 28, 720),
        maximized: false,
      };
    case "listing":
      return {
        x: Math.min(vw - 740, 140 + shift * 2),
        y: 28 + shift,
        width: Math.min(820, vw - 120),
        height: Math.min(usableH - 40, 680),
        maximized: false,
      };
    case "publish":
      return {
        x: Math.max(120, Math.round((vw - 780) / 2) + shift),
        y: 24 + shift,
        width: Math.min(780, vw - 100),
        height: Math.min(usableH - 36, 700),
        maximized: false,
      };
    case "chat":
      return {
        x: Math.max(100, vw - 860 - shift),
        y: 36 + shift,
        width: Math.min(820, vw - 120),
        height: Math.min(usableH - 60, 620),
        maximized: false,
      };
    case "map":
      return {
        x: Math.max(100, Math.round((vw - 980) / 2)),
        y: 26,
        width: Math.min(980, vw - 140),
        height: Math.min(usableH - 40, 660),
        maximized: false,
      };
    case "auth":
      return {
        x: Math.max(80, Math.round((vw - 460) / 2)),
        y: Math.max(40, Math.round((usableH - 540) / 2)),
        width: 450,
        height: 550,
        maximized: false,
      };
    case "favorites":
    case "profile":
    case "admin":
    default:
      return {
        x: Math.max(110, Math.round((vw - 880) / 2) + shift),
        y: 30 + shift,
        width: Math.min(880, vw - 120),
        height: Math.min(usableH - 48, 650),
        maximized: false,
      };
  }
}

export function AppProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: InitialAppData;
}) {
  const [user, setUser] = useState<UserDTO | null>(initialData.initialUser);
  const [categories] = useState<CategoryDTO[]>(initialData.initialCategories);
  const [departments] = useState<DepartmentDTO[]>(initialData.initialDepartments);

  const [listings, setListings] = useState<ListingDTO[]>(initialData.initialListings);
  const [totalListings, setTotalListings] = useState<number>(initialData.initialListings.length);
  const [loadingListings, setLoadingListings] = useState<boolean>(false);
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);

  const [commercialStores, setCommercialStores] = useState<CommercialStoreDTO[]>(
    initialData.initialCommercialStores ?? []
  );
  const [myStores, setMyStores] = useState<CommercialStoreDTO[]>([]);
  const [storeCart, setStoreCart] = useState<Record<string, StoreCartItem[]>>({});

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(initialData.initialListings.filter((l) => l.isFavorited).map((l) => l.id))
  );
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [savedSearches, setSavedSearches] = useState<SavedSearchDTO[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [experienceMode, setExperienceMode] = useState<"world3d" | "classic">("world3d");
  const [worldModal, setWorldModal] = useState<AppWorldModal>(null);
  const [commandSearchOpen, setCommandSearchOpen] = useState<boolean>(false);
  const [worldTeleport, setWorldTeleport] = useState<WorldTeleportTarget>(null);
  const [storyCardTarget, setStoryCardTarget] = useState<StoryCardTarget>(null);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [forceViewMode, setForceViewMode] = useState<"auto" | "desktop" | "mobile">("auto");
  const [mobileTab, setMobileTab] = useState<MobileTab>("home");
  const [mobileOverlay, setMobileOverlay] = useState<MobileOverlay | null>(() => {
    const r = initialData.initialRoute;
    if (!r || r.kind === "explorer") return null;
    if (
      r.kind === "listing" ||
      r.kind === "profile" ||
      r.kind === "auth" ||
      r.kind === "favorites" ||
      r.kind === "admin" ||
      r.kind === "publish" ||
      r.kind === "commercialStore" ||
      r.kind === "rentStore" ||
      r.kind === "merchantDashboard"
    ) {
      return { kind: r.kind, payload: r.payload };
    }
    return null;
  });

  const zCounterRef = useRef<number>(20);

  const [windows, setWindows] = useState<WindowInstance[]>(() => {
    const baseExplorer: WindowInstance = {
      id: "explorer",
      kind: "explorer",
      title: "Explorador — ReUsa PY",
      x: 112,
      y: 16,
      width: 1120,
      height: 680,
      zIndex: 10,
      minimized: false,
      maximized: false,
    };

    const r = initialData.initialRoute;
    if (!r || r.kind === "explorer") {
      return [baseExplorer];
    }

    const secondaryId = r.payload?.slug
      ? `listing:${r.payload.slug}`
      : r.payload?.userId
      ? `profile:${r.payload.userId}`
      : r.kind;

    return [
      baseExplorer,
      {
        id: secondaryId,
        kind: r.kind,
        title: r.title || "ReUsa PY",
        payload: r.payload,
        x: 200,
        y: 34,
        width: r.kind === "auth" ? 450 : 840,
        height: r.kind === "auth" ? 550 : 660,
        zIndex: 15,
        minimized: false,
        maximized: false,
      },
    ];
  });

  const [activeWindowId, setActiveWindowId] = useState<string | null>(() => {
    const r = initialData.initialRoute;
    if (!r || r.kind === "explorer") return "explorer";
    if (r.payload?.slug) return `listing:${r.payload.slug}`;
    if (r.payload?.userId) return `profile:${r.payload.userId}`;
    return r.kind;
  });

  // Viewport detection & PWA service worker registration
  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);

    // Adjust initial explorer window smoothly to current desktop viewport
    if (window.innerWidth >= 1024) {
      const geo = getDefaultWindowGeometry("explorer", 0);
      setWindows((prev) =>
        prev.map((w) =>
          w.id === "explorer"
            ? { ...w, x: geo.x, y: geo.y, width: geo.width, height: geo.height }
            : w
        )
      );
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const effectiveMode: "desktop" | "mobile" =
    forceViewMode === "auto"
      ? isMobileViewport
        ? "mobile"
        : "desktop"
      : forceViewMode;

  const notifyToast = useCallback((message: string, tone: "info" | "success" | "error" = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      }
    } catch {}
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadNotifCount(data.unreadCount ?? 0);
      }
    } catch {}
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
        setUnreadChatCount(data.totalUnread ?? 0);
      }
    } catch {}
  }, []);

  const refreshSavedSearches = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-searches");
      if (res.ok) {
        const data = await res.json();
        setSavedSearches(data.savedSearches ?? []);
      }
    } catch {}
  }, []);

  const refreshCommercialStores = useCallback(async () => {
    try {
      const [pubRes, mineRes] = await Promise.all([
        fetch("/api/stores"),
        user ? fetch("/api/stores?mine=true") : Promise.resolve(null),
      ]);
      if (pubRes.ok) {
        const data = await pubRes.json();
        setCommercialStores(data.stores ?? []);
      }
      if (mineRes && mineRes.ok) {
        const data = await mineRes.json();
        setMyStores(data.stores ?? []);
      } else if (!user) {
        setMyStores([]);
      }
    } catch {}
  }, [user]);

  const addToStoreCart = useCallback(
    (storeId: string, listing: ListingDTO) => {
      setStoreCart((prev) => {
        const cur = prev[storeId] ?? [];
        const existing = cur.find((item) => item.listing.id === listing.id);
        const next = existing
          ? cur.map((item) =>
              item.listing.id === listing.id ? { ...item, qty: item.qty + 1 } : item
            )
          : [...cur, { listing, qty: 1 }];
        return { ...prev, [storeId]: next };
      });
      notifyToast(`Agregado al pedido: ${listing.title}`, "success");
    },
    [notifyToast]
  );

  const updateStoreCartQty = useCallback(
    (storeId: string, listingId: string, delta: number) => {
      setStoreCart((prev) => {
        const cur = prev[storeId] ?? [];
        const next = cur
          .map((item) =>
            item.listing.id === listingId ? { ...item, qty: item.qty + delta } : item
          )
          .filter((item) => item.qty > 0);
        return { ...prev, [storeId]: next };
      });
    },
    []
  );

  const clearStoreCart = useCallback((storeId: string) => {
    setStoreCart((prev) => ({ ...prev, [storeId]: [] }));
  }, []);

  const trackStoreEvent = useCallback(
    (storeIdOrSlug: string, event: "visit" | "product_click" | "whatsapp_click") => {
      if (!storeIdOrSlug) return;
      fetch(`/api/stores/${encodeURIComponent(storeIdOrSlug)}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      }).catch(() => {});
    },
    []
  );

  const refreshListings = useCallback(
    async (overrideFilters?: ListingFilters) => {
      const active = overrideFilters ?? filters;
      setLoadingListings(true);
      try {
        const params = new URLSearchParams();
        if (active.q) params.set("q", active.q);
        if (active.category) params.set("category", active.category);
        if (active.subcategory) params.set("subcategory", active.subcategory);
        if (active.storeSlug) params.set("storeSlug", active.storeSlug);
        if (active.sellerType) params.set("sellerType", active.sellerType);
        if (active.department) params.set("department", active.department);
        if (active.city) params.set("city", active.city);
        if (active.neighborhood) params.set("neighborhood", active.neighborhood);
        if (active.currency) params.set("currency", active.currency);
        if (active.minPrice) params.set("minPrice", active.minPrice);
        if (active.maxPrice) params.set("maxPrice", active.maxPrice);
        if (active.minSavings) params.set("minSavings", active.minSavings);
        if (active.condition) params.set("condition", active.condition);
        if (active.isFree) params.set("isFree", "true");
        if (active.isNegotiable) params.set("isNegotiable", "true");
        if (active.acceptsTrade) params.set("acceptsTrade", "true");
        if (active.delivery) params.set("delivery", active.delivery);
        if (active.vehicleBrand) params.set("vehicleBrand", active.vehicleBrand);
        if (active.vehicleYearMin) params.set("vehicleYearMin", active.vehicleYearMin);
        if (active.vehicleTransmission) params.set("vehicleTransmission", active.vehicleTransmission);
        if (active.vehicleFuel) params.set("vehicleFuel", active.vehicleFuel);
        if (active.realEstateOperation) params.set("realEstateOperation", active.realEstateOperation);
        if (active.realEstateType) params.set("realEstateType", active.realEstateType);
        if (active.bedroomsMin) params.set("bedroomsMin", active.bedroomsMin);
        if (active.apparelSize) params.set("apparelSize", active.apparelSize);
        if (active.sort) params.set("sort", active.sort);

        const res = await fetch(`/api/listings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setListings(data.listings ?? []);
          setTotalListings(data.total ?? 0);
          const favs = new Set<string>(
            (data.listings ?? []).filter((l: ListingDTO) => l.isFavorited).map((l: ListingDTO) => l.id)
          );
          if (user) {
            setFavoriteIds((prev) => new Set([...prev, ...favs]));
          }
        }
      } catch {
        notifyToast("No se pudieron cargar las publicaciones", "error");
      } finally {
        setLoadingListings(false);
      }
    },
    [filters, notifyToast, user]
  );

  // Sync user-dependent data when user logs in/out
  useEffect(() => {
    if (user) {
      refreshNotifications();
      refreshConversations();
      refreshSavedSearches();
      refreshCommercialStores();
      fetch("/api/favorites")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.favorites) {
            setFavoriteIds(new Set(data.favorites.map((f: { listing: ListingDTO }) => f.listing.id)));
          }
        })
        .catch(() => {});
    } else {
      setNotifications([]);
      setUnreadNotifCount(0);
      setConversations([]);
      setUnreadChatCount(0);
      setSavedSearches([]);
      setMyStores([]);
      setFavoriteIds(new Set());
    }
  }, [user, refreshConversations, refreshNotifications, refreshSavedSearches, refreshCommercialStores]);

  // Refetch listings when filters change (skip initial exact default mount)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      refreshListings(filters);
    }, 180);
    return () => clearTimeout(timer);
  }, [filters, refreshListings]);

  const updateFilters = useCallback((patch: Partial<ListingFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    notifyToast("Cerraste sesión correctamente", "info");
  }, [notifyToast]);

  const markNotificationRead = useCallback(async (id?: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    await refreshNotifications();
  }, [refreshNotifications]);

  // Window manager operations
  const openWindow = useCallback(
    (
      kind: WindowKind,
      opts?: { title?: string; payload?: Record<string, string>; uniqueKey?: string }
    ) => {
      const id = opts?.uniqueKey ? `${kind}:${opts.uniqueKey}` : kind;
      zCounterRef.current += 1;
      const nextZ = zCounterRef.current;

      setWindows((prev) => {
        const existing = prev.find((w) => w.id === id);
        if (existing) {
          return prev.map((w) =>
            w.id === id
              ? {
                  ...w,
                  minimized: false,
                  zIndex: nextZ,
                  title: opts?.title ?? w.title,
                  payload: opts?.payload ?? w.payload,
                }
              : w
          );
        }
        const geo = getDefaultWindowGeometry(kind, prev.length);
        const defaultTitles: Record<WindowKind, string> = {
          explorer: "Explorador — ReUsa PY",
          listing: "Detalle de publicación",
          publish: "Publicar aviso — ReUsa PY",
          chat: "Mensajes — ReUsa PY",
          map: "Mapa de Zonas — Paraguay",
          favorites: "Favoritos y Alertas",
          profile: "Perfil — ReUsa PY",
          admin: "Panel Admin y Tiendas — ReUsa PY",
          auth: "Cuenta — ReUsa PY",
          commercialStore: "Tienda Oficial — ReUsa PY",
          rentStore: "Alquilá tu Local 3D — ReUsa PY",
          merchantDashboard: "Panel de Mi Tienda — ReUsa PY",
        };
        return [
          ...prev,
          {
            id,
            kind,
            title: opts?.title || defaultTitles[kind],
            payload: opts?.payload,
            x: geo.x,
            y: geo.y,
            width: geo.width,
            height: geo.height,
            zIndex: nextZ,
            minimized: false,
            maximized: geo.maximized,
          },
        ];
      });
      setActiveWindowId(id);
    },
    []
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      const top = [...remaining]
        .filter((w) => !w.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      setActiveWindowId(top?.id ?? null);
      return remaining;
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: nextZ } : w))
    );
    setActiveWindowId(id);
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, minimized: true } : w));
      const top = [...updated]
        .filter((w) => !w.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0];
      setActiveWindowId(top?.id ?? null);
      return updated;
    });
  }, []);

  const toggleMaximizeWindow = useCallback((id: string) => {
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized, minimized: false, zIndex: nextZ } : w
      )
    );
    setActiveWindowId(id);
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const snapWindow = useCallback((id: string, side: "left" | "right") => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1366;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const halfW = Math.floor((vw - 24) / 2);
    const h = vh - 64;
    zCounterRef.current += 1;
    const nextZ = zCounterRef.current;
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              maximized: false,
              minimized: false,
              x: side === "left" ? 8 : halfW + 16,
              y: 8,
              width: halfW,
              height: h,
              zIndex: nextZ,
            }
          : w
      )
    );
    setActiveWindowId(id);
  }, []);

  // Cross-shell helpers
  const openAuth = useCallback(() => {
    if (experienceMode === "world3d") {
      setWorldModal({ kind: "auth" });
      return;
    }
    if (effectiveMode === "mobile") {
      setMobileOverlay({ kind: "auth" });
    } else {
      openWindow("auth", { title: "Ingresar a ReUsa PY" });
    }
  }, [effectiveMode, experienceMode, openWindow]);

  const openListing = useCallback(
    (slug: string, title?: string) => {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/aviso/${slug}`);
      }
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "listing", slug, title });
        return;
      }
      if (effectiveMode === "mobile") {
        setMobileOverlay({ kind: "listing", payload: { slug } });
      } else {
        openWindow("listing", {
          title: title ? `${title.slice(0, 42)} — ReUsa PY` : "Publicación — ReUsa PY",
          payload: { slug },
          uniqueKey: slug,
        });
      }
    },
    [effectiveMode, experienceMode, openWindow]
  );

  const openChat = useCallback(
    (conversationId?: string) => {
      if (!user) {
        notifyToast("Iniciá sesión para acceder a tus mensajes", "info");
        openAuth();
        return;
      }
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "chat", conversationId });
        refreshConversations();
        return;
      }
      if (effectiveMode === "mobile") {
        setMobileOverlay(null);
        setMobileTab("chat");
      } else {
        openWindow("chat", {
          title: "Mensajes — ReUsa PY",
          payload: conversationId ? { conversationId } : undefined,
        });
      }
      refreshConversations();
    },
    [effectiveMode, experienceMode, notifyToast, openAuth, openWindow, refreshConversations, user]
  );

  const openPublish = useCallback(
    (editId?: string) => {
      if (!user) {
        notifyToast("Iniciá sesión para publicar tus productos", "info");
        openAuth();
        return;
      }
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "publish", editId });
        return;
      }
      if (effectiveMode === "mobile") {
        if (editId) {
          setMobileOverlay({ kind: "publish", payload: { editId } });
        } else {
          setMobileOverlay(null);
          setMobileTab("publish");
        }
      } else {
        openWindow("publish", {
          title: editId ? "Editar publicación — ReUsa PY" : "Publicar aviso — ReUsa PY",
          payload: editId ? { editId } : undefined,
          uniqueKey: editId || undefined,
        });
      }
    },
    [effectiveMode, experienceMode, notifyToast, openAuth, openWindow, user]
  );

  const openProfile = useCallback(
    (userId?: string) => {
      const targetId = userId || user?.id;
      if (!targetId) {
        openAuth();
        return;
      }
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "profile", userId: targetId });
        return;
      }
      if (effectiveMode === "mobile") {
        if (!userId || userId === user?.id) {
          setMobileOverlay(null);
          setMobileTab("profile");
        } else {
          setMobileOverlay({ kind: "profile", payload: { userId: targetId } });
        }
      } else {
        openWindow("profile", {
          title: targetId === user?.id ? "Mi Perfil — ReUsa PY" : "Perfil del Vendedor",
          payload: { userId: targetId },
          uniqueKey: targetId,
        });
      }
    },
    [effectiveMode, experienceMode, openAuth, openWindow, user?.id]
  );

  const openMap = useCallback(() => {
    if (experienceMode === "world3d") {
      setExperienceMode("classic");
    }
    if (effectiveMode === "mobile") {
      setMobileOverlay(null);
      setMobileTab("map");
    } else {
      openWindow("map", { title: "Mapa de Zonas — Paraguay" });
    }
  }, [effectiveMode, experienceMode, openWindow]);

  const openFavorites = useCallback(() => {
    if (!user) {
      notifyToast("Iniciá sesión para ver tus favoritos y alertas", "info");
      openAuth();
      return;
    }
    if (experienceMode === "world3d") {
      setWorldModal({ kind: "favorites" });
      return;
    }
    if (effectiveMode === "mobile") {
      setMobileOverlay({ kind: "favorites" });
    } else {
      openWindow("favorites", { title: "Favoritos y Alertas" });
    }
  }, [effectiveMode, experienceMode, notifyToast, openAuth, openWindow, user]);

  const openAdmin = useCallback(() => {
    if (!user || user.role !== "ADMIN") {
      notifyToast("Acceso exclusivo para moderadores", "error");
      return;
    }
    if (experienceMode === "world3d") {
      setWorldModal({ kind: "admin" });
      return;
    }
    if (effectiveMode === "mobile") {
      setMobileOverlay({ kind: "admin" });
    } else {
      openWindow("admin", { title: "Panel de Moderación — ReUsa PY" });
    }
  }, [effectiveMode, experienceMode, notifyToast, openWindow, user]);

  const openCommercialStore = useCallback(
    (slug: string, title?: string) => {
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "commercialStore", slug, title });
        return;
      }
      if (effectiveMode === "mobile") {
        setMobileOverlay({ kind: "commercialStore", payload: { slug } });
      } else {
        openWindow("commercialStore", {
          title: title || "Tienda Oficial — ReUsa PY",
          payload: { slug },
          uniqueKey: `store:${slug}`,
        });
      }
    },
    [effectiveMode, experienceMode, openWindow]
  );

  const openRentStore = useCallback(
    (defaultPlan?: "BASIC" | "FEATURED" | "FLAGSHIP") => {
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "rentStore", defaultPlan });
        return;
      }
      if (effectiveMode === "mobile") {
        setMobileOverlay({
          kind: "rentStore",
          payload: defaultPlan ? { defaultPlan } : undefined,
        });
      } else {
        openWindow("rentStore", {
          title: "Abrir mi Local 3D — ReUsa PY",
          payload: defaultPlan ? { defaultPlan } : undefined,
        });
      }
    },
    [effectiveMode, experienceMode, openWindow]
  );

  const openMerchantDashboard = useCallback(
    (storeId?: string) => {
      if (!user) {
        notifyToast("Iniciá sesión para gestionar tu tienda", "info");
        openAuth();
        return;
      }
      if (experienceMode === "world3d") {
        setWorldModal({ kind: "merchantDashboard", storeId });
        return;
      }
      if (effectiveMode === "mobile") {
        setMobileOverlay({
          kind: "merchantDashboard",
          payload: storeId ? { storeId } : undefined,
        });
      } else {
        openWindow("merchantDashboard", {
          title: "Mi Tienda Oficial — Panel de Gestión",
          payload: storeId ? { storeId } : undefined,
        });
      }
    },
    [effectiveMode, experienceMode, notifyToast, openAuth, openWindow, user]
  );

  const openExplorerWithFilters = useCallback(
    (patch: Partial<ListingFilters>, resetFirst = false) => {
      setFilters((prev) => (resetFirst ? { ...DEFAULT_FILTERS, ...patch } : { ...prev, ...patch }));
      if (experienceMode === "world3d") {
        setWorldModal(null);
        setExperienceMode("classic");
      }
      if (effectiveMode === "mobile") {
        setMobileOverlay(null);
        setMobileTab("home");
      } else {
        openWindow("explorer", { title: "Explorador — ReUsa PY" });
      }
    },
    [effectiveMode, experienceMode, openWindow]
  );

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user) {
        notifyToast("Iniciá sesión para guardar favoritos", "info");
        openAuth();
        return;
      }
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (data.favorited) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        notifyToast(
          data.favorited
            ? "Guardado en favoritos (te avisaremos si baja de precio)"
            : "Quitado de favoritos",
          "success"
        );
      } catch {
        notifyToast("No se pudo actualizar favorito", "error");
      }
    },
    [notifyToast, openAuth, user]
  );

  const startChatForListing = useCallback(
    async (listingId: string) => {
      if (!user) {
        notifyToast("Iniciá sesión para chatear con el vendedor", "info");
        openAuth();
        return;
      }
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
        const data = await res.json();
        if (!res.ok) {
          notifyToast(data.error || "No se pudo abrir el chat", "error");
          return;
        }
        await refreshConversations();
        openChat(data.conversationId);
      } catch {
        notifyToast("Error iniciando conversación", "error");
      }
    },
    [notifyToast, openAuth, openChat, refreshConversations, user]
  );

  const sendOfferForListing = useCallback(
    async (
      listingId: string,
      offerAmount: number,
      offerCurrency: "PYG" | "USD",
      note?: string
    ): Promise<boolean> => {
      if (!user) {
        notifyToast("Iniciá sesión para enviar tu oferta al vendedor", "info");
        openAuth();
        return false;
      }
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId,
            offerAmount,
            offerCurrency,
            initialMessage: note?.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          notifyToast(data.error || "No se pudo enviar la oferta", "error");
          return false;
        }
        await refreshConversations();
        notifyToast("¡Oferta enviada! Te llevamos al chat para seguir la negociación.", "success");
        openChat(data.conversationId);
        return true;
      } catch {
        notifyToast("Error enviando oferta", "error");
        return false;
      }
    },
    [notifyToast, openAuth, openChat, refreshConversations, user]
  );

  const requestWorldTeleport = useCallback((target: NonNullable<WorldTeleportTarget>) => {
    setWorldTeleport({ ...target, ts: Date.now() });
  }, []);

  const clearWorldTeleport = useCallback(() => {
    setWorldTeleport(null);
  }, []);

  const openListingStoryCard = useCallback((listing: ListingDTO) => {
    setStoryCardTarget({ kind: "listing", listing });
  }, []);

  const openStoreStoryCard = useCallback((store: CommercialStoreDTO, catalog: ListingDTO[]) => {
    setStoryCardTarget({ kind: "store", store, catalog });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      setUser,
      refreshUser,
      logout,
      categories,
      departments,
      listings,
      totalListings,
      loadingListings,
      filters,
      setFilters,
      updateFilters,
      resetFilters,
      refreshListings,
      commercialStores,
      myStores,
      refreshCommercialStores,
      storeCart,
      addToStoreCart,
      updateStoreCartQty,
      clearStoreCart,
      trackStoreEvent,
      favoriteIds,
      toggleFavorite,
      notifications,
      unreadNotifCount,
      refreshNotifications,
      markNotificationRead,
      conversations,
      unreadChatCount,
      refreshConversations,
      savedSearches,
      refreshSavedSearches,
      windows,
      activeWindowId,
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximizeWindow,
      moveWindow,
      snapWindow,
      experienceMode,
      setExperienceMode,
      worldModal,
      setWorldModal,
      isMobileViewport,
      forceViewMode,
      setForceViewMode,
      effectiveMode,
      mobileTab,
      setMobileTab,
      mobileOverlay,
      setMobileOverlay,
      openListing,
      openChat,
      openPublish,
      openProfile,
      openMap,
      openFavorites,
      openAdmin,
      openAuth,
      openCommercialStore,
      openRentStore,
      openMerchantDashboard,
      openExplorerWithFilters,
      startChatForListing,
      sendOfferForListing,
      commandSearchOpen,
      setCommandSearchOpen,
      worldTeleport,
      requestWorldTeleport,
      clearWorldTeleport,
      storyCardTarget,
      setStoryCardTarget,
      openListingStoryCard,
      openStoreStoryCard,
      toasts,
      notifyToast,
    }),
    [
      user,
      refreshUser,
      logout,
      categories,
      departments,
      listings,
      totalListings,
      loadingListings,
      filters,
      updateFilters,
      resetFilters,
      refreshListings,
      commercialStores,
      myStores,
      refreshCommercialStores,
      storeCart,
      addToStoreCart,
      updateStoreCartQty,
      clearStoreCart,
      trackStoreEvent,
      favoriteIds,
      toggleFavorite,
      notifications,
      unreadNotifCount,
      refreshNotifications,
      markNotificationRead,
      conversations,
      unreadChatCount,
      refreshConversations,
      savedSearches,
      refreshSavedSearches,
      windows,
      activeWindowId,
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      toggleMaximizeWindow,
      moveWindow,
      snapWindow,
      experienceMode,
      worldModal,
      isMobileViewport,
      forceViewMode,
      effectiveMode,
      mobileTab,
      mobileOverlay,
      openListing,
      openChat,
      openPublish,
      openProfile,
      openMap,
      openFavorites,
      openAdmin,
      openAuth,
      openCommercialStore,
      openRentStore,
      openMerchantDashboard,
      openExplorerWithFilters,
      startChatForListing,
      sendOfferForListing,
      commandSearchOpen,
      worldTeleport,
      requestWorldTeleport,
      clearWorldTeleport,
      storyCardTarget,
      openListingStoryCard,
      openStoreStoryCard,
      toasts,
      notifyToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
