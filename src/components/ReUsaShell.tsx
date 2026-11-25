"use client";

import { AppProvider, useApp, type WindowKind } from "@/components/AppContext";
import { DesktopShell } from "@/components/desktop/DesktopShell";
import { MobileShell } from "@/components/mobile/MobileShell";
import type {
  CategoryDTO,
  DepartmentDTO,
  ListingDTO,
  UserDTO,
} from "@/types/marketplace";

function ShellRouter() {
  const { effectiveMode, toasts } = useApp();

  return (
    <>
      {effectiveMode === "mobile" ? <MobileShell /> : <DesktopShell />}

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
  initialRoute,
}: {
  initialUser: UserDTO | null;
  initialCategories: CategoryDTO[];
  initialDepartments: DepartmentDTO[];
  initialListings: ListingDTO[];
  initialRoute?: {
    kind: WindowKind;
    payload?: Record<string, string>;
    title?: string;
  };
}) {
  return (
    <AppProvider
      initialData={{
        initialUser,
        initialCategories,
        initialDepartments,
        initialListings,
        initialRoute,
      }}
    >
      <ShellRouter />
    </AppProvider>
  );
}
