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
import { Activity, Thermometer, CloudRain, Waves } from "lucide-react";

interface ChartsComponentProps {
  timeseriesData: any[];
  selectedDate: string;
}

export default function ChartsComponent({
  timeseriesData,
  selectedDate,
}: ChartsComponentProps) {
  const [activeTab, setActiveTab] = useState<"velocity" | "temperature" | "rain" | "lake">("velocity");

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.slice(5); // MM-DD
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Multimodal Synchronized Sensor Streams
          </h3>
          <p className="text-xs text-gray-400">
            Shisper Glacier • NASA ITS_LIVE, Open-Meteo ERA5, Sentinel-2 Optical
          </p>
        </div>

        {/* Stream Toggle Tabs */}
        <div className="flex items-center space-x-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
          <button
            onClick={() => setActiveTab("velocity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "velocity"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Glacier Velocity</span>
          </button>
          <button
            onClick={() => setActiveTab("lake")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "lake"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Lake Area</span>
          </button>
          <button
            onClick={() => setActiveTab("temperature")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "temperature"
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Temperature</span>
          </button>
          <button
            onClick={() => setActiveTab("rain")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeTab === "rain"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Precipitation</span>
          </button>
        </div>
      </div>

      <div className="h-[280px] w-full">
        {/* TAB 1: GLACIER VELOCITY */}
        {activeTab === "velocity" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit=" m/d" />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: "Selected", fill: "#f43f5e", fontSize: 11 }} />
              <Area type="monotone" dataKey="velocity_q90" stroke="none" fill="#06b6d4" fillOpacity={0.15} name="TerraFlow q90 Upper Surge" />
              <Line type="monotone" dataKey="glacier_velocity_m_day" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Velocity (m/day)" />
              <Line type="monotone" dataKey="velocity_q10" stroke="#0891b2" strokeWidth={1} strokeDasharray="3 3" dot={false} name="TerraFlow q10 Lower" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* TAB 2: LAKE DYNAMICS */}
        {activeTab === "lake" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit=" km²" />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="lake_area_km2" stroke="#3b82f6" fill="#1d4ed8" fillOpacity={0.25} strokeWidth={2.5} dot={false} name="Lake Area (km²)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* TAB 3: TEMPERATURE */}
        {activeTab === "temperature" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit=" °C" />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "0°C Freezing Level", fill: "#94a3b8", fontSize: 10 }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="temp_max_c" stroke="#f97316" strokeWidth={2} dot={false} name="Max Temp (°C)" />
              <Line type="monotone" dataKey="temp_mean_c" stroke="#fbbf24" strokeWidth={1.5} dot={false} name="Mean Temp (°C)" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* TAB 4: PRECIPITATION */}
        {activeTab === "rain" && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit=" mm" />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <ReferenceLine x={selectedDate} stroke="#f43f5e" strokeDasharray="4 4" />
              <Bar dataKey="precipitation_mm" fill="#10b981" name="Daily Precip (mm)" />
              <Line type="monotone" dataKey="precip_7d_sum" stroke="#34d399" strokeWidth={2} dot={false} name="7-Day Cumulative (mm)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

