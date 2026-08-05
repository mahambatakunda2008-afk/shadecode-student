'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, TrophyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
      console.error('Error fetching daily challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || challenge.completed || isCompleting) return;

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
        throw new Error(errorData.error || 'Failed to complete daily challenge');
      }

      const data = await response.json();
      setChallenge(prev => ({ ...prev, completed: true }));
      alert(data.message || 'Challenge completed!');
      // Optionally, refetch profile data to show updated XP
    } catch (err) {
      console.error('Error completing daily challenge:', err);
      setError(err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 p-6 rounded-lg shadow-xl text-white animate-pulse">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <TrophyIcon className="h-7 w-7 mr-2" />
          Loading Daily Challenge...
        </h2>
        <p className="text-gray-200">Fetching your next goal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 p-6 rounded-lg shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <TrophyIcon className="h-7 w-7 mr-2" />
          Error Loading Challenge
        </h2>
        <p className="text-red-100">{error}</p>
        <button
          onClick={fetchChallenge}
          className="mt-4 px-4 py-2 bg-red-700 rounded-md hover:bg-red-800 transition-colors flex items-center"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" /> Try Again
        </button>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 p-6 rounded-lg shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <TrophyIcon className="h-7 w-7 mr-2" />
          No Daily Challenge Today
        </h2>
        <p className="text-gray-200">Perhaps come back tomorrow for a new one!</p>
      </div>
    );
  }

  const isCompleted = challenge.completed;

  return (
    <div className="bg-gradient-to-br from-purple-700 to-indigo-800 p-6 rounded-lg shadow-xl text-white">
      <h2 className="text-2xl font-bold mb-2 flex items-center">
        <TrophyIcon className="h-7 w-7 mr-2 text-yellow-400" />
        Daily Challenge
      </h2>
      <h3 className="text-xl font-semibold mb-2">{challenge.title}</h3>
      <p className="text-gray-200 mb-4">{challenge.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-medium text-green-300">
          +{challenge.xp_reward} XP
        </span>
        <button
          onClick={handleCompleteChallenge}
          disabled={isCompleted || isCompleting}
          className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200
            ${isCompleted
              ? 'bg-green-600 text-white cursor-not-allowed flex items-center'
              : 'bg-yellow-500 text-purple-900 hover:bg-yellow-400'}
            ${isCompleting && 'opacity-70 cursor-not-allowed'}
          `}
        >
          {isCompleting ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isCompleted ? (
            <>
              <CheckCircleIcon className="h-5 w-5 mr-2" /> Completed
            </>
          ) : (
            'Complete'
          )}
        </button>
      </div>
    </div>
  );
}
