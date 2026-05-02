"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function InsightHistoryPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch('/api/cortex/insight');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch insights');
        }
        const data = await response.json();
        setInsights(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching insights:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  const groupInsightsByWeek = (insightsList) => {
    const grouped = {};
    insightsList.forEach(insight => {
      const date = new Date(insight.created_at);
      // Get the start of the week (Sunday)
      const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      const weekKey = startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD for the start of the week

      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(insight);
    });
    return grouped;
  };

  const groupedInsights = groupInsightsByWeek(insights);
  const sortedWeekKeys = Object.keys(groupedInsights).sort((a, b) => new Date(b) - new Date(a));

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading insights...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  if (insights.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-gray-100 mb-6">Cortex Insight History</h1>
          <p className="text-gray-400">No insights generated yet. Keep studying, and Cortex will reflect your patterns!</p>
          <Link href="/" className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-100 mb-6">Cortex Insight History</h1>

        {/* Most frequent pattern summary - placeholder for now */}
        <div className="bg-gray-700 p-4 rounded-md mb-8">
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Most Frequent Pattern (Upcoming)</h2>
          <p className="text-gray-300">
            Cortex will soon analyze your insights to identify recurring study patterns.
          </p>
        </div>

        {sortedWeekKeys.map(weekKey => (
          <div key={weekKey} className="mb-8">
            <h2 className="text-2xl font-semibold text-purple-400 mb-4 border-b border-purple-800 pb-2">
              Week of {new Date(weekKey).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="space-y-4">
              {groupedInsights[weekKey].map(insight => (
                <div key={insight.id} className="bg-gray-700 p-4 rounded-lg flex items-start space-x-4">
                  <div className="flex-shrink-0 text-purple-300 text-lg">🧠</div> {/* Icon for insight */}
                  <div>
                    <p className="text-gray-200 text-base">{insight.insight_text}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {new Date(insight.created_at).toLocaleDateString()} at {new Date(insight.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}