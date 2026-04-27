import { generateInsight } from './insight_generator'; // Assuming this function exists

// This function orchestrates the insight generation and storage
export async function processAndStoreInsight(userId, studentData, currentSubjectId = null) {
  try {
    // Step 1: Generate the insight using Cortex's core logic
    const insightText = await generateInsight(userId, studentData);

    if (!insightText) {
      console.warn('Cortex generated no insight for user:', userId);
      return null;
    }

    // Step 2: Store the generated insight via the API
    const response = await fetch('/api/cortex/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        insight_text: insightText,
        subject_id: currentSubjectId, // Pass subject_id if relevant to the insight
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to store insight:', errorData);
      throw new Error(`API error: ${errorData.error}`);
    }

    const storedInsight = await response.json();
    console.log('Insight stored successfully:', storedInsight.id);
    return storedInsight;

  } catch (error) {
    console.error('Error in Cortex insight processing pipeline:', error);
    // Depending on the criticality, you might want to re-throw or handle gracefully
    return null;
  }
}

// Example of a hypothetical insight_generator.js (not part of improvement, just for context)
// export async function generateInsight(userId, studentData) {
//   // ... complex logic using Gemini to analyze studentData and generate an insight string
//   return "You've consistently completed tasks related to 'Algebra' this week.";
// }
