"use client";

import React, { useRef } from "react";
import {
  Columns2,
  FolderOpen,
  Heart,
  KeyRound,
  Map as MapIcon,
  Maximize2,
  MessageCircle,
  Minimize2,
  Minus,
  PlusSquare,
  Shield,
  Tag,
  User,
  X,
} from "lucide-react";
import type { WindowInstance, WindowKind } from "@/components/AppContext";
import { useApp } from "@/components/AppContext";

function WindowIcon({ kind }: { kind: WindowKind }) {
  switch (kind) {
    case "explorer":
      return <FolderOpen className="h-4 w-4 text-[#0067c0]" />;
    case "listing":
      return <Tag className="h-4 w-4 text-emerald-600" />;
    case "publish":
      return <PlusSquare className="h-4 w-4 text-[#0067c0]" />;
    case "chat":
      return <MessageCircle className="h-4 w-4 text-sky-600" />;
    case "map":
      return <MapIcon className="h-4 w-4 text-teal-600" />;
    case "favorites":
      return <Heart className="h-4 w-4 text-rose-500" />;
    case "profile":
      return <User className="h-4 w-4 text-indigo-600" />;
    case "admin":
      return <Shield className="h-4 w-4 text-amber-600" />;
    case "auth":
      return <KeyRound className="h-4 w-4 text-[#0067c0]" />;
  }
}

export function OsWindow({
  win,
  isActive,
  children,
}: {
  win: WindowInstance;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const {
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    moveWindow,
    snapWindow,
  } = useApp();

  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  if (win.minimized) return null;

  const handleTitlebarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    focusWindow(win.id);
    if (win.maximized) return;

    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: win.x,
      originY: win.y,
    };

    const handleMove = (ev: PointerEvent) => {
      if (!dragStateRef.current) return;
      const dx = ev.clientX - dragStateRef.current.startX;
      const dy = ev.clientY - dragStateRef.current.startY;
      const maxX = Math.max(40, window.innerWidth - 180);
      const maxY = Math.max(40, window.innerHeight - 96);
      const nextX = Math.min(maxX, Math.max(-win.width + 200, dragStateRef.current.originX + dx));
      const nextY = Math.min(maxY, Math.max(4, dragStateRef.current.originY + dy));
      moveWindow(win.id, nextX, nextY);
    };

    const handleUp = () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const style: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: 0,
        width: "100vw",
        height: "calc(100vh - 48px)",
        zIndex: win.zIndex,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <section
      onMouseDown={() => focusWindow(win.id)}
      style={style}
      className={`fixed flex flex-col overflow-hidden transition-shadow duration-150 ${
        win.maximized ? "rounded-none" : "rounded-2xl"
      } ${
        isActive ? "win-window-shadow" : "win-window-shadow-inactive opacity-[0.97]"
      } bg-[#f8fafd]`}
    >
      {/* Windows 11 Title Bar */}
      <div
        onPointerDown={handleTitlebarPointerDown}
        onDoubleClick={() => toggleMaximizeWindow(win.id)}
        className={`flex h-10 shrink-0 select-none items-center justify-between border-b border-slate-200/80 px-3 ${
          isActive ? "win-mica" : "bg-slate-100/90"
        } ${win.maximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <WindowIcon kind={win.kind} />
          <span className="truncate text-xs font-semibold text-slate-800">{win.title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* Quick Split Snap buttons for comparing listings side-by-side */}
          <button
            type="button"
            onClick={() => snapWindow(win.id, "left")}
            title="Acoplar a la izquierda (ideal para comparar avisos)"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 xl:inline-flex"
          >
            <Columns2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => snapWindow(win.id, "right")}
            title="Acoplar a la derecha"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 xl:inline-flex"
          >
            <Columns2 className="h-3.5 w-3.5 rotate-180" />
          </button>

          <button
            type="button"
            onClick={() => minimizeWindow(win.id)}
            aria-label="Minimizar"
            className="inline-flex h-7 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200/75"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggleMaximizeWindow(win.id)}
            aria-label={win.maximized ? "Restaurar" : "Maximizar"}
            className="inline-flex h-7 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-200/75"
          >
            {win.maximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => closeWindow(win.id)}
            aria-label="Cerrar"
            className="inline-flex h-7 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-rose-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}
