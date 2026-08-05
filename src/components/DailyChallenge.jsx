'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaTrophy, FaCheckCircle, FaSpinner } from 'react-icons/fa';

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  const fetchDailyChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/challenges/today');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch daily challenge');
      }
      const data = await res.json();
      setChallenge(data);
    } catch (err) {
      console.error("Error fetching daily challenge:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || challenge.completed || completing) return;

    setCompleting(true);
    try {
      const res = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId: challenge.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to complete challenge');
      }

      // Alert for demo purposes, replace with a proper toast notification system
      alert('Challenge completed! XP Awarded.'); 
      
      // Re-fetch the challenge to update its state (e.g., mark as completed)
      await fetchDailyChallenge();
      // Refresh the current route to update any server-rendered components that display XP
      router.refresh(); 
    } catch (err) {
      console.error("Error completing challenge:", err);
      alert(`Error completing challenge: ${err.message}`); // Alert for demo
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-700 to-purple-800 p-6 rounded-lg shadow-xl text-white text-center flex items-center justify-center min-h-[180px]">
        <FaSpinner className="animate-spin text-2xl mr-2" />
        <p className="text-lg">Loading daily challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 p-6 rounded-lg shadow-xl text-white text-center min-h-[180px]">
        <p className="text-lg font-bold mb-2">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gray-700 p-6 rounded-lg shadow-xl text-white text-center min-h-[180px]">
        <p className="text-lg font-bold mb-2">No Daily Challenge</p>
        <p>Come back tomorrow for a new challenge!</p>
      </div>
    );
  }

  const isCompleted = challenge.completed;

  return (
    <div className="bg-gradient-to-br from-indigo-700 to-purple-800 p-6 rounded-lg shadow-xl text-white transform hover:scale-105 transition-transform duration-300 relative overflow-hidden">
      {isCompleted && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg z-10">
          <FaCheckCircle className="text-emerald-400 text-5xl mr-3" />
          <p className="text-emerald-400 text-2xl font-bold">Completed!</p>
        </div>
      )}
      <div className={`relative ${isCompleted ? 'filter grayscale' : ''}`}> {/* Apply grayscale when completed */}
        <div className="flex items-center mb-4">
          <FaTrophy className="text-yellow-400 text-3xl mr-3" />
          <h2 className="text-2xl font-bold">Daily Challenge</h2>
        </div>
        <h3 className="text-xl font-semibold mb-2">{challenge.title}</h3>
        <p className="text-indigo-200 mb-4">{challenge.description}</p>
        <div className="flex items-center justify-between text-lg font-medium mb-4">
          <span className="text-yellow-300">Reward: {challenge.xp_reward} XP</span>
          <span className="text-indigo-300 text-sm">{new Date(challenge.challenge_date).toDateString()}</span>
        </div>
        <button
          onClick={handleCompleteChallenge}
          disabled={isCompleted || completing}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ease-in-out
            ${isCompleted
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-lg'
            }
            ${completing ? 'opacity-70 cursor-wait' : ''}
          `}
        >
          {completing ? (
            <span className="flex items-center justify-center">
              <FaSpinner className="animate-spin mr-2" /> Completing...
            </span>
          ) : (
            isCompleted ? 'Challenge Completed!' : 'Mark as Complete'
          )}
        </button>
      </div>
    </div>
  );
}
