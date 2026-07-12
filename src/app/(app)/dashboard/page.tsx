"use client";

import NextActionDashboard from "@/components/dashboard/NextActionDashboard";
import { CortexIntelligencePanel } from "@/components/dashboard/CortexIntelligencePanel";

export default function Dashboard() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-1 min-w-0">
        <NextActionDashboard />
      </div>
      <div className="w-full lg:w-80 shrink-0">
        <div className="lg:sticky lg:top-4">
          <CortexIntelligencePanel />
        </div>
      </div>
    </div>
  );
}
