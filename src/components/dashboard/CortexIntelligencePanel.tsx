"use client";

import { useCortexIntelligence } from "@/hooks/useCortexIntelligence";
import {
  BrainCircuit,
  Target,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BookOpen,
  Flame,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export function CortexIntelligencePanel() {
  const { report, patterns, loading, error } = useCortexIntelligence();

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-2 text-slate-500">
          <BrainCircuit className="w-5 h-5" />
          <span className="text-sm">Learning insights will appear as you study more</span>
        </div>
      </div>
    );
  }

  const TrendIcon = patterns?.trend === "improving"
    ? TrendingUp : patterns?.trend === "declining"
    ? TrendingDown : Minus;

  const trendColor = patterns?.trend === "improving"
    ? "text-green-400" : patterns?.trend === "declining"
    ? "text-red-400" : "text-slate-400";

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-white text-sm">Cortex Intelligence</span>
        </div>
        <Sparkles className="w-4 h-4 text-amber-400" />
      </div>

      <div className="p-4 space-y-4">
        {/* Focus */}
        <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-800/30">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">
              Focus Area
            </span>
          </div>
          <p className="text-white text-sm font-medium">{report.focus}</p>
        </div>

        {/* Insight */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">
              Learning Insight
            </span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{report.learningInsight}</p>
        </div>

        {/* Recommendation */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">
              Recommended
            </span>
          </div>
          <p className="text-slate-300 text-sm">{report.recommendation}</p>
        </div>

        {/* Study Patterns */}
        {patterns && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              </div>
              <div className="text-xs text-slate-500">Trend</div>
              <div className={`text-sm font-medium capitalize ${trendColor}`}>
                {patterns.trend}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xs text-slate-500">Avg Session</div>
              <div className="text-sm font-medium text-white">
                {patterns.averageSessionMinutes}m
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-xs text-slate-500">Consistency</div>
              <div className="text-sm font-medium text-white">
                {patterns.consistencyScore}%
              </div>
            </div>
          </div>
        )}

        {/* Next Action */}
        <Link
          href={
            report.nextAction.includes("pending") ? "/tasks"
            : report.nextAction.includes("subject") ? "/subjects"
            : report.nextAction.includes("study plan") ? "/study"
            : "/dashboard"
          }
          className="flex items-center justify-between bg-indigo-600/20 hover:bg-indigo-600/30 rounded-lg p-3 border border-indigo-700/30 transition-all group"
        >
          <span className="text-sm text-indigo-300 font-medium">{report.nextAction}</span>
          <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Weak/Strong Areas */}
        {(report.weakAreas.length > 0 || report.strongAreas.length > 0) && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
            {report.weakAreas.length > 0 && (
              <div>
                <div className="text-xs text-red-400 mb-1">Needs Practice</div>
                <div className="flex flex-wrap gap-1">
                  {report.weakAreas.slice(0, 3).map((area) => (
                    <span key={area} className="text-[11px] bg-red-900/30 text-red-300 px-2 py-0.5 rounded-full border border-red-800/30">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {report.strongAreas.length > 0 && (
              <div>
                <div className="text-xs text-green-400 mb-1">Strong Areas</div>
                <div className="flex flex-wrap gap-1">
                  {report.strongAreas.slice(0, 3).map((area) => (
                    <span key={area} className="text-[11px] bg-green-900/30 text-green-300 px-2 py-0.5 rounded-full border border-green-800/30">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
