"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const GEOJSON_URL = "/data/us-states.geojson";

// East bound stretched into the Atlantic so we can park small east-coast
// states off-shore with leader lines back to the actual state.
const US_BOUNDS: L.LatLngBoundsLiteral = [
  [24.4, -125.0], // SW
  [49.4, -58.0], // NE — extra room east of Maine
];
const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const MAP_TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const OUTLINE_STROKE = "#7dd3fc"; // sky-300
const OUTLINE_FILL = "#0ea5e9"; // sky-500
const OUTLINE_GLOW = "rgba(56,189,248,0.14)";

// Liquid-glass pill — translucent body, refracts the map underneath.
const GLASS_TINT_HI = "rgba(255,255,255,0.20)";
const GLASS_TINT_LO = "rgba(255,255,255,0.06)";
const GLASS_EDGE_TOP = "rgba(255,255,255,0.62)";
const GLASS_EDGE_BOTTOM = "rgba(255,255,255,0.18)";
const GLASS_INNER_DARK = "rgba(0,0,0,0.30)";
const GLASS_DROP_SHADOW = "rgba(0,0,0,0.45)";
const GLASS_SPECULAR = "rgba(255,255,255,0.85)";
const GLASS_TEXT = "#f8fafc";

// Leader line connecting an off-map pin to its real state centroid.
const LEADER_COLOR = "#7dd3fc";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🗺️ STATE LOOKUPS                                                      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Visual centroids (label points) — tuned for readable pin placement, not
// strict geometric centroids.
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.78, -86.83], AK: [64.20, -149.49], AZ: [34.05, -111.09],
  AR: [34.97, -92.37], CA: [36.78, -119.42], CO: [39.06, -105.36],
  CT: [41.60, -72.73], DE: [39.32, -75.51], DC: [38.91, -77.02],
  FL: [28.63, -82.45], GA: [32.65, -83.45], HI: [20.79, -156.50],
  ID: [44.24, -114.48], IL: [40.05, -89.20], IN: [39.85, -86.28],
  IA: [42.07, -93.50], KS: [38.50, -98.38], KY: [37.65, -84.67],
  LA: [31.07, -91.96], ME: [45.37, -69.24], MD: [39.06, -76.80],
  MA: [42.23, -71.53], MI: [44.35, -85.41], MN: [46.28, -94.31],
  MS: [32.74, -89.68], MO: [38.46, -92.30], MT: [46.92, -110.45],
  NE: [41.13, -98.27], NV: [38.31, -117.05], NH: [43.45, -71.56],
  NJ: [40.30, -74.52], NM: [34.40, -106.11], NY: [42.93, -75.50],
  NC: [35.63, -79.81], ND: [47.53, -99.78], OH: [40.39, -82.76],
  OK: [35.57, -96.93], OR: [44.57, -120.51], PA: [40.59, -77.21],
  RI: [41.68, -71.51], SC: [33.86, -80.95], SD: [44.30, -99.44],
  TN: [35.75, -86.69], TX: [31.05, -97.56], UT: [39.32, -111.65],
  VT: [44.04, -72.71], VA: [37.77, -78.17], WA: [47.40, -121.49],
  WV: [38.49, -80.95], WI: [44.27, -89.62], WY: [42.76, -107.30],
  PR: [18.22, -66.59],
};

// Small east-coast / NE states whose pins overlap their neighbors. These
// render off-shore in the Atlantic with a leader line back to the centroid.
// Stacked roughly north→south at lng -62 so they form a tidy column.
const STATE_PIN_OFFSETS: Record<string, [number, number]> = {
  VT: [46.0, -62.0],
  NH: [44.7, -62.0],
  MA: [43.4, -62.0],
  RI: [42.1, -62.0],
  CT: [40.8, -62.0],
  NJ: [39.5, -62.0],
  DE: [38.2, -62.0],
  MD: [36.9, -62.0],
  DC: [35.6, -62.0],
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 SVG GLOW FILTER                                                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const FILTER_ID = "stats-map-glow";

function ensureGlowFilter(map: L.Map) {
  const svg = map.getPane("overlayPane")?.querySelector("svg") as
    | SVGSVGElement
    | null;
  if (!svg) return;
  if (svg.querySelector(`#${FILTER_ID}`)) return;
  const ns = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(ns, "defs");
  defs.innerHTML = `
    <filter id="${FILTER_ID}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.625" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `;
  svg.insertBefore(defs, svg.firstChild);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📍 PIN ICON                                                           ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function pinIcon(count: number, max: number): L.DivIcon {
  // Pill geometry — same proportions as the orders-page size badge (h-6).
  const ratio = max > 1 ? Math.log(count + 1) / Math.log(max + 1) : 1;
  const height = Math.round(22 + ratio * 6); // 22 → 28
  const fontSize = Math.round(11 + ratio * 2); // 11 → 13
  const text = String(count);
  const padX = Math.max(10, Math.round(height * 0.5));
  const width = Math.max(
    height + 8,
    Math.round(text.length * fontSize * 0.62 + padX * 2),
  );
  const blur = Math.max(8, Math.round(height * 0.5));

  // Liquid-glass treatment: translucent body w/ backdrop blur, hairline
  // iridescent rim, top specular crescent, soft bottom inner shadow,
  // outer drop shadow — applied to a pill (10px radius), not a circle.
  const html = `
    <div style="position:relative;width:${width}px;height:${height}px;">
      <!-- glass body -->
      <div style="
        position:absolute;inset:0;border-radius:10px;
        background:linear-gradient(160deg,${GLASS_TINT_HI} 0%,${GLASS_TINT_LO} 55%,${GLASS_TINT_HI} 100%);
        backdrop-filter:blur(${blur}px) saturate(180%);
        -webkit-backdrop-filter:blur(${blur}px) saturate(180%);
        box-shadow:
          inset 0 1px 0 ${GLASS_EDGE_TOP},
          inset 0 -1px 0 ${GLASS_EDGE_BOTTOM},
          inset 0 -3px 5px -3px ${GLASS_INNER_DARK},
          0 4px 12px -2px ${GLASS_DROP_SHADOW};
      "></div>
      <!-- iridescent hairline rim -->
      <div style="
        position:absolute;inset:0;border-radius:10px;pointer-events:none;
        padding:1px;
        background:conic-gradient(from 220deg,
          rgba(255,255,255,0.55) 0%,
          rgba(255,255,255,0.15) 25%,
          rgba(125,211,252,0.35) 55%,
          rgba(255,255,255,0.55) 100%);
        -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
        -webkit-mask-composite:xor;mask-composite:exclude;
      "></div>
      <!-- top specular crescent -->
      <div style="
        position:absolute;top:8%;left:14%;right:14%;height:32%;
        border-radius:10px;
        background:radial-gradient(120% 100% at 50% 0%,
          ${GLASS_SPECULAR} 0%,
          rgba(255,255,255,0.18) 45%,
          rgba(255,255,255,0) 70%);
        filter:blur(0.5px);pointer-events:none;
      "></div>
      <!-- number -->
      <div style="
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        color:${GLASS_TEXT};font-weight:600;font-size:${fontSize}px;
        font-family:-apple-system,system-ui,sans-serif;letter-spacing:-0.01em;
        text-shadow:0 1px 1px rgba(0,0,0,0.45),0 0 4px rgba(0,0,0,0.25);
      ">${text}</div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "stats-map-pin",
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
    popupAnchor: [0, -height / 2 - 2],
    tooltipAnchor: [0, -height / 2 - 2],
  });
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 MAP CLIENT                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type StateRow = { state: string; count: number; pct: number };

export default function MapClient({ rows }: { rows: StateRow[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const outlineLayerRef = useRef<L.GeoJSON | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const leaderLayerRef = useRef<L.LayerGroup | null>(null);
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((g) => {
        if (!cancelled) setGeo(g);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Mount map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((el as any)._leaflet_id != null) (el as any)._leaflet_id = null;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false,
      dragging: false,
      zoomSnap: 0.1,
    });
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(US_BOUNDS, { padding: [8, 8], animate: false });
    };
    fit();
    L.tileLayer(MAP_TILE_URL, { attribution: MAP_TILE_ATTRIB }).addTo(map);
    // Leader lines render below pins.
    const leaderLayer = L.layerGroup().addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    leaderLayerRef.current = leaderLayer;
    markerLayerRef.current = markerLayer;

    const ro = new ResizeObserver(fit);
    ro.observe(el);

    return () => {
      ro.disconnect();
      markerLayer.remove();
      leaderLayer.remove();
      outlineLayerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      leaderLayerRef.current = null;
      outlineLayerRef.current = null;
    };
  }, []);

  // Render glowing state outlines once geojson is loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geo) return;
    outlineLayerRef.current?.remove();
    const layer = L.geoJSON(geo, {
      style: () => ({
        color: OUTLINE_STROKE,
        weight: 1.4,
        opacity: 0.95,
        fillColor: OUTLINE_FILL,
        fillOpacity: 0.05,
        className: "stats-map-state-outline",
      }),
      interactive: false,
    }).addTo(map);
    outlineLayerRef.current = layer;
    ensureGlowFilter(map);
    return () => {
      layer.remove();
      outlineLayerRef.current = null;
    };
  }, [geo]);

  // Render state pins (+ leader lines for off-map small states)
  useEffect(() => {
    const markers = markerLayerRef.current;
    const leaders = leaderLayerRef.current;
    if (!markers || !leaders) return;
    markers.clearLayers();
    leaders.clearLayers();
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    for (const r of rows) {
      const code = r.state.toUpperCase();
      const centroid = STATE_CENTROIDS[code];
      if (!centroid) continue;
      const offset = STATE_PIN_OFFSETS[code];
      const pinPos = offset ?? centroid;

      if (offset) {
        L.polyline([centroid, offset], {
          color: LEADER_COLOR,
          weight: 1,
          opacity: 0.45,
          interactive: false,
        }).addTo(leaders);
        L.circleMarker(centroid, {
          radius: 2,
          color: LEADER_COLOR,
          weight: 0,
          fillColor: LEADER_COLOR,
          fillOpacity: 0.7,
          interactive: false,
        }).addTo(leaders);
      }

      const marker = L.marker(pinPos, { icon: pinIcon(r.count, max) });
      const info = `<div style="font-family:-apple-system,system-ui,sans-serif">
        <div style="font-weight:700;font-size:13px">${code}</div>
        <div style="margin-top:4px;font-size:12px"><strong>${r.count}</strong> shipment${r.count === 1 ? "" : "s"} · ${r.pct.toFixed(1)}%</div>
      </div>`;
      marker.bindTooltip(info, {
        direction: "top",
        opacity: 1,
        className: "stats-map-tooltip",
        sticky: false,
      });
      marker.bindPopup(info);
      marker.addTo(markers);
    }
  }, [rows]);

  return (
    <div className="rounded-2xl glass-surface overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Pins by state
        </h3>
        <div className="text-xs text-slate-400">
          {rows.length} states
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[560px] w-full"
        style={{ background: "#0b1220" }}
      />
      <style jsx global>{`
        .stats-map-state-outline {
          filter: url(#${FILTER_ID})
            drop-shadow(0 0 1px ${OUTLINE_GLOW})
            drop-shadow(0 0 2px ${OUTLINE_GLOW});
        }
        .stats-map-pin {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          background: #0b1220 !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95);
          color: #e2e8f0;
          border-radius: 8px;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .stats-map-tooltip {
          background: rgba(15, 23, 42, 0.95) !important;
          color: #e2e8f0 !important;
          border: 1px solid rgba(125, 211, 252, 0.25) !important;
          border-radius: 8px !important;
          padding: 6px 8px !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45) !important;
        }
        .stats-map-tooltip::before {
          border-top-color: rgba(15, 23, 42, 0.95) !important;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.7) !important;
          color: #94a3b8 !important;
        }
        .leaflet-control-attribution a {
          color: #7dd3fc !important;
        }
      `}</style>
    </div>
  );
}
