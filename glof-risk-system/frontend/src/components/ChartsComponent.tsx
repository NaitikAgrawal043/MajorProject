"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Activity, Thermometer, CloudRain, Waves, Info, AlertTriangle } from "lucide-react";

interface ChartsComponentProps {
  timeseriesData: any[];
  selectedDate: string;
}

export default function ChartsComponent({
  timeseriesData,
  selectedDate,
}: ChartsComponentProps) {
  const [activeTab, setActiveTab] = useState<"velocity" | "lake" | "temperature" | "rain">("velocity");

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.slice(5); // MM-DD
  };

  // Find selected record metrics
  const selectedRecord = timeseriesData.find((r) => r.date === selectedDate) || timeseriesData[timeseriesData.length - 1] || {};

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl transition hover:border-slate-750">
      {/* Chart Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Multimodal Sensor Synchrony & Trajectory Analytics
            </h3>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              Synchronized 2021–2022
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            NASA ITS_LIVE (Glacier Velocity) • Sentinel-2 L2A (Lake NDWI) • Open-Meteo ERA5-Land (Temperature & Precipitation)
          </p>
        </div>

        {/* Tab Selection Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("velocity")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === "velocity"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Glacier Velocity</span>
          </button>

          <button
            onClick={() => setActiveTab("lake")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === "lake"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Waves className="w-4 h-4 text-blue-400" />
            <span>Lake Area (NDWI)</span>
          </button>

          <button
            onClick={() => setActiveTab("temperature")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === "temperature"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <Thermometer className="w-4 h-4 text-amber-400" />
            <span>Temperature & Melt</span>
          </button>

          <button
            onClick={() => setActiveTab("rain")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === "rain"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <CloudRain className="w-4 h-4 text-emerald-400" />
            <span>Precipitation</span>
          </button>
        </div>
      </div>

      {/* Stream Metric Highlight Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 rounded-xl mb-4">
        {activeTab === "velocity" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Selected Date Velocity:</span>
              <b className="text-cyan-400 font-mono text-sm">{selectedRecord.glacier_velocity_m_day || 4.32} m/day</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Surge Risk Threshold:</span>
              <b className="text-rose-400 font-mono text-sm">2.00 m/day</b>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              TerraFlow 4-Layer Transformer Pinball Quantile Envelope (q10 - q90)
            </span>
          </>
        )}

        {activeTab === "lake" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Selected Lake Area:</span>
              <b className="text-blue-400 font-mono text-sm">{selectedRecord.lake_area_km2 || 0.485} km²</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Breach Critical Volume Threshold:</span>
              <b className="text-rose-400 font-mono text-sm">0.450 km²</b>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Derived from Sentinel-2 B03, B08 (NDWI) and B11 (MNDWI)
            </span>
          </>
        )}

        {activeTab === "temperature" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Mean 2m Temp:</span>
              <b className="text-amber-400 font-mono text-sm">{selectedRecord.temp_mean_c || 14.2} °C</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Max Temp:</span>
              <b className="text-orange-400 font-mono text-sm">{selectedRecord.temp_max_c || 18.5} °C</b>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              Degree-day melt accelerates basal sliding when T &gt; 0°C
            </span>
          </>
        )}

        {activeTab === "rain" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Daily Rainfall:</span>
              <b className="text-emerald-400 font-mono text-sm">{selectedRecord.precipitation_mm || 0.0} mm</b>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">7-Day Cumulative:</span>
              <b className="text-emerald-300 font-mono text-sm">{selectedRecord.precip_7d_sum || 12.4} mm</b>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              Open-Meteo ERA5-Land Reanalysis (Precipitation Pulses)
            </span>
          </>
        )}
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[310px] w-full">
        {/* TAB 1: GLACIER VELOCITY */}
        {activeTab === "velocity" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" m/d" />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Surge Critical Threshold (2.0 m/d)", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" label={{ value: "Scrubbed Date", fill: "#f43f5e", fontSize: 11, position: "top" }} />
              <Area type="monotone" dataKey="velocity_q90" stroke="none" fill="#06b6d4" fillOpacity={0.18} name="TerraFlow Upper Surge Quantile (q90)" />
              <Line type="monotone" dataKey="glacier_velocity_m_day" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Observed Glacier Velocity (m/day)" />
              <Line type="monotone" dataKey="velocity_q10" stroke="#0e7490" strokeWidth={1.2} strokeDasharray="3 3" dot={false} name="TerraFlow Lower Quantile (q10)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* TAB 2: LAKE DYNAMICS */}
        {activeTab === "lake" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" km²" />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <ReferenceLine y={0.45} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Impoundment Breach Danger (>0.45 km²)", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" label={{ value: "Scrubbed Date", fill: "#f43f5e", fontSize: 11, position: "top" }} />
              <Area type="monotone" dataKey="lake_area_km2" stroke="#2563eb" fill="#1d4ed8" fillOpacity={0.3} strokeWidth={2.5} dot={false} name="Lake Surface Footprint (km²)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* TAB 3: TEMPERATURE & MELT */}
        {activeTab === "temperature" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" °C" />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: "0°C Freezing Isotherm", fill: "#94a3b8", fontSize: 10 }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" label={{ value: "Scrubbed Date", fill: "#f43f5e", fontSize: 11, position: "top" }} />
              <Line type="monotone" dataKey="temp_max_c" stroke="#f97316" strokeWidth={2.2} dot={false} name="Daily Max Temp (°C)" />
              <Line type="monotone" dataKey="temp_mean_c" stroke="#fbbf24" strokeWidth={1.8} dot={false} name="Daily Mean Temp (°C)" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* TAB 4: PRECIPITATION */}
        {activeTab === "rain" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" mm" />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" label={{ value: "Scrubbed Date", fill: "#f43f5e", fontSize: 11, position: "top" }} />
              <Bar dataKey="precipitation_mm" fill="#10b981" radius={[4, 4, 0, 0]} name="Daily Precipitation (mm)" />
              <Line type="monotone" dataKey="precip_7d_sum" stroke="#34d399" strokeWidth={2.5} dot={false} name="7-Day Cumulative Rainfall (mm)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
