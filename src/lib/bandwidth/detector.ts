/**
 * /lib/bandwidth/detector.ts
 *
 * Bandwidth detection and low-bandwidth mode management
 */

export type BandwidthLevel = "high" | "medium" | "low" | "offline";

export interface BandwidthInfo {
  level: BandwidthLevel;
  effectiveType?: string; // 'slow-2g', '2g', '3g', '4g'
  saveData: boolean;
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
}

class BandwidthDetector {
  private listeners: Set<(info: BandwidthInfo) => void> = new Set();
  private currentInfo: BandwidthInfo = this.getInitialInfo();

  private getInitialInfo(): BandwidthInfo {
    if (typeof navigator === "undefined" || !("connection" in navigator)) {
      return { level: "high", saveData: false };
    }

    const connection = (navigator as any).connection;
    if (!connection) {
      return { level: "high", saveData: false };
    }

    return this.analyzeConnection(connection);
  }

  private analyzeConnection(connection: any): BandwidthInfo {
    const effectiveType = connection.effectiveType;
    const saveData = connection.saveData || false;
    const downlink = connection.downlink;
    const rtt = connection.rtt;

    let level: BandwidthLevel = "high";

    if (saveData) {
      level = "low";
    } else if (effectiveType === "slow-2g" || effectiveType === "2g") {
      level = "low";
    } else if (effectiveType === "3g") {
      level = "medium";
    } else if (downlink && downlink < 0.5) {
      level = "low";
    } else if (downlink && downlink < 2) {
      level = "medium";
    }

    return {
      level,
      effectiveType,
      saveData,
      downlink,
      rtt,
    };
  }

  getInfo(): BandwidthInfo {
    return this.currentInfo;
  }

  isLowBandwidth(): boolean {
    return this.currentInfo.level === "low" || this.currentInfo.saveData;
  }

  isOffline(): boolean {
    return typeof navigator !== "undefined" && !navigator.onLine;
  }

  subscribe(listener: (info: BandwidthInfo) => void): () => void {
    this.listeners.add(listener);

    // Listen for connection changes
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = (navigator as any).connection;
      
      const handleChange = () => {
        this.currentInfo = this.analyzeConnection(connection);
        this.listeners.forEach(l => l(this.currentInfo));
      };

      connection.addEventListener("change", handleChange);

      // Return unsubscribe function
      return () => {
        this.listeners.delete(listener);
        connection.removeEventListener("change", handleChange);
      };
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Estimate download time for a file size in MB
  estimateDownloadTime(sizeMB: number): number {
    const downlink = this.currentInfo.downlink || 10; // Default to 10 Mbps
    return (sizeMB * 8) / downlink; // Time in seconds
  }

  // Check if should use low-bandwidth mode
  shouldUseLowBandwidthMode(): boolean {
    return this.isLowBandwidth() || this.isOffline();
  }
}

export const bandwidthDetector = new BandwidthDetector();
