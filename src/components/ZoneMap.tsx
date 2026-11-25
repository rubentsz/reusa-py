"use client";

import { useEffect, useRef } from "react";
import type LType from "leaflet";
import type { ListingDTO } from "@/types/marketplace";
import { formatPrice } from "@/lib/format";

interface ZoneMapProps {
  listings: ListingDTO[];
  singleMode?: boolean;
  heightClass?: string;
  onSelectListing?: (slug: string, title: string) => void;
}

export function ZoneMap({
  listings,
  singleMode = false,
  heightClass = "h-full min-h-[320px]",
  onSelectListing,
}: ZoneMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        const center: [number, number] =
          listings.length > 0
            ? [listings[0].approxLat, listings[0].approxLng]
            : [-25.2867, -57.647];

        const map = L.map(containerRef.current, {
          center,
          zoom: singleMode ? 14 : 11,
          zoomControl: true,
          scrollWheelZoom: !singleMode,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 18,
        }).addTo(map);

        mapRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      }

      const map = mapRef.current;
      const group = layerGroupRef.current!;
      group.clearLayers();

      const bounds: [number, number][] = [];

      for (const item of listings) {
        const pos: [number, number] = [item.approxLat, item.approxLng];
        bounds.push(pos);

        // Privacy-preserving approximate zone circle (~550m radius)
        L.circle(pos, {
          radius: singleMode ? 550 : 750,
          color: "#0067c0",
          weight: 1.5,
          fillColor: "#0ea5e9",
          fillOpacity: singleMode ? 0.18 : 0.12,
        }).addTo(group);

        if (!singleMode) {
          const priceText = formatPrice(item.price, item.currency, item.isFree);
          const badgeColor = item.isFree
            ? "#059669"
            : item.savingsPercent
            ? "#047857"
            : "#0067c0";

          const icon = L.divIcon({
            className: "reusa-map-pin",
            html: `<div style="background:${badgeColor};color:#fff;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(15,23,42,0.28);border:2px solid #fff;display:inline-flex;align-items:center;gap:4px;">${priceText}${
              item.savingsPercent ? `<span style="background:rgba(255,255,255,0.22);padding:0 4px;border-radius:999px;font-size:10px;">-${item.savingsPercent}%</span>` : ""
            }</div>`,
            iconSize: [0, 0],
            iconAnchor: [40, 14],
          });

          const marker = L.marker(pos, { icon }).addTo(group);
          const cover = item.images[0]?.url || "";
          const loc = [item.neighborhood?.name, item.city.name].filter(Boolean).join(", ");

          const popupEl = document.createElement("div");
          popupEl.style.width = "210px";
          popupEl.innerHTML = `
            <div style="font-family:inherit;">
              ${
                cover
                  ? `<img src="${cover}" alt="" style="width:100%;height:105px;object-fit:cover;border-radius:8px;margin-bottom:6px;" />`
                  : ""
              }
              <div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.25;margin-bottom:3px;">${item.title.replace(/</g, "&lt;")}</div>
              <div style="font-weight:800;font-size:14px;color:#0067c0;margin-bottom:2px;">${priceText}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:8px;">Zona aprox: ${loc}</div>
              <button data-open-listing="1" style="width:100%;background:#0067c0;color:#fff;border:none;border-radius:7px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;">Abrir publicación</button>
            </div>
          `;
          popupEl.querySelector("[data-open-listing]")?.addEventListener("click", () => {
            onSelectListing?.(item.slug, item.title);
          });
          marker.bindPopup(popupEl);
        }
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], singleMode ? 14 : 13);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 160);
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [listings, singleMode, onSelectListing]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-slate-200/80 ${heightClass}`}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur-md">
        Ubicación aproximada por zona/barrio para proteger la privacidad
      </div>
    </div>
  );
}
