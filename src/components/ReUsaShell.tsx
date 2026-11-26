"use client";

import dynamic from "next/dynamic";
import {
  AppProvider,
  useApp,
  type AppWorldModal,
  type WindowKind,
} from "@/components/AppContext";
import { DesktopShell } from "@/components/desktop/DesktopShell";
import { MobileShell } from "@/components/mobile/MobileShell";
import type {
  CategoryDTO,
  CommercialStoreDTO,
  DepartmentDTO,
  ListingDTO,
  UserDTO,
} from "@/types/marketplace";

const ViceCityWorld = dynamic(
  () => import("@/components/world3d/ViceCityWorld").then((m) => m.ViceCityWorld),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh w-screen flex-col items-center justify-center bg-gradient-to-b from-[#150a2d] via-[#3a1554] to-[#ff6b6b] text-white">
        <img src="/icons/icon.svg" alt="ReUsa PY" className="h-14 w-14 rounded-2xl shadow-xl" />
        <h1 className="mt-4 bg-gradient-to-r from-[#00f0ff] via-white to-[#ff4fd8] bg-clip-text text-2xl font-black italic tracking-tight text-transparent">
          REUSA VICE PY 3D
        </h1>
        <p className="mt-1.5 text-xs font-semibold text-cyan-200">
          Cargando Avenida de Marcas y tus tiendas en 3D...
        </p>
      </div>
    ),
  }
);

function ShellRouter({
  initialModal,
  initialCommercialStoreSlug,
}: {
  initialModal?: AppWorldModal;
  initialCommercialStoreSlug?: string;
}) {
  const { experienceMode, effectiveMode, toasts } = useApp();

  return (
    <>
      {experienceMode === "world3d" ? (
        <ViceCityWorld
          initialModal={initialModal}
          initialCommercialStoreSlug={initialCommercialStoreSlug}
        />
      ) : effectiveMode === "mobile" ? (
        <MobileShell />
      ) : (
        <DesktopShell />
      )}

      {/* Fluent Toast Notifications */}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-[1200] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md ${
                t.tone === "error"
                  ? "bg-rose-600/95 text-white"
                  : t.tone === "success"
                  ? "bg-emerald-600/95 text-white"
                  : "bg-slate-900/90 text-white"
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ReUsaShell({
  initialUser,
  initialCategories,
  initialDepartments,
  initialListings,
  initialCommercialStores = [],
  initialRoute,
  initialCommercialStoreSlug,
}: {
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
  initialCommercialStoreSlug?: string;
}) {
  const initialModal: AppWorldModal = (() => {
    if (!initialRoute || initialRoute.kind === "explorer") return null;
    if (initialRoute.kind === "listing" && initialRoute.payload?.slug) {
      return {
        kind: "listing",
        slug: initialRoute.payload.slug,
        title: initialRoute.title,
      };
    }
    if (initialRoute.kind === "commercialStore" && initialRoute.payload?.slug) {
      return {
        kind: "commercialStore",
        slug: initialRoute.payload.slug,
        title: initialRoute.title,
      };
    }
    if (initialRoute.kind === "rentStore") {
      return { kind: "rentStore" };
    }
    if (initialRoute.kind === "merchantDashboard") {
      return { kind: "merchantDashboard", storeId: initialRoute.payload?.storeId };
    }
    if (initialRoute.kind === "publish") {
      return { kind: "publish", editId: initialRoute.payload?.editId };
    }
    if (initialRoute.kind === "chat") {
      return { kind: "chat", conversationId: initialRoute.payload?.conversationId };
    }
    if (initialRoute.kind === "profile") {
      return { kind: "profile", userId: initialRoute.payload?.userId };
    }
    if (initialRoute.kind === "admin") return { kind: "admin" };
    if (initialRoute.kind === "favorites") return { kind: "favorites" };
    if (initialRoute.kind === "auth") return { kind: "auth" };
    return null;
  })();

  return (
    <AppProvider
      initialData={{
        initialUser,
        initialCategories,
        initialDepartments,
        initialListings,
        initialCommercialStores,
        initialRoute,
      }}
    >
      <ShellRouter
        initialModal={initialModal}
        initialCommercialStoreSlug={initialCommercialStoreSlug}
      />
    </AppProvider>
  );
}
