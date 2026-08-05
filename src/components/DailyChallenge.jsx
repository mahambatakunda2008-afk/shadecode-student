import React, { useState, useEffect } from 'react';

const DailyChallenge = () => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const response = await fetch('/api/challenges/today');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setChallenge(data.challenge);
        setIsCompleted(data.challenge?.completed || false);
      } catch (e) {
        setError(e.message);
        console.error('Failed to fetch daily challenge:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || isCompleted) return;

    try {
      const response = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challengeId: challenge.id, xpReward: challenge.xp_reward }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setIsCompleted(true);
        alert(`Challenge completed! You earned ${challenge.xp_reward} XP.`);
        // Optionally, trigger a re-fetch of user profile to update XP display elsewhere
      } else {
        alert(`Failed to complete challenge: ${data.message}`);
      }
    } catch (e) {
      console.error('Failed to complete daily challenge:', e);
      alert(`Error completing challenge: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-6 rounded-lg shadow-xl mb-6 animate-pulse">
        <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
        <p>Loading today's challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500 text-white p-6 rounded-lg shadow-xl mb-6">
        <h2 className="text-2xl font-bold mb-4">Daily Challenge Error</h2>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gray-800 text-gray-300 p-6 rounded-lg shadow-xl mb-6">
        <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
        <p>No daily challenge available today. Check back tomorrow!</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-6 rounded-lg shadow-xl mb-6">
      <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
      <p className="text-lg font-semibold mb-2">{challenge.title}</p>
      <p className="text-gray-200 mb-4">{challenge.description}</p>
      <p className="text-yellow-300 font-bold mb-4">XP Reward: {challenge.xp_reward}</p>
      <button
        onClick={handleCompleteChallenge}
        disabled={isCompleted}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-colors duration-200
          ${isCompleted
            ? 'bg-green-600 cursor-not-allowed opacity-75'
            : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75'}
        `}
      >
        {isCompleted ? 'Completed!' : 'Complete Challenge'}
      </button>
    </div>
  );
};

export default DailyChallenge;
