'use client';

import { useEffect, useState } from 'react';

// Placeholder for all possible badges. In a real application, this list might be fetched
// from a configuration table or a dedicated API endpoint if dynamic badge creation is allowed.
const ALL_POSSIBLE_BADGES = [
  { id: 'first_login', name: 'First Step', description: 'Logged in for the first time.', icon: '🚶‍♂️' },
  { id: 'ten_tasks_complete', name: 'Task Novice', description: 'Completed 10 tasks.', icon: '✅' },
  { id: 'first_subject_created', name: 'New Horizon', description: 'Created your first subject.', icon: '📚' },
  { id: 'seven_day_streak', name: 'Daily Habit', description: 'Maintained a 7-day study streak.', icon: '🔥' },
  { id: 'study_hour_one', name: 'Apprentice Scholar', description: 'Completed 1 hour of study.', icon: '⏳' },
  { id: 'xp_one_hundred', name: 'XP Explorer', description: 'Earned 100 XP.', icon: '✨' },
  { id: 'three_subjects', name: 'Subject Master', description: 'Created 3 subjects.', icon: '🌟' },
  { id: 'first_exam_scheduled', name: 'Exam Ready', description: 'Scheduled your first exam.', icon: '📝' },
  { id: 'twenty_tasks_complete', name: 'Task Enthusiast', description: 'Completed 20 tasks.', icon: '💪' },
  { id: 'thirty_day_streak', name: 'Streak Pro', description: 'Maintained a 30-day study streak.', icon: '🏆' },
  { id: 'insight_first', name: 'Self-Awareness Initiate', description: 'Received your first Cortex insight.', icon: '🧠' },
  { id: 'challenge_first', name: 'Challenger', description: 'Completed your first daily challenge.', icon: '🏅' },
];

const BadgeItem = ({ badge, unlockedAt }) => {
  const isUnlocked = !!unlockedAt;
  const unlockDate = unlockedAt ? new Date(unlockedAt).toLocaleDateString() : '';

  return (
    <div className={`p-4 border rounded-lg shadow-sm text-center transition-all duration-200 ${isUnlocked ? 'bg-white border-blue-200' : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'}`}>
      <div className={`text-4xl mb-2 ${!isUnlocked && 'grayscale contrast-50'}`}>
        {badge.icon}
      </div>
      <h3 className={`font-semibold text-lg ${!isUnlocked && 'text-gray-500'}`}>
        {badge.name}
      </h3>
      <p className="text-sm text-gray-600 mb-1 leading-tight">{badge.description}</p>
      {isUnlocked ? (
        <p className="text-xs text-green-600 mt-2">Unlocked: {unlockDate}</p>
      ) : (
        <p className="text-xs text-gray-500 mt-2">Locked</p>
      )}
    </div>
  );
};

export function BadgeDisplay() {
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch('/api/achievements');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error fetching achievements: ${response.statusText}`);
        }
        const data = await response.json();
        setEarnedAchievements(data.achievements);
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) return <div className="text-center py-8 text-lg text-gray-600">Loading badges...</div>;
  if (error) return <div className="text-center py-8 text-red-600 text-lg">Error loading achievements: {error}</div>;

  const displayBadges = ALL_POSSIBLE_BADGES.map(possibleBadge => {
    const earned = earnedAchievements.find(ea => ea.title === possibleBadge.id);
    return {
      ...possibleBadge,
      unlockedAt: earned ? earned.unlocked_at : null,
    };
  });

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800">Your Achievements</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {displayBadges.map(badge => (
          <BadgeItem key={badge.id} badge={badge} unlockedAt={badge.unlockedAt} />
        ))}
      </div>
      {displayBadges.length === 0 && (
        <p className="text-center text-gray-500 mt-8 text-lg">No achievements defined yet. Keep studying to unlock your first badge!</p>
      )}
    </div>
  );
}
