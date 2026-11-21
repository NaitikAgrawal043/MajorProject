"use client";

import React, { useEffect, useRef } from "react";

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
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically import Leaflet on client side
    import("leaflet").then((L) => {
      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Shisper Glacier & Hassanabad Hunza Valley coordinates
        const map = L.map(mapContainerRef.current, {
          center: [36.36, 74.61],
          zoom: 12,
          zoomControl: true,
        });

        // Topographic / Dark tile layer
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>, Copernicus DEM, OSM',
          maxZoom: 18,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
      }

      const map = mapInstanceRef.current;
      const layerGroup = layerGroupRef.current;
      if (!map || !layerGroup) return;

      layerGroup.clearLayers();

      // 1. Render Shisper Glacier Terminus & Mochowar ice dam
      const glacierPolygon = L.polygon(
        [
          [36.435, 74.640],
          [36.425, 74.630],
          [36.395, 74.605], // Terminus damming Mochowar stream
          [36.390, 74.598],
          [36.405, 74.615],
          [36.438, 74.655],
        ],
        {
          color: "#06b6d4",
          weight: 2,
          fillColor: "#38bdf8",
          fillOpacity: 0.35,
        }
      ).bindPopup("<b>Shisper Glacier Surge Tongue</b><br>Blocks Mochowar Stream forming ice-dammed lake.");
      layerGroup.addLayer(glacierPolygon);

      // 2. Render Ice-Dammed Lake
      const lakePolygon = L.polygon(
        [
          [36.402, 74.610],
          [36.397, 74.604],
          [36.392, 74.600],
          [36.396, 74.612],
        ],
        {
          color: "#2563eb",
          weight: 2,
          fillColor: "#1d4ed8",
          fillOpacity: 0.65,
        }
      ).bindPopup(`<b>Shisper Ice-Dammed Lake</b><br>Sentinel-2 NDWI Lake Footprint on ${selectedDate}`);
      layerGroup.addLayer(lakePolygon);

      // 3. Render HAND Flood Inundation Scenario Overlay
      if (inundationData && inundationData.features) {
        const scenarioColors: Record<string, string> = {
          low: "#38bdf8",
          medium: "#f59e0b",
          high: "#ef4444",
        };
        const floodColor = scenarioColors[scenario] || "#ef4444";

        L.geoJSON(inundationData, {
          style: {
            color: floodColor,
            weight: 2,
            fillColor: floodColor,
            fillOpacity: 0.45,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            layer.bindPopup(
              `<b>${props.scenario || "Inundation Zone"}</b><br>Flooded Area: ${props.inundated_area_km2 || 0} km²`
            );
          },
        }).addTo(layerGroup);
      }

      // 4. Render Downstream OSM Infrastructure (Roads, Bridges, Settlements)
      if (exposureData && exposureData.osm_geojson) {
        L.geoJSON(exposureData.osm_geojson, {
          style: (feature) => {
            const props = feature?.properties || {};
            if (props.highway === "trunk") {
              return { color: "#facc15", weight: 3.5, opacity: 0.9 }; // KKH
            } else if (props.bridge === "yes") {
              return { color: "#dc2626", weight: 5, opacity: 1.0 }; // Bridge
            }
            return { color: "#94a3b8", weight: 1.5, opacity: 0.6 };
          },
          pointToLayer: (feature, latlng) => {
            const isSettlement = feature.properties?.place;
            return L.circleMarker(latlng, {
              radius: isSettlement ? 6 : 4,
              fillColor: isSettlement ? "#fbbf24" : "#60a5fa",
              color: "#ffffff",
              weight: 1.5,
              opacity: 1,
              fillOpacity: 0.9,
            });
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            if (p.bridge === "yes" || p.name?.includes("Bridge")) {
              layer.bindPopup(
                `<div class="p-1">
                  <b class="text-red-600 font-bold">${p.name}</b><br>
                  <span class="text-xs">Historical: Washed out 2022-05-07</span><br>
                  <span class="text-xs font-semibold text-red-500">Risk: ${p.criticality || "CRITICAL"}</span>
                </div>`
              );
            } else if (p.place) {
              layer.bindPopup(
                `<b>${p.name}</b> (${p.place})<br>Est. Population: ${p.population || "N/A"}`
              );
            } else if (p.highway) {
              layer.bindPopup(`<b>${p.name}</b><br>Classification: ${p.highway}`);
            }
          },
        }).addTo(layerGroup);
      }

      // 5. Special Marker for Hassanabad Bridge
      const hassanabadMarker = L.marker([36.312, 74.590], {
        title: "Hassanabad Bridge (N-35)",
      }).addTo(layerGroup);

      hassanabadMarker.bindPopup(
        `<div class="p-2">
          <h4 class="font-bold text-red-600">Hassanabad Bridge (N-35 KKH)</h4>
          <p class="text-xs text-gray-700 mt-1">Ground-zero structural asset destroyed during 2022-05-07 Shisper GLOF.</p>
          <div class="mt-2 text-xs bg-red-100 text-red-800 p-1 rounded font-semibold">
            Status: ${scenario === "high" ? "IMMINENT WASHOUT" : "HIGH VULNERABILITY"}
          </div>
        </div>`
      );
    });
  }, [scenario, inundationData, exposureData, selectedDate]);

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-gray-800 shadow-xl bg-gray-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 text-xs z-10 shadow-lg space-y-1.5">
        <div className="font-bold text-gray-200 border-b border-gray-700 pb-1">Geospatial Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-cyan-400 opacity-60 rounded-sm inline-block" />
          <span className="text-gray-300">Shisper Glacier Ice Dam</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block" />
          <span className="text-gray-300">Ice-Dammed Lake (NDWI)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-3 h-3 rounded-sm inline-block ${scenario === "high" ? "bg-red-500" : scenario === "medium" ? "bg-amber-500" : "bg-cyan-500"}`} />
          <span className="text-gray-300">HAND Flood Inundation ({scenario.toUpperCase()})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-1 bg-yellow-400 inline-block" />
          <span className="text-gray-300">Karakoram Highway (N-35)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block ring-2 ring-red-400" />
          <span className="text-red-400 font-semibold">Hassanabad Bridge Crossing</span>
        </div>
      </div>
    </div>
  );
}

