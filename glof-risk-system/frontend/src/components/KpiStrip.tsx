"use client";

import React from "react";
import { AlertTriangle, ShieldCheck, Waves, Activity, Navigation, Building2, TrendingUp, Info } from "lucide-react";

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
  // Alert visual config
  const getAlertBadge = () => {
    switch (alertLevel) {
      case "EMERGENCY":
        return {
          bg: "bg-rose-500/15 border-rose-500/40 text-rose-400",
          dot: "bg-rose-500 animate-ping",
          subDot: "bg-rose-500",
          title: "CRITICAL EMERGENCY",
          action: "Immediate Evacuation of Hassanabad Valley",
          barColor: "bg-gradient-to-r from-orange-500 to-rose-600",
        };
      case "WARNING":
        return {
          bg: "bg-amber-500/15 border-amber-500/40 text-amber-400",
          dot: "bg-amber-400 animate-pulse",
          subDot: "bg-amber-400",
          title: "OUTBURST WARNING",
          action: "Pre-deployment of rescue & road crews",
          barColor: "bg-gradient-to-r from-yellow-400 to-amber-500",
        };
      case "WATCH":
        return {
          bg: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
          dot: "bg-yellow-400",
          subDot: "bg-yellow-400",
          title: "HAZARD WATCH",
          action: "High-frequency satellite & drone surveillance",
          barColor: "bg-gradient-to-r from-emerald-400 to-yellow-400",
        };
      default:
        return {
          bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400",
          subDot: "bg-emerald-400",
          title: "NORMAL DRAINAGE",
          action: "Standard subglacial drainage • No active threat",
          barColor: "bg-emerald-500",
        };
    }
  };

  const badge = getAlertBadge();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {/* 1. GLOF Risk Probability */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            GLOF Risk Probability
          </span>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
            FusionFlow
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-black tracking-tight text-white font-mono">
              {(probability * 100).toFixed(1)}
            </span>
            <span className="text-lg font-bold text-slate-400">%</span>
          </div>
          <span className="text-xs font-medium text-slate-400">
            P(Outburst)
          </span>
        </div>

        {/* Progress track */}
        <div className="w-full bg-slate-800/80 h-2 rounded-full mt-3 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${badge.barColor}`}
            style={{ width: `${Math.min(100, Math.max(6, probability * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5">
          <span>Threshold: 0.75 Emergency</span>
          <span className="text-slate-300 font-medium">
            {probability >= 0.75 ? "Breach Imminent" : probability >= 0.50 ? "Elevated Danger" : "Stable Channel"}
          </span>
        </div>
      </div>

      {/* 2. Early Warning Status Badge */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Decision Alert Status
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
            Level 4
          </span>
        </div>

        <div className="mt-2">
          <div className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-sm font-bold tracking-wide ${badge.bg}`}>
            <span className="relative flex h-2.5 w-2.5 mr-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.subDot}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badge.subDot}`} />
            </span>
            {badge.title}
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-3 font-medium line-clamp-1">
          {badge.action}
        </p>

        <div className="flex items-center text-[11px] text-slate-500 mt-1">
          <span>Target: Hassanabad Bridge & N-35 Corridor</span>
        </div>
      </div>

      {/* 3. Ice-Dammed Lake Dynamics */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-blue-400" />
            Ice-Dammed Lake Area
          </span>
          <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50">
            Sentinel-2 NDWI
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-4xl font-black tracking-tight text-white font-mono">
              {lakeAreaKm2.toFixed(3)}
            </span>
            <span className="text-sm font-semibold text-slate-400">km²</span>
          </div>
          <span className="text-xs text-slate-400">
            ≈ {(lakeAreaKm2 * 100).toFixed(1)} ha
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 mt-3 pt-2.5 border-t border-slate-800/80">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            Rate: {lakeRateKm2Day >= 0 ? "+" : ""}{(lakeRateKm2Day * 1000).toFixed(1)} m²/d
          </span>
          <span className="text-cyan-400 font-mono font-medium">
            Vel: {velocityMDay.toFixed(2)} m/d
          </span>
        </div>
      </div>

      {/* 4. Downstream Asset Exposure */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            Downstream Inundation Impact
          </span>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
            OSM Vectors
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-4xl font-black tracking-tight text-white font-mono">
              {exposedRoadsKm.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-slate-400">km</span>
          </div>
          <span className="text-xs text-amber-300 font-medium">
            Flooded Roads
          </span>
        </div>

        <div className="flex items-center justify-between text-xs mt-3 pt-2.5 border-t border-slate-800/80">
          <span className={exposedBridges > 0 ? "text-rose-400 font-bold flex items-center gap-1" : "text-slate-400"}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {exposedBridges} Bridge Threat (Hassanabad)
          </span>
          <span className="text-slate-400">
            {exposedBuildings} Structures
          </span>
        </div>
      </div>
    </div>
  );
}
