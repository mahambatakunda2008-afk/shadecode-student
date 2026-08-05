'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, TrophyIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    async function fetchDailyChallenge() {
      try {
        const response = await fetch('/api/challenges/today');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChallenge(data);
      } catch (err) {
        setError('Failed to fetch daily challenge: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDailyChallenge();
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
        body: JSON.stringify({ challenge_id: challenge.id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Update the local state to reflect completion
      setChallenge(prev => ({ ...prev, completed: true }));
      alert(`Challenge completed! You earned ${challenge.xp_reward} XP!`);
    } catch (err) {
      setError('Failed to complete challenge: ' + err.message);
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-md text-white">
        <p>Loading daily challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 p-4 rounded-lg shadow-md text-white">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-md text-white">
        <p>No daily challenge available today.</p>
      </div>
    );
  }

  const isCompleted = challenge.completed;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md text-white flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-semibold">Daily Challenge</h2>
      </div>
      <p className="text-gray-300 text-sm italic">{new Date(challenge.challenge_date).toLocaleDateString()}</p>
      <h3 className="text-lg font-bold">{challenge.title}</h3>
      <p className="text-gray-300">{challenge.description}</p>
      <div className="flex items-center gap-2 text-green-400">
        <TrophyIcon className="h-5 w-5" />
        <span className="font-medium">{challenge.xp_reward} XP</span>
      </div>
      <button
        onClick={handleCompleteChallenge}
        disabled={isCompleted || isCompleting}
        className={`w-full py-2 px-4 rounded-md text-white font-semibold transition-colors duration-200
          ${isCompleted
            ? 'bg-green-600 cursor-not-allowed flex items-center justify-center gap-2'
            : isCompleting
              ? 'bg-blue-600 cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-700'}
        `}
      >
        {isCompleting ? (
          'Completing...'
        ) : isCompleted ? (
          <><CheckCircleIcon className="h-5 w-5" /> Completed</>
        ) : (
          'Complete Challenge'
        )}
      </button>
    </div>
  );
}
