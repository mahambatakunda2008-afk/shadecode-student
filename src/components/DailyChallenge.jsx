"use client"; // This component needs client-side interactivity

import { useState, useEffect } from 'react';

export function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  useEffect(() => {
    async function fetchDailyChallenge() {
      try {
        setLoading(true);
        const response = await fetch('/api/challenges/today');
        if (!response.ok) {
          throw new Error('Failed to fetch daily challenge');
        }
        const data = await response.json();
        setChallenge(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDailyChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || challenge.completed || isCompleting) return;

    setIsCompleting(true);
    setCompletionMessage('');

    try {
      const response = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challenge_id: challenge.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete challenge');
      }

      const data = await response.json();
      setChallenge((prev) => ({ ...prev, completed: true }));
      setCompletionMessage(`Challenge completed! You earned ${data.xp_awarded} XP!`);
      // Optionally re-fetch user profile to show updated XP in UI if it's displayed elsewhere
    } catch (err) {
      setError(err.message);
      setCompletionMessage(`Error: ${err.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-purple-800 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto animate-pulse">
        <h3 className="text-xl font-bold mb-2 h-6 bg-indigo-700 rounded w-3/4"></h3>
        <p className="text-sm text-indigo-200 mb-4 h-4 bg-indigo-700 rounded w-full"></p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-lg font-semibold h-5 bg-indigo-700 rounded w-1/4"></span>
          <div className="h-10 w-24 bg-indigo-700 rounded-md"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500 text-white p-4 rounded-lg shadow-md max-w-sm mx-auto">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-purple-800 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto">
        <h3 className="text-xl font-bold mb-2">No Daily Challenge Today</h3>
        <p className="text-sm text-indigo-200">
          Looks like there isn't a challenge available right now. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-purple-800 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto">
      <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
      <p className="text-sm text-indigo-200 mb-4">{challenge.description}</p>

      {completionMessage && (
        <p className="text-green-300 text-sm mb-3">{completionMessage}</p>
      )}

      <div className="flex justify-between items-center mt-4">
        <span className="text-lg font-semibold text-yellow-300">
          {challenge.completed ? 'Completed!' : `${challenge.xp_reward} XP`}
        </span>
        {!challenge.completed && (
          <button
            onClick={handleCompleteChallenge}
            disabled={isCompleting}
            className={`px-4 py-2 rounded-md font-semibold
              ${isCompleting
                ? 'bg-indigo-600 text-indigo-300 cursor-not-allowed'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white transition duration-200'
              }`}
          >
            {isCompleting ? 'Completing...' : 'Complete'}
          </button>
        )}
      </div>
    </div>
  );
}
