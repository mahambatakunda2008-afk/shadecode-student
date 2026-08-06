'use client';

import { useEffect, useState } from 'react';
import { FaAward, FaLock } from 'react-icons/fa'; // Requires 'react-icons' package
import moment from 'moment'; // Requires 'moment' package for date formatting

export default function BadgeDisplay() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const response = await fetch('/api/achievements');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBadges(data.badges);
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch badges:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchBadges();
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-300">Loading badges...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Your Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.length > 0 ? (
          badges.map((badge) => (
            <div
              key={badge.id}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-lg shadow-md min-h-[160px]
                ${badge.unlocked
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-60'
                }
                transition-all duration-300 transform hover:scale-105
              `}
            >
              {badge.unlocked ? (
                <FaAward className="text-5xl mb-2" />
              ) : (
                <FaLock className="text-5xl mb-2" />
              )}
              <h3 className="font-semibold text-lg text-center mt-2 break-words max-w-full leading-tight">
                {badge.title}
              </h3>
              {badge.unlocked && badge.unlocked_at && (
                <p className="text-sm mt-1">Unlocked: {moment(badge.unlocked_at).format('MMM DD, YYYY')}</p>
              )}
              {!badge.unlocked && (
                  <p className="text-sm mt-1">Locked</p>
              )}
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-600 dark:text-gray-300 mt-8">No badges found yet. Keep studying!</p>
        )}
      </div>
    </div>
  );
}
