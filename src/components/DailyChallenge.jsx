import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchChallenge() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/challenges/today');
        if (!res.ok) {
          throw new Error(`Failed to fetch daily challenge: ${res.statusText}`);
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        } else {
          setChallenge(data.challenge);
        }
      } catch (err) {
        console.error('Error fetching daily challenge:', err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchChallenge();
  }, []);

  const handleCompleteChallenge = async () => {
    if (!challenge || challenge.completed || isCompleting) return;

    setIsCompleting(true);
    try {
      const res = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ challenge_id: challenge.id }),
      });

      if (!res.ok) {
        throw new Error(`Failed to complete challenge: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      } else {
        setChallenge((prev) => ({ ...prev, completed: true }));
        // Optionally, show a toast or update user XP in parent context
        alert(`Challenge completed! You earned ${challenge.xp_reward} XP.`);
      }
    } catch (err) {
      console.error('Error completing challenge:', err);
      setError(err.message || 'Failed to complete challenge.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-700 to-indigo-900 p-6 rounded-lg shadow-xl text-white animate-pulse">
        <h2 className="text-2xl font-bold mb-4">Loading Daily Challenge...</h2>
        <p>Preparing your next task...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600 p-6 rounded-lg shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-6 rounded-lg shadow-xl text-white">
        <h2 className="text-2xl font-bold mb-4">No Daily Challenge Today</h2>
        <p>Check back tomorrow for a new challenge!</p>
      </div>
    );
  }

  const isCompleted = challenge.completed;

  return (
    <div className="bg-gradient-to-br from-purple-700 to-indigo-900 p-6 rounded-lg shadow-xl text-white">
      <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
      <h3 className="text-xl font-semibold mb-2">{challenge.title}</h3>
      <p className="mb-4 opacity-90">{challenge.description}</p>
      <div className="flex items-center justify-between mb-6">
        <span className="text-lg font-medium">XP Reward: <span className="font-bold text-yellow-400">{challenge.xp_reward}</span></span>
        {isCompleted ? (
          <span className="bg-green-500 text-white py-2 px-4 rounded-full text-sm font-semibold"><i className="fas fa-check-circle mr-2"></i>Completed!</span>
        ) : (
          <button
            onClick={handleCompleteChallenge}
            disabled={isCompleting}
            className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-full font-semibold transition-colors duration-200
              ${isCompleting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isCompleting ? 'Completing...' : 'Complete Challenge'}
          </button>
        )}
      </div>
      {isCompleted && (
        <p className="text-sm opacity-80 mt-2">You earned {challenge.xp_reward} XP for this challenge.</p>
      )}
    </div>
  );
}