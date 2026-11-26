"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, Share2, Sparkles, X } from "lucide-react";
import { useApp } from "@/components/AppContext";
import {
  renderListingStoryCard,
  renderStoreStoryCard,
  type StoryCardTheme,
} from "@/lib/storyCardGenerator";

export function StoryCardModal() {
  const { storyCardTarget, setStoryCardTarget, notifyToast } = useApp();
  const [theme, setTheme] = useState<StoryCardTheme>("vice");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!storyCardTarget) {
      setDataUrl(null);
      return;
    }
    let active = true;
    setRendering(true);
    const run = async () => {
      try {
        const url =
          storyCardTarget.kind === "listing"
            ? await renderListingStoryCard(storyCardTarget.listing, theme)
            : await renderStoreStoryCard(storyCardTarget.store, storyCardTarget.catalog, theme);
        if (active) setDataUrl(url);
      } catch {
        if (active) notifyToast("No se pudo generar la placa", "error");
      } finally {
        if (active) setRendering(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [storyCardTarget, theme, notifyToast]);

  if (!storyCardTarget) return null;

  const fileName =
    storyCardTarget.kind === "listing"
      ? `reusa-story-${storyCardTarget.listing.slug}.png`
      : `reusa-tienda-${storyCardTarget.store.slug}.png`;

  const shareTitle =
    storyCardTarget.kind === "listing"
      ? storyCardTarget.listing.title
      : storyCardTarget.store.name;

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    notifyToast("¡Placa 9:16 descargada! Subila a tu Estado de WhatsApp o IG Story.", "success");
  };

  const handleNativeShare = async () => {
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${shareTitle} — ReUsa PY`,
          text:
            storyCardTarget.kind === "listing"
              ? `Mirá este aviso en ReUsa PY: https://reusa-py.vercel.app/aviso/${storyCardTarget.listing.slug}`
              : `Visitá nuestra Tienda Oficial 3D: https://reusa-py.vercel.app/tienda/${storyCardTarget.store.slug}`,
          files: [file],
        });
        return;
      }
    } catch {
      // Fall through to direct download
    }
    handleDownload();
  };

  return (
    <div
      onClick={() => setStoryCardTarget(null)}
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-in flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#100a22] text-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2a9d] to-[#00f0ff] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold">Placa para WhatsApp / IG Stories</h2>
              <p className="text-[10.5px] text-slate-300">Formato vertical HD 1080×1920 (9:16)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStoryCardTarget(null)}
            className="rounded-full bg-white/10 p-1.5 text-slate-300 transition hover:bg-rose-500 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Style Toggle */}
        <div className="flex items-center justify-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
          <button
            type="button"
            onClick={() => setTheme("vice")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              theme === "vice"
                ? "bg-gradient-to-r from-[#ff2a9d] to-[#00f0ff] text-slate-950 shadow-sm"
                : "bg-white/10 text-slate-200 hover:bg-white/20"
            }`}
          >
            Estilo Vice Neón
          </button>
          <button
            type="button"
            onClick={() => setTheme("clean")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              theme === "clean"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-white/10 text-slate-200 hover:bg-white/20"
            }`}
          >
            Estilo Claro Moderno
          </button>
        </div>

        {/* Canvas Preview */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
          {rendering || !dataUrl ? (
            <div className="flex aspect-[9/16] h-[420px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-xs text-cyan-200">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Generando placa HD...
            </div>
          ) : (
            <img
              src={dataUrl}
              alt="Vista previa de placa para Stories"
              className="max-h-[54dvh] w-auto rounded-2xl border border-white/20 shadow-[0_18px_45px_rgba(0,0,0,0.6)]"
            />
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-black/30 p-3.5">
          <button
            type="button"
            disabled={!dataUrl || rendering}
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-extrabold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Descargar PNG
          </button>
          <button
            type="button"
            disabled={!dataUrl || rendering}
            onClick={handleNativeShare}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-2.5 text-xs font-extrabold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> Compartir Story
          </button>
        </div>
      </div>
    </div>
  );
}
