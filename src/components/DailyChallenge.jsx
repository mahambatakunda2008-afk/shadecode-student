"use client"; // This component needs client-side interactivity

import { useState, useEffect } from 'react';

const DailyChallenge = () => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchDailyChallenge = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/challenges/today');
        if (!response.ok) {
          // Attempt to parse error message from response body
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChallenge(data);
        setIsCompleted(data.completed); // Set initial completion state from fetched data
      } catch (e) {
        setError("Failed to fetch daily challenge: " + e.message);
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyChallenge();
  }, []); // Run once on component mount

  const handleCompleteChallenge = async () => {
    if (!challenge || isCompleted) return; // Prevent completion if already done or no challenge

    setFeedback('Completing challenge...');
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
      setIsCompleted(true);
      setFeedback(`Challenge completed! You earned ${challenge.xp_reward} XP. Current total XP: ${data.newXp || 'updated.'}`);
      // In a real app, you might trigger a global XP update or re-fetch profile data here
    } catch (e) {
      setFeedback("Failed to complete challenge: " + e.message);
      console.error("Completion error:", e);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-lg p-6 text-white shadow-xl max-w-sm mx-auto animate-pulse">
        <h3 className="text-xl font-bold mb-2">Loading Daily Challenge...</h3>
        <p className="text-sm text-purple-200">Preparing today's task for you.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 rounded-lg p-6 text-white shadow-xl max-w-sm mx-auto">
        <h3 className="text-xl font-bold mb-2">Error!</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-lg p-6 text-white shadow-xl max-w-sm mx-auto">
        <h3 className="text-xl font-bold mb-2">No Daily Challenge Today</h3>
        <p className="text-sm text-purple-200">Something went wrong, or there are no challenges available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-lg p-6 text-white shadow-xl max-w-sm mx-auto">
      <h3 className="text-2xl font-bold mb-3 text-purple-100">Daily Challenge</h3>
      <p className="text-lg font-semibold mb-2">{challenge.challenge_title}</p>
      <p className="text-sm mb-4 text-purple-200">{challenge.challenge_description}</p>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">XP Reward: <span className="text-yellow-300 font-bold">{challenge.xp_reward} XP</span></span>
        {isCompleted && (
          <span className="text-green-400 font-semibold px-3 py-1 bg-green-900 bg-opacity-30 rounded-full text-xs">Completed!</span>
        )}
      </div>
      <button
        onClick={handleCompleteChallenge}
        disabled={isCompleted}
        className={`w-full py-3 rounded-md text-lg font-semibold transition-all duration-300
          ${isCompleted
            ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-70'
            : 'bg-green-500 hover:bg-green-600 text-white shadow-md'
          }`}
      >
        {isCompleted ? 'Challenge Completed' : 'Mark as Complete'}
      </button>
      {feedback && <p className="mt-4 text-center text-sm text-purple-200">{feedback}</p>}
    </div>
  );
};

export default DailyChallenge;
