"use client";

import { useState, useEffect } from 'react';
import { FaCheckCircle, FaAward } from 'react-icons/fa'; // Assuming react-icons is installed

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
          throw new Error(errorData.error || 'Failed to fetch daily challenge');
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
    try {
      const response = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: challenge.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete challenge');
      }

      // Update the local state to reflect completion
      setChallenge((prev) => ({ ...prev, completed: true }));
      // Optionally, show a toast or re-fetch user profile to show updated XP
      alert('Challenge completed! XP awarded.');

    } catch (err) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto animate-pulse border border-purple-700">
        <h2 className="text-xl font-bold mb-3">Daily Challenge</h2>
        <p>Loading today's challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto border border-red-500">
        <h2 className="text-xl font-bold mb-3">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto border border-purple-700">
        <h2 className="text-xl font-bold mb-3">Daily Challenge</h2>
        <p>No challenge found for today. Check back later!</p>
      </div>
    );
  }

  const isCompleted = challenge.completed;

  return (
    <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-6 rounded-lg shadow-lg max-w-sm mx-auto border border-purple-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-indigo-200">Daily Challenge</h2>
        {isCompleted && (
          <span className="text-green-400 flex items-center gap-1">
            <FaCheckCircle className="text-lg" /> Completed!
          </span>
        )}
      </div>
      <h3 className="text-2xl font-semibold mb-2">{challenge.title}</h3>
      <p className="text-gray-300 mb-4">{challenge.description}</p>
      <div className="flex items-center justify-between mt-4 border-t border-purple-700 pt-4">
        <span className="text-lg font-medium text-yellow-400 flex items-center gap-1">
          <FaAward className="text-lg" /> {challenge.xp_reward} XP
        </span>
        <button
          onClick={handleCompleteChallenge}
          disabled={isCompleted || isCompleting}
          className={`py-2 px-5 rounded-lg font-bold transition-all duration-200 ${ 
            isCompleted
              ? 'bg-green-600 text-white cursor-not-allowed opacity-70'
              : isCompleting
              ? 'bg-blue-700 text-white cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
          }`}
        >
          {isCompleted ? 'Challenge Done' : isCompleting ? 'Completing...' : 'Complete Challenge'}
        </button>
      </div>
    </div>
  );
}
