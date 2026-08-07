"use client";

import { useMemo } from 'react';
import { format, startOfWeek, isSameWeek, parseISO } from 'date-fns';

export default function InsightTimeline({ initialInsights }) {
  const groupedInsights = useMemo(() => {
    if (!initialInsights || initialInsights.length === 0) {
      return {};
    }

    const groups = {};

    // Sort insights by date descending to process chronologically for grouping (newest first for timeline display)
    const sortedInsights = [...initialInsights].sort((a, b) =>
      parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()
    );

    sortedInsights.forEach(insight => {
      const insightDate = parseISO(insight.created_at);
      // Set Monday as start of week (0 for Sunday, 1 for Monday, etc.)
      const weekStart = startOfWeek(insightDate, { weekStartsOn: 1 }); 

      const weekStartISO = weekStart.toISOString();
      if (!groups[weekStartISO]) {
        groups[weekStartISO] = [];
      }
      groups[weekStartISO].push(insight);
    });

    return groups;
  }, [initialInsights]);

  const mostFrequentPattern = useMemo(() => {
    if (!initialInsights || initialInsights.length === 0) {
      return "No repeating patterns yet.";
    }

    const canonicalizedInsights = initialInsights.map(insight =>
      insight.insight.toLowerCase().replace(/[.,!?;:"'-]/g, '').replace(/\s+/g, ' ').trim()
    );

    const insightCounts = {};
    canonicalizedInsights.forEach(text => {
      insightCounts[text] = (insightCounts[text] || 0) + 1;
    });

    let maxCount = 0;
    let mostFrequentText = "";

    for (const text in insightCounts) {
      if (insightCounts[text] > maxCount) {
        maxCount = insightCounts[text];
        mostFrequentText = text;
      }
    }

    if (maxCount > 1) {
      return `Most frequent pattern: "${mostFrequentText}" (appeared ${maxCount} times)`;
    }
    return "No repeating patterns yet.";
  }, [initialInsights]);

  // Sort weeks by date descending for display (newest week first)
  const sortedWeeks = Object.keys(groupedInsights).sort((a, b) =>
    parseISO(b).getTime() - parseISO(a).getTime() 
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
        <p className="text-gray-700 dark:text-gray-300">{mostFrequentPattern}</p>
      </div>

      <div className="space-y-8">
        {sortedWeeks.map(weekStartISO => {
          const weekStartDate = parseISO(weekStartISO);
          const insightsInWeek = groupedInsights[weekStartISO];
          return (
            <div key={weekStartISO}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 sticky top-0 bg-gray-100 dark:bg-gray-900 py-2 z-10 border-b border-gray-200 dark:border-gray-700">
                Week of {format(weekStartDate, 'MMM d, yyyy')}
              </h3>
              <div className="relative border-l border-gray-200 dark:border-gray-700 ml-4">
                {insightsInWeek.map((insight, index) => (
                  <div key={insight.id} className="mb-6 ml-8 relative">
                    {/* Date circle */} 
                    <div className="absolute -left-12 top-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-sm font-semibold shadow-md z-10">
                      {format(parseISO(insight.created_at), 'd')}
                    </div>
                    {/* Timeline dot */} 
                    <div className="absolute -left-2 top-0 w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full mt-2 -ml-1.5 border-2 border-white dark:border-gray-900 z-10"></div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 absolute -top-5 left-0">{format(parseISO(insight.created_at), 'PPP p')}</p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative top-2">
                      <p className="text-gray-800 dark:text-gray-200 text-sm">{insight.insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
