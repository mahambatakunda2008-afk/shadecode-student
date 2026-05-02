"use client";

import { useState, useEffect } from 'react';

  export default function DailyChallenge({ userId }) {
  const [challenge, setChallenge] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [xpAwarded, setXpAwarded] = useState(0);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/challenges/today');
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const data = await response.json();
        setChallenge(data.challenge);
        
        // --- IMPORTANT LIMITATION NOTE ---
        // Due to schema constraints, the server cannot persistently track
        // a user's completion status for a daily challenge. We simulate
        // persistence for the current day/session using localStorage.
        // In a full system, `isCompleted` would be returned by the server.
        const today = new Date().toDateString();
        const storedCompletion = localStorage.getItem(`dailyChallenge_${data.challenge.id}_${today}`);
        setIsCompleted(!!storedCompletion);

      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch daily challenge:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || isCompleted) return;

    try {
      const response = await fetch('/api/challenges/today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID,
          challengeId: challenge.id,
          xpReward: challenge.xp_reward,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error completing challenge: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setIsCompleted(true);
        setXpAwarded(challenge.xp_reward);
        
        // Persist completion status locally for the day/session
        const today = new Date().toDateString();
        localStorage.setItem(`dailyChallenge_${challenge.id}_${today}`, 'true');
        
        // Optionally, trigger a global XP update in the app context if available.
        // For now, the visual feedback and local storage update are sufficient.
      } else {
        throw new Error('Failed to complete challenge on server.');
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to complete challenge:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-lg shadow-xl p-6 flex flex-col space-y-4 max-w-sm mx-auto animate-pulse">
        <h3 className="text-2xl font-bold">Loading Challenge...</h3>
        <p className="text-purple-200">Preparing today's task for you.</p>
        <div className="h-8 bg-purple-600 rounded w-1/2 self-end"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 text-white rounded-lg shadow-xl p-6 max-w-sm mx-auto">
        <h3 className="text-2xl font-bold">Error!</h3>
        <p className="text-red-200">{error}</p>
        <p className="text-red-200 mt-2">Could not fetch daily challenge.</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg shadow-xl p-6 max-w-sm mx-auto">
        <h3 className="text-2xl font-bold">No Daily Challenge Today</h3>
        <p className="text-gray-200">Check back tomorrow for a new task!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-lg shadow-xl p-6 flex flex-col space-y-4 max-w-sm mx-auto">
      <h3 className="text-2xl font-bold mb-2">Daily Challenge</h3>
      <h4 className="text-xl font-semibold text-purple-100">{challenge.title}</h4>
      <p className="text-purple-200 flex-grow">{challenge.description}</p>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-600">
        <span className="text-lg font-medium">XP Reward: <span className="text-yellow-300">{challenge.xp_reward}</span></span>
        {isCompleted ? (
          <button
            className="bg-green-500 text-white px-5 py-2 rounded-full font-bold opacity-70 cursor-not-allowed"
            disabled
          >
            Completed! {xpAwarded > 0 && `(+${xpAwarded} XP)`}
          </button>
        ) : (
          <button
            onClick={handleCompleteChallenge}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-purple-900 px-6 py-2 rounded-full font-bold shadow-lg transform transition duration-200 hover:scale-105"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Complete'}
          </button>
        )}
      </div>
    </div>
  );
}
