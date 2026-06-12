"use client";

import { useBandwidth } from "@/contexts/BandwidthContext";
import { Wifi, WifiOff, Signal } from "lucide-react";

export default function LowBandwidthToggle() {
  const { bandwidthInfo, isLowBandwidth, isOffline, lowBandwidthMode, setLowBandwidthMode } = useBandwidth();

  const getBandwidthIcon = () => {
    if (isOffline) return <WifiOff size={16} />;
    if (bandwidthInfo.level === "low") return <Signal size={16} />;
    return <Wifi size={16} />;
  };

  const getBandwidthColor = () => {
    if (isOffline) return "#ef4444";
    if (bandwidthInfo.level === "low") return "#f59e0b";
    if (bandwidthInfo.level === "medium") return "#3b82f6";
    return "#22c55e";
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: getBandwidthColor(),
        }}
      >
        {getBandwidthIcon()}
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {isOffline ? "Offline" : bandwidthInfo.effectiveType || bandwidthInfo.level}
        </span>
      </div>

      <button
        onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
        style={{
          padding: "4px 8px",
          borderRadius: 6,
          background: lowBandwidthMode ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
          border: lowBandwidthMode ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.1)",
          color: lowBandwidthMode ? "#f59e0b" : "#94a3b8",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
        onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
      >
        {lowBandwidthMode ? "Low Data: ON" : "Low Data: OFF"}
      </button>
    </div>
  );
}
