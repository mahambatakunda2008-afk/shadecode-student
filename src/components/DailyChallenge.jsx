'use client';

import { useState, useEffect } from 'react';

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const fetchChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/challenges/today');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch daily challenge');
      }
      const data = await response.json();
      setChallenge(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching daily challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || challenge.completed) return;

    setIsCompleting(true);
    try {
      const response = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId: challenge.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete challenge');
      }

      // Refetch the challenge to update its status
      await fetchChallenge();

    } catch (err) {
      setError(err.message);
      console.error('Error completing daily challenge:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg animate-pulse">
        <h3 className="text-xl font-semibold text-gray-300 mb-2">Loading Daily Challenge...</h3>
        <p className="text-gray-400">Preparing your task for today.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 bg-opacity-30 border border-red-700 rounded-lg p-6 shadow-lg text-red-300">
        <h3 className="text-xl font-semibold mb-2">Error loading challenge</h3>
        <p>{error}</p>
        <button
          onClick={fetchChallenge}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Daily Challenge Today</h3>
        <p className="text-gray-400">Check back tomorrow for a new challenge!</p>
      </div>
    );
  }

  const isCompleted = challenge.completed;

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
      <h3 className="text-2xl font-bold text-indigo-400 mb-3">Daily Challenge</h3>
      <p className="text-lg text-gray-200 mb-2">{challenge.title}</p>
      <p className="text-gray-400 mb-4">{challenge.description}</p>
      <div className="flex items-center justify-between mt-4">
        <span className="text-yellow-400 text-xl font-semibold">+{challenge.xp_reward} XP</span>
        <button
          onClick={handleCompleteChallenge}
          disabled={isCompleted || isCompleting}
          className={`px-6 py-3 rounded-md font-semibold text-white transition-all duration-200
            ${isCompleted
              ? 'bg-green-600 cursor-not-allowed opacity-75'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900'}
            ${isCompleting ? 'animate-pulse' : ''}
          `}
        >
          {isCompleting ? 'Completing...' : (isCompleted ? 'Completed!' : 'Complete Challenge')}
        </button>
      </div>
      {isCompleted && <p className="text-green-400 text-sm mt-2 text-right">Challenge finished today!</p>}
    </div>
  );
}
