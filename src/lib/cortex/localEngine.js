export function analyzePatterns(insights) {
  if (!insights || insights.length === 0) {
    return {
      status: "no_data",
      insight: "No historical data available. Cortex requires more inputs."
    };
  }

  const scores = insights.map(i => i.metadata?.score || 0);

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const errorCounts = {};
  const topicScores = {};

  for (const i of insights) {
    const { errorType, topic, score } = i.metadata || {};

    if (errorType) {
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    }

    if (topic) {
      if (!topicScores[topic]) topicScores[topic] = [];
      topicScores[topic].push(score);
    }
  }

  const mostCommonError = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const weakestTopic = Object.entries(topicScores)
    .map(([topic, scores]) => ({
      topic,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .sort((a, b) => a.avg - b.avg)[0]?.topic;

  return {
    avgScore,
    mostCommonError,
    weakestTopic,
    insight: generateLocalInsight(avgScore, mostCommonError, weakestTopic)
  };
}

function generateLocalInsight(avg, error, topic) {
  let parts = [];

  if (avg < 50) {
    parts.push("Performance is consistently low.");
  } else if (avg < 70) {
    parts.push("Partial understanding detected.");
  } else {
    parts.push("Performance is stable.");
  }

  if (error) parts.push(`Frequent issue: ${error}.`);
  if (topic) parts.push(`Weak area: ${topic}.`);

  return parts.join(" ");
}
