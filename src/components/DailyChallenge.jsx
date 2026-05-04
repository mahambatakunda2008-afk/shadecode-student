'use client';

import { useState, useEffect } from 'react';

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
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChallenge(data);
      } catch (e) {
        console.error("Failed to fetch daily challenge:", e);
        setError(`Failed to load daily challenge: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchDailyChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || challenge.completed || isCompleting) return;

    setIsCompleting(true);
    try {
      const response = await fetch('/api/challenges/today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId: challenge.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setChallenge((prev) => ({ ...prev, completed: true }));
      // Optionally, trigger a global state update or refetch to reflect XP changes
      alert(`Challenge completed! You earned ${data.xpAwarded} XP!`);
    } catch (e) {
      console.error("Failed to complete daily challenge:", e);
      setError(`Failed to complete challenge: ${e.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-800 to-purple-900 rounded-lg p-6 shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
        <p>Loading today's challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-700 rounded-lg p-6 shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-indigo-800 to-purple-900 rounded-lg p-6 shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
        <p>No challenge available today.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-800 to-purple-900 rounded-lg p-6 shadow-xl text-white border border-purple-700">
      <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
        Daily Challenge
        {challenge.completed && (
          <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Completed!
          </span>
        )}
      </h2>
      <p className="text-lg font-semibold mb-2">{challenge.title}</p>
      <p className="text-sm text-indigo-200 mb-4">{challenge.description}</p>
      <div className="flex justify-between items-center">
        <span className="text-md font-bold text-yellow-300">
          +{challenge.xp_reward} XP
        </span>
        {!challenge.completed && (
          <button
            onClick={handleCompleteChallenge}
            disabled={isCompleting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg
                       transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? 'Completing...' : 'Complete Challenge'}
          </button>
        )}
      </div>
    </div>
  );
}
