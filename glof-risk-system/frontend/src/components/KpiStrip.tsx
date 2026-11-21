"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Waves, Activity, Navigation, Building2 } from "lucide-react";

interface KpiStripProps {
  probability: number;
  alertLevel: string;
  lakeAreaKm2: number;
  lakeRateKm2Day: number;
  velocityMDay: number;
  exposedRoadsKm: number;
  exposedBridges: number;
  exposedBuildings: number;
}

export default function KpiStrip({
  probability,
  alertLevel,
  lakeAreaKm2,
  lakeRateKm2Day,
  velocityMDay,
  exposedRoadsKm,
  exposedBridges,
  exposedBuildings,
}: KpiStripProps) {
  // Alert color coding
  const getAlertBadge = () => {
    switch (alertLevel) {
      case "EMERGENCY":
        return {
          bg: "bg-red-500/20 border-red-500/50 text-red-400",
          dot: "bg-red-500 animate-ping",
          label: "CRITICAL EMERGENCY",
        };
      case "WARNING":
        return {
          bg: "bg-orange-500/20 border-orange-500/50 text-orange-400",
          dot: "bg-orange-500",
          label: "OUTBURST WARNING",
        };
      case "WATCH":
        return {
          bg: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
          dot: "bg-yellow-400",
          label: "HAZARD WATCH",
        };
      default:
        return {
          bg: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
          dot: "bg-emerald-400",
          label: "NORMAL DRAINAGE",
        };
    }
  };

  const badge = getAlertBadge();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. GLOF Risk Probability */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-lg hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span>Multimodal GLOF Probability</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-extrabold text-white">
            {(probability * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">P(Outburst)</span>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              probability >= 0.75
                ? "bg-red-500"
                : probability >= 0.5
                ? "bg-orange-500"
                : probability >= 0.25
                ? "bg-yellow-400"
                : "bg-emerald-400"
            }`}
            style={{ width: `${Math.min(100, Math.max(5, probability * 100))}%` }}
          />
        </div>
      </div>

      {/* 2. Alert Status Badge */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-lg hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span>Early Warning Status</span>
          <AlertTriangle className="w-4 h-4 text-orange-400" />
        </div>
        <div className="mt-1">
          <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-bold ${badge.bg}`}>
            <span className={`w-2.5 h-2.5 rounded-full mr-2 ${badge.dot}`} />
            {badge.label}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Hunza River Basin • Shisper Terminus
        </p>
      </div>

      {/* 3. Active Lake Dynamics */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-lg hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span>Ice-Dammed Lake Area</span>
          <Waves className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white">
            {lakeAreaKm2.toFixed(3)}
          </span>
          <span className="text-xs text-gray-400">km²</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-1 border-t border-gray-800">
          <span>Expansion: {lakeRateKm2Day >= 0 ? "+" : ""}{(lakeRateKm2Day * 1000).toFixed(1)} m²/d</span>
          <span className="text-cyan-400">Vel: {velocityMDay.toFixed(2)} m/d</span>
        </div>
      </div>

      {/* 4. Downstream Exposed Infrastructure */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-lg hover:border-gray-700 transition">
        <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span>Downstream Inundation Exposure</span>
          <Building2 className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline space-x-3">
          <span className="text-3xl font-extrabold text-white">
            {exposedRoadsKm.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">km roads inundated</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-1 border-t border-gray-800">
          <span className={exposedBridges > 0 ? "text-red-400 font-semibold" : "text-gray-400"}>
            {exposedBridges} Bridge{exposedBridges === 1 ? "" : "s"} (Hassanabad)
          </span>
          <span>{exposedBuildings} Bldgs</span>
        </div>
      </div>
    </div>
  );
}

