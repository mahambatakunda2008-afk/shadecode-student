"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { bandwidthDetector, BandwidthInfo } from "@/lib/bandwidth/detector";

interface BandwidthContextType {
  bandwidthInfo: BandwidthInfo;
  isLowBandwidth: boolean;
  isOffline: boolean;
  lowBandwidthMode: boolean;
  setLowBandwidthMode: (enabled: boolean) => void;
}

const BandwidthContext = createContext<BandwidthContextType | undefined>(undefined);

export function BandwidthProvider({ children }: { children: ReactNode }) {
  const [bandwidthInfo, setBandwidthInfo] = useState<BandwidthInfo>(bandwidthDetector.getInfo());
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);

  useEffect(() => {
    // Subscribe to bandwidth changes
    const unsubscribe = bandwidthDetector.subscribe((info) => {
      setBandwidthInfo(info);
    });

    // Listen to online/offline events to update bandwidth info
    const handleOnline = () => {
      setBandwidthInfo(bandwidthDetector.getInfo());
    };
    const handleOffline = () => {
      setBandwidthInfo(bandwidthDetector.getInfo());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check localStorage for saved preference
    const savedPreference = localStorage.getItem("lowBandwidthMode");
    if (savedPreference === "true") {
      setLowBandwidthMode(true);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSetLowBandwidthMode = (enabled: boolean) => {
    setLowBandwidthMode(enabled);
    localStorage.setItem("lowBandwidthMode", enabled.toString());
  };

  const isLowBandwidth = bandwidthDetector.isLowBandwidth() || lowBandwidthMode;
  const isOffline = bandwidthDetector.isOffline();

  return (
    <BandwidthContext.Provider
      value={{
        bandwidthInfo,
        isLowBandwidth,
        isOffline,
        lowBandwidthMode,
        setLowBandwidthMode: handleSetLowBandwidthMode,
      }}
    >
      {children}
    </BandwidthContext.Provider>
  );
}

export function useBandwidth() {
  const context = useContext(BandwidthContext);
  if (context === undefined) {
    throw new Error("useBandwidth must be used within a BandwidthProvider");
  }
  return context;
}
