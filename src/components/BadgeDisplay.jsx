'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Define all possible badges with their metadata.
// In a production application, this list would typically be fetched from a database
// or a backend configuration service, rather than being hardcoded in the frontend.
const ALL_POSSIBLE_BADGES = [
  { id: 'first_login', name: 'First Steps', description: 'Logged in for the first time.', icon: '/badges/first_steps.png' },
  { id: 'daily_streak_3', name: '3-Day Streak', description: 'Maintained a 3-day study streak.', icon: '/badges/3_day_streak.png' },
  { id: 'first_subject', name: 'Subject Explorer', description: 'Created your first study subject.', icon: '/badges/first_subject.png' },
  { id: 'task_master', name: 'Task Master', description: 'Completed 10 tasks.', icon: '/badges/task_master.png' },
  { id: 'insight_seeker', name: 'Insight Seeker', description: 'Received your first Cortex insight.', icon: '/badges/insight_seeker.png' },
  { id: 'weekly_xp_pro', name: 'Weekly XP Pro', description: 'Earned 1000 XP in a week.', icon: '/badges/weekly_xp_pro.png' },
  { id: 'exam_ace', name: 'Exam Ace', description: 'Recorded an exam result.', icon: '/badges/exam_ace.png' },
  { id: 'early_bird', name: 'Early Bird', description: 'Studied before 8 AM.', icon: '/badges/early_bird.png' },
  { id: 'night_owl', name: 'Night Owl', description: 'Studied after 10 PM.', icon: '/badges/night_owl.png' },
  { id: 'long_session', name: 'Long Session', description: 'Studied for over 2 hours in one sitting.', icon: '/badges/long_session.png' },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Completed all daily goals for a week.', icon: '/badges/perfect_week.png'},
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Connected with 3 friends.', icon: '/badges/social_butterfly.png'},
  // Add more badges as the platform grows
];

export default function BadgeDisplay() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const response = await fetch('/api/achievements');
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('You must be logged in to view achievements.');
          }
          throw new Error(`Error fetching achievements: ${response.statusText}`);
        }
        const data = await response.json();
        setAchievements(data);
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading badges...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  // Create a Set for efficient lookup of unlocked achievement titles
  const unlockedAchievementTitles = new Set(achievements.map(a => a.title));

  return (
    <div className="p-4 bg-gray-900 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">Your Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {ALL_POSSIBLE_BADGES.map((badge) => {
          const isUnlocked = unlockedAchievementTitles.has(badge.name);
          const unlockedAchievement = achievements.find(a => a.title === badge.name);
          const unlockedAt = unlockedAchievement ? new Date(unlockedAchievement.unlocked_at).toLocaleDateString() : 'Locked';

          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-4 rounded-lg transition-all duration-200 border border-gray-700 ${
                isUnlocked ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800 opacity-50 grayscale hover:opacity-75 cursor-not-allowed'
              }`}
            >
              <div className={`w-16 h-16 relative mb-3 ${isUnlocked ? '' : 'filter grayscale'}`}>
                <Image
                  src={badge.icon || '/badges/default_badge.png'} // Fallback to a default badge icon if specific one is missing
                  alt={badge.name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover" // Ensure image covers the area and is rounded
                />
              </div>
              <h3 className={`text-md font-semibold text-center ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                {badge.name}
              </h3>
              <p className="text-xs text-center text-gray-500 mt-1">
                {unlockedAt}
              </p>
              {badge.description && (
                <p className="text-xs text-center text-gray-600 mt-2 line-clamp-2" title={badge.description}>{badge.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
