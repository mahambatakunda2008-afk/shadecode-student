import { progressService as remoteProgressService } from "./services/progress";
import { performanceService as remotePerformanceService } from "./services/performance";
import { activityService as remoteActivityService } from "./services/activity";
import { intelligenceEngine as remoteIntelligenceEngine } from "./services/intelligence";
import { loadDashboardCache, saveDashboardCache } from "@/lib/offline/dashboardCache";

/**
 * Device-first service facades. A valid local dashboard slice wins the first
 * read so the UI never waits on the network. A remote refresh is kicked off
 * in the background and persisted for the next render.
 */
function isBrowser() { return typeof window !== "undefined"; }
function isOnline() { return typeof navigator === "undefined" || navigator.onLine; }

export const progressService = {
  ...remoteProgressService,
  async getProgress(userId: string) {
    const cached = isBrowser() ? loadDashboardCache<any>(userId, "core") : null;
    if (cached?.data?.progress) {
      if (isOnline()) void remoteProgressService.getProgress(userId).then((result) => {
        if (result.success && result.data) saveDashboardCache(userId, "core", { ...cached.data, progress: result.data });
      }).catch(() => undefined);
      return { success: true as const, data: cached.data.progress, source: "local" as const };
    }
    return remoteProgressService.getProgress(userId);
  },
};

export const performanceService = {
  ...remotePerformanceService,
  async getPerformance(userId: string) {
    const cached = isBrowser() ? loadDashboardCache<any>(userId, "core") : null;
    if (cached?.data?.performance) {
      if (isOnline()) void remotePerformanceService.getPerformance(userId).then((result) => {
        if (result.success && result.data) saveDashboardCache(userId, "core", { ...cached.data, performance: result.data });
      }).catch(() => undefined);
      return { success: true as const, data: cached.data.performance, source: "local" as const };
    }
    return remotePerformanceService.getPerformance(userId);
  },
};

export const activityService = {
  ...remoteActivityService,
  async getActivity(userId: string) {
    const cached = isBrowser() ? loadDashboardCache<any>(userId, "core") : null;
    if (cached?.data?.activity) {
      if (isOnline()) void remoteActivityService.getActivity(userId).then((result) => {
        if (result.success && result.data) saveDashboardCache(userId, "core", { ...cached.data, activity: result.data });
      }).catch(() => undefined);
      return { success: true as const, data: cached.data.activity, source: "local" as const };
    }
    return remoteActivityService.getActivity(userId);
  },
};

export const intelligenceEngine = {
  ...remoteIntelligenceEngine,
  async getIntelligence(userId: string) {
    const cached = isBrowser() ? loadDashboardCache<any>(userId, "intel") : null;
    if (cached?.data) {
      if (isOnline()) void remoteIntelligenceEngine.getIntelligence(userId).then((result) => {
        if (result.success && result.data) saveDashboardCache(userId, "intel", result.data);
      }).catch(() => undefined);
      return { success: true as const, data: cached.data, source: "local" as const };
    }
    return remoteIntelligenceEngine.getIntelligence(userId);
  },
};
