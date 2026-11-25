"use client";

import React, { useEffect, useRef, useState } from "react";
import { Layers, Eye, EyeOff, MapPin, AlertCircle, Navigation } from "lucide-react";

interface MapComponentProps {
  scenario: string; // 'low', 'medium', 'high'
  inundationData: any;
  exposureData: any;
  selectedDate: string;
}

export default function MapComponent({
  scenario,
  inundationData,
  exposureData,
  selectedDate,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<{
    glacierLayer?: any;
    lakeLayer?: any;
    floodLayer?: any;
    osmLayer?: any;
    bridgeMarker?: any;
  }>({});

  // Layer visibility toggles
  const [showFlood, setShowFlood] = useState(true);
  const [showGlacier, setShowGlacier] = useState(true);
  const [showOsmAssets, setShowOsmAssets] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    import("leaflet").then((L) => {
      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Shisper Glacier & Hassanabad Hunza Valley coordinates
        const map = L.map(mapContainerRef.current, {
          center: [36.365, 74.615],
          zoom: 12,
          zoomControl: false,
        });

        // Add Zoom Control to top right
        L.control.zoom({ position: "topright" }).addTo(map);

        // Dark / Topographic Voyager Carto Tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>, Copernicus GLO-30 DEM, OpenStreetMap',
          maxZoom: 18,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapLoaded(true);
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // 1. Render Glacier Surge Tongue
      if (layersRef.current.glacierLayer) {
        map.removeLayer(layersRef.current.glacierLayer);
      }
      if (showGlacier) {
        const glacier = L.polygon(
          [
            [36.438, 74.645],
            [36.425, 74.632],
            [36.398, 74.608], // Terminus blocking Mochowar valley
            [36.392, 74.598],
            [36.406, 74.618],
            [36.442, 74.660],
          ],
          {
            color: "#0891b2",
            weight: 2.5,
            fillColor: "#06b6d4",
            fillOpacity: 0.35,
            dashArray: "4, 4",
          }
        ).bindPopup(
          `<div class="p-2 font-sans">
            <h4 class="font-bold text-cyan-800 text-sm">Shisper Glacier Surge Tongue</h4>
            <p class="text-xs text-gray-700 mt-1">Surge-type Karakoram glacier tongue damming the Mochowar stream.</p>
            <div class="mt-2 text-[11px] bg-cyan-50 border border-cyan-200 text-cyan-800 p-1.5 rounded font-mono">
              Elevation: 3,200m - 5,400m<br/>
              Velocity Surge Point: 36.41°N, 74.61°E
            </div>
          </div>`
        );
        glacier.addTo(map);
        layersRef.current.glacierLayer = glacier;
      }

      // 2. Render Lake Outline
      if (layersRef.current.lakeLayer) {
        map.removeLayer(layersRef.current.lakeLayer);
      }
      if (showGlacier) {
        const lake = L.polygon(
          [
            [36.404, 74.612],
            [36.398, 74.605],
            [36.391, 74.601],
            [36.397, 74.614],
          ],
          {
            color: "#1d4ed8",
            weight: 2,
            fillColor: "#2563eb",
            fillOpacity: 0.70,
          }
        ).bindPopup(
          `<div class="p-2 font-sans">
            <h4 class="font-bold text-blue-900 text-sm">Ice-Dammed Supraglacial Lake</h4>
            <p class="text-xs text-gray-700 mt-1">Impounded meltwater lake observed via Sentinel-2 NDWI on <b>${selectedDate}</b>.</p>
            <div class="mt-2 text-[11px] bg-blue-50 border border-blue-200 text-blue-800 p-1.5 rounded font-mono">
              Volume: ~15-20 Million m³ at peak<br/>
              Threshold: Impoundment Failure at 0.50 km²
            </div>
          </div>`
        );
        lake.addTo(map);
        layersRef.current.lakeLayer = lake;
      }

      // 3. Render HAND Inundation Zone
      if (layersRef.current.floodLayer) {
        map.removeLayer(layersRef.current.floodLayer);
      }
      if (showFlood && inundationData && inundationData.features) {
        const floodColor =
          scenario === "high" ? "#e11d48" : scenario === "medium" ? "#d97706" : "#0284c7";
        const floodOpacity = scenario === "high" ? 0.50 : 0.40;

        const floodLayer = L.geoJSON(inundationData, {
          style: {
            color: floodColor,
            weight: 2,
            fillColor: floodColor,
            fillOpacity: floodOpacity,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(
              `<div class="p-2 font-sans">
                <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  Hydrodynamic Flood Zone
                </span>
                <h4 class="font-bold text-gray-900 text-sm mt-1">${props.scenario || "Inundation Scenario"}</h4>
                <p class="text-xs text-gray-600 mt-1">HAND-derived DEM routing downstream along Hunza River.</p>
                <div class="mt-2 text-xs bg-gray-50 border border-gray-200 text-gray-800 p-1.5 rounded font-mono">
                  Inundated Area: <b>${props.inundated_area_km2 || 0} km²</b><br/>
                  HAND Depth Threshold: <b>${props.threshold_m || 0}m</b>
                </div>
              </div>`
            );
          },
        }).addTo(map);
        layersRef.current.floodLayer = floodLayer;
      }

      // 4. Render Downstream OSM Infrastructure
      if (layersRef.current.osmLayer) {
        map.removeLayer(layersRef.current.osmLayer);
      }
      if (showOsmAssets && exposureData && exposureData.osm_geojson) {
        const osmLayer = L.geoJSON(exposureData.osm_geojson, {
          style: (feature) => {
            const props = feature?.properties || {};
            if (props.highway === "trunk") {
              return { color: "#eab308", weight: 4, opacity: 0.95 }; // KKH
            } else if (props.bridge === "yes") {
              return { color: "#dc2626", weight: 6, opacity: 1.0 }; // Bridge
            }
            return { color: "#64748b", weight: 2, opacity: 0.7 };
          },
          pointToLayer: (feature, latlng) => {
            const isSettlement = feature.properties?.place;
            return L.circleMarker(latlng, {
              radius: isSettlement ? 7 : 4,
              fillColor: isSettlement ? "#f59e0b" : "#38bdf8",
              color: "#ffffff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.95,
            });
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            if (p.bridge === "yes" || p.name?.includes("Bridge")) {
              layer.bindPopup(
                `<div class="p-2 font-sans">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Critical Infrastructure</span>
                  <h4 class="font-extrabold text-rose-700 text-sm mt-1">${p.name}</h4>
                  <p class="text-xs text-gray-700 mt-1">Carries the N-35 Karakoram Highway over Hassanabad Nullah.</p>
                  <div class="mt-2 text-xs bg-rose-50 border border-rose-300 text-rose-900 p-2 rounded">
                    <b>Historical Impact:</b> Washed out on May 7, 2022.<br/>
                    <b>Current Status:</b> ${scenario === "high" ? "IMMINENT WASHOUT" : "HIGH VULNERABILITY"}
                  </div>
                </div>`
              );
            } else if (p.place) {
              layer.bindPopup(
                `<div class="p-2 font-sans">
                  <h4 class="font-bold text-gray-900 text-sm">${p.name}</h4>
                  <span class="text-xs text-gray-500">Classification: ${p.place}</span>
                  <div class="mt-1 text-xs text-gray-800">
                    Est. Population: <b>${p.population || "N/A"}</b>
                  </div>
                </div>`
              );
            } else if (p.highway) {
              layer.bindPopup(
                `<div class="p-2 font-sans">
                  <h4 class="font-bold text-gray-900 text-xs">${p.name}</h4>
                  <span class="text-xs text-amber-600 font-semibold">Corridor: ${p.highway} (N-35)</span>
                </div>`
              );
            }
          },
        }).addTo(map);
        layersRef.current.osmLayer = osmLayer;
      }

      // 5. Special Hassanabad Bridge Marker with Visual Flag
      if (layersRef.current.bridgeMarker) {
        map.removeLayer(layersRef.current.bridgeMarker);
      }
      if (showOsmAssets) {
        const bridgeMarker = L.marker([36.312, 74.590], {
          title: "Hassanabad Bridge (N-35 KKH)",
        }).addTo(map);

        bridgeMarker.bindPopup(
          `<div class="p-2 font-sans">
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Strategic Asset #1</span>
            <h4 class="font-extrabold text-rose-700 text-sm mt-1">Hassanabad Bridge (N-35 KKH)</h4>
            <p class="text-xs text-gray-700 mt-1">Ground-zero collapse point in May 2022 GLOF.</p>
            <div class="mt-2 text-xs bg-rose-50 border border-rose-300 text-rose-900 p-2 rounded font-semibold">
              Risk Level: ${scenario === "high" ? "IMMINENT COLLAPSE (10m Surge)" : "MODERATE THREAT (2-5m Surge)"}
            </div>
          </div>`
        );
        layersRef.current.bridgeMarker = bridgeMarker;
      }
    });
  }, [scenario, inundationData, exposureData, selectedDate, showFlood, showGlacier, showOsmAssets]);

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Layer Controls (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
        <button
          onClick={() => setShowFlood(!showFlood)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            showFlood
              ? "bg-slate-900/90 border-cyan-500/50 text-cyan-400"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          {showFlood ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Inundation Zone ({scenario.toUpperCase()})</span>
        </button>

        <button
          onClick={() => setShowGlacier(!showGlacier)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            showGlacier
              ? "bg-slate-900/90 border-blue-500/50 text-blue-400"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          {showGlacier ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Shisper Glacier & Lake</span>
        </button>

        <button
          onClick={() => setShowOsmAssets(!showOsmAssets)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-lg ${
            showOsmAssets
              ? "bg-slate-900/90 border-amber-500/50 text-amber-400"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          {showOsmAssets ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>KKH Roads & Bridges</span>
        </button>
      </div>

      {/* Floating Modern Legend Overlay (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 text-xs shadow-2xl space-y-2 min-w-[220px]">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Layers className="w-3.5 h-3.5" />
            Topographic Layers
          </span>
          <span className="text-[10px] text-slate-400 font-mono">EPSG:4326</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="w-3.5 h-3 bg-cyan-400/50 border border-cyan-400 rounded-sm inline-block" />
          <span className="text-slate-300">Shisper Glacier Tongue</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="w-3.5 h-3 bg-blue-600 border border-blue-400 rounded-sm inline-block" />
          <span className="text-slate-300">Ice-Dammed Lake (Sentinel-2)</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <span
            className={`w-3.5 h-3 rounded-sm inline-block border ${
              scenario === "high"
                ? "bg-rose-500/60 border-rose-400"
                : scenario === "medium"
                ? "bg-amber-500/60 border-amber-400"
                : "bg-sky-500/60 border-sky-400"
            }`}
          />
          <span className="text-slate-300">HAND Flood Inundation ({scenario.toUpperCase()})</span>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="w-4 h-1 bg-yellow-400 rounded-full inline-block" />
          <span className="text-slate-300">Karakoram Highway (N-35)</span>
        </div>

        <div className="flex items-center space-x-2.5 pt-1 border-t border-slate-800/80">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600 border border-white" />
          </span>
          <span className="text-rose-400 font-bold">Hassanabad Bridge (Collapse Zone)</span>
        </div>
      </div>

      {/* Coordinate & Elevation Badge (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 font-mono shadow-md">
        <Navigation className="w-3 h-3 text-cyan-400" />
        <span>Hunza Valley Center: 36.365°N, 74.615°E • Elev: 2,100m - 5,400m</span>
      </div>
    </div>
  );
}
