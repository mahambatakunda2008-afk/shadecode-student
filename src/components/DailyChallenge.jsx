"use client";

import { useState, useEffect } from 'react';
import { FaTrophy, FaCheckCircle, FaSpinner } from 'react-icons/fa'; // Ensure react-icons/fa is installed (npm install react-icons)

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedSuccessfully, setCompletedSuccessfully] = useState(false);

  useEffect(() => {
    async function fetchDailyChallenge() {
      try {
        setLoading(true);
        const response = await fetch('/api/challenges/today');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch daily challenge');
        }

        if (data.challenge) {
          setChallenge(data.challenge);
          // If the challenge is already marked completed in the DB, reflect that immediately
          if (data.challenge.completed) {
            setCompletedSuccessfully(true);
          }
        } else {
          // No challenge found for today
          setChallenge(null);
        }
      } catch (err) {
        console.error("Error fetching daily challenge:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDailyChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || completedSuccessfully || isCompleting) return; // Prevent multiple clicks or completing already done challenges

    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId: challenge.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete challenge');
      }

      setCompletedSuccessfully(true);
      alert(`Challenge completed! You earned ${data.xpAwarded} XP!`);
      // Update the local challenge state to reflect completion
      setChallenge(prev => prev ? { ...prev, completed: true } : null);

    } catch (err) {
      console.error("Error completing challenge:", err);
      setError(err.message);
      setCompletedSuccessfully(false); // Reset if completion failed after attempt
    } finally {
      setIsCompleting(false);
    }
  };

  // Display loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-lg p-6 shadow-xl flex items-center justify-center min-h-[150px]">
        <FaSpinner className="animate-spin text-3xl mr-3" />
        <p className="text-lg">Loading daily challenge...</p>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="bg-red-500 text-white rounded-lg p-6 shadow-xl min-h-[150px] flex items-center justify-center">
        <p className="text-lg font-semibold">Error: {error}</p>
      </div>
    );
  }

  // Display if no challenge is found for today
  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-6 shadow-xl min-h-[150px] flex flex-col items-center justify-center text-center">
        <p className="text-xl font-bold mb-2">No Daily Challenge Today</p>
        <p className="text-sm text-gray-300">Cortex is still learning your preferences. Check back later!</p>
      </div>
    );
  }

  const isChallengeCompleted = challenge.completed || completedSuccessfully; // Check both DB state and temporary client state

  return (
    <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-lg p-6 shadow-xl flex flex-col justify-between min-h-[180px]">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center">
          <FaTrophy className="text-yellow-400 mr-2" />
          Daily Challenge: {challenge.title}
        </h2>
        <p className="text-gray-200 mb-4 text-sm">{challenge.description}</p>
      </div>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-lg font-semibold text-green-300">+{challenge.xp_reward || 0} XP</span>
        {isChallengeCompleted ? (
          <button
            className="bg-green-600 text-white px-5 py-2 rounded-full flex items-center opacity-70 cursor-not-allowed"
            disabled
          >
            <FaCheckCircle className="mr-2" /> Completed!
          </button>
        ) : (
          <button
            onClick={handleCompleteChallenge}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full flex items-center transition-colors duration-200"
            disabled={isCompleting}
          >
            {isCompleting ? (
              <>
                <FaSpinner className="animate-spin mr-2" /> Completing...
              </>
            ) : (
              'Complete'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
