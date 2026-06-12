/**
 * /lib/exams/indigenous/cortex.ts
 *
 * Cortex integration for indigenous language exam feedback
 */

import { IndigenousLanguage, IndigenousExamQuestion, IndigenousExamAnswer, IndigenousExamFeedback } from "./types";
import { getMemory } from "@/lib/cortex/memory";

interface CortexExamFeedbackRequest {
  userId: string;
  language: IndigenousLanguage;
  question: IndigenousExamQuestion;
  answer: IndigenousExamAnswer;
  studentLevel?: "beginner" | "intermediate" | "advanced";
}

interface CortexExamFeedbackResponse {
  feedback: string;
  feedbackInLanguage: string;
  suggestions: string[];
  suggestionsInLanguage: string[];
}

export async function getCortexFeedback(
  request: CortexExamFeedbackRequest
): Promise<CortexExamFeedbackResponse> {
  const { userId, language, question, answer, studentLevel = "intermediate" } = request;

  // Get student's learning memory for personalization
  const memory = await getMemory(userId);
  const weakTopics = memory.weakTopics || [];
  const strongTopics = memory.subjects || [];

  // Check if this is a weak area for the student
  const isWeakArea = weakTopics.some(t => t.toLowerCase().includes(language));

  // Generate feedback based on question type and language
  const feedback = generateFeedback(question, answer, language, studentLevel, isWeakArea);
  const feedbackInLanguage = generateFeedbackInLanguage(question, answer, language, studentLevel, isWeakArea);
  const suggestions = generateSuggestions(question, answer, language, studentLevel);
  const suggestionsInLanguage = generateSuggestionsInLanguage(question, answer, language, studentLevel);

  return {
    feedback,
    feedbackInLanguage,
    suggestions,
    suggestionsInLanguage,
  };
}

function generateFeedback(
  question: IndigenousExamQuestion,
  answer: IndigenousExamAnswer,
  language: IndigenousLanguage,
  studentLevel: string,
  isWeakArea: boolean
): string {
  const isCorrect = answer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

  if (isCorrect) {
    return `Excellent! Your answer is correct. You have demonstrated a good understanding of ${question.type} in ${language}.`;
  }

  const weakAreaAdjustment = isWeakArea
    ? " This is an area where you've struggled before, so let's focus on improving it."
    : "";

  const levelAdjustment = studentLevel === "beginner"
    ? " As a beginner, you're making good progress. Keep practicing!"
    : studentLevel === "advanced"
    ? " At an advanced level, you should aim for more precision in your answers."
    : " You're at an intermediate level, so focus on accuracy and cultural context.";

  return `Your answer needs improvement. The correct answer is: ${question.correctAnswer}.${weakAreaAdjustment}${levelAdjustment}`;
}

function generateFeedbackInLanguage(
  question: IndigenousExamQuestion,
  answer: IndigenousExamAnswer,
  language: IndigenousLanguage,
  studentLevel: string,
  isWeakArea: boolean
): string {
  const isCorrect = answer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

  if (isCorrect) {
    return language === "shona"
      ? "Zvakadii! Maitiro ayo akanyanya. Wakatenda zvakanaka pa ${question.type}."
      : "Kuhle! Indlela yakwethu ihle. Uwusebenze kahle ku ${question.type}.";
  }

  const weakAreaAdjustment = isWeakArea
    ? (language === "shona"
      ? " Iri nzvimbo yaukakanganwa, saka tinofanira kudzidza."
      : " Leli ngumkhawulo owakwenzile, ngakho kufanele ufundise.")
    : "";

  const levelAdjustment = studentLevel === "beginner"
    ? (language === "shona"
      ? " Semunhu wekutanga, uri kufadza. Enda mberi!"
      : " Njengomfundi, uqhubeka kanjalo. Qhubeka!")
    : studentLevel === "advanced"
    ? (language === "shona"
      ? " Semunhu wekutakura, unofanira kuita zviri nyore."
      : " Njengomfundi ophakathi, kufanele uqonde kahle.")
    : (language === "shona"
      ? " Semunhu wekupedzisira, chinangwa chekuita zviri nyore."
      : " Njengomfundi ophakathi, kufanele uqonde kahle.");

  const correctAnswerText = language === "shona"
    ? `Maitiro chaiwo anenge: ${question.correctAnswer}.`
    : `Indlela elungileyo: ${question.correctAnswer}.`;

  return `${correctAnswerText}${weakAreaAdjustment}${levelAdjustment}`;
}

function generateSuggestions(
  question: IndigenousExamQuestion,
  answer: IndigenousExamAnswer,
  language: IndigenousLanguage,
  studentLevel: string
): string[] {
  const suggestions: string[] = [];

  switch (question.type) {
    case "grammar":
      suggestions.push("Practice noun classes and verb conjugation");
      suggestions.push("Study adjective agreement (concord)");
      suggestions.push("Review sentence structure patterns");
      break;
    case "comprehension":
      suggestions.push("Read more passages in the target language");
      suggestions.push("Practice identifying key information");
      suggestions.push("Focus on understanding context");
      break;
    case "vocabulary":
      suggestions.push("Learn new words daily");
      suggestions.push("Practice using words in sentences");
      suggestions.push("Review synonyms and antonyms");
      break;
    case "literature":
      suggestions.push("Study traditional texts and proverbs");
      suggestions.push("Understand cultural context");
      suggestions.push("Analyze themes and literary devices");
      break;
    case "idioms":
      suggestions.push("Learn common idioms and their meanings");
      suggestions.push("Understand cultural significance");
      suggestions.push("Practice using idioms in context");
      break;
  }

  return suggestions;
}

function generateSuggestionsInLanguage(
  question: IndigenousExamQuestion,
  answer: IndigenousExamAnswer,
  language: IndigenousLanguage,
  studentLevel: string
): string[] {
  const suggestions: string[] = [];

  if (language === "shona") {
    switch (question.type) {
      case "grammar":
        suggestions.push("Dzidza zvivakadzivo nemabasa eShona");
        suggestions.push("Pfunga kubatana kwezvivakadzivo");
        suggestions.push("Verenga maitiro emagwaro");
        break;
      case "comprehension":
        suggestions.push("Verenga zvinyorwa zviri ChiShona");
        suggestions.push("Pfunga kuziva zvinhu zviri kubatsirwa");
        suggestions.push("Chinangwa chekuziva zvinhu zviri kubata");
        break;
      case "vocabulary":
        suggestions.push("Dzidza mazitsva masikati");
        suggestions.push("Pfunga kushandisa mazita mumagwaro");
        suggestions.push("Verenga mazita akafanana nemazita akasiyana");
        break;
      case "literature":
        suggestions.push("Dzidza zvinyorwa zvedzidzo uye tsumo");
        suggestions.push("Ziva zvinhu zviri kubata");
        suggestions.push("Pfunga kudzidza zviratidzo nemagariro");
        break;
      case "idioms":
        suggestions.push("Dzidza tsumo dzakajeka uye zvinorevei");
        suggestions.push("Zva zvinhu zviri kubata");
        suggestions.push("Pfunga kushandisa tsumo mumagwaro");
        break;
    }
  } else {
    switch (question.type) {
      case "grammar":
        suggestions.push("Funda izinhlobo zabantu nemisebenzi yesiNdebele");
        suggestions.push("Qondisa ukubambisa kwezinhlobo zabantu");
        suggestions.push("Funda ukwakha kwemagama");
        break;
      case "comprehension":
        suggestions.push("Funda izincwadi zesiNdebele");
        suggestions.push("Qondisa ukwazi izinto ezidingeka");
        suggestions.push("Qondisa ukwazi isimo");
        break;
      case "vocabulary":
        suggestions.push("Funda amagama amasha nsuku zonke");
        suggestions.push("Sebenzisa amagama emagama");
        suggestions.push("Funda amagama afanana namagama ahlukene");
        break;
      case "literature":
        suggestions.push("Funda izincwadi zendalo nezisho");
        suggestions.push("Qondisa isimo esintsha");
        suggestions.push("Funda izitho nemagariro");
        break;
      case "idioms":
        suggestions.push("Funda izisho ezilula kanye nezithetho");
        suggestions.push("Qondisa isimo esintsha");
        suggestions.push("Sebenzisa izisho emagama");
        break;
    }
  }

  return suggestions;
}

export async function generateOverallFeedback(
  language: IndigenousLanguage,
  percentage: number,
  userId: string
): Promise<IndigenousExamFeedback> {
  const memory = await getMemory(userId);
  const weakTopics = memory.weakTopics || [];

  const isLanguageWeak = weakTopics.some(t => t.toLowerCase().includes(language));

  const overall = percentage >= 70
    ? `Excellent performance in ${language}! You have demonstrated strong understanding of the language.`
    : percentage >= 50
    ? `Good progress in ${language}. Continue practicing to improve your skills.`
    : `You need to dedicate more time to studying ${language}. Focus on the basics first.`;

  const overallInLanguage = percentage >= 70
    ? (language === "shona"
      ? "Kudzidza kwakadii kwaChiShona! Wakatenda zvakanaka."
      : "Ukufunda kwakuhle kesiNdebele! Uwusebenze kahle.")
    : percentage >= 50
    ? (language === "shona"
      ? "Kudzidza kuri kufadza kwaChiShona. Enda mberi."
      : "Ukufunda kuhle kesiNdebele. Qhubeka ukufunda.")
    : (language === "shona"
      ? "Unoda kudzidza zvakanyanya kwaChiShona. Tanga ne zviri nyore."
      : "Ufuna ukufunda kakhulu kesiNdebele. Qala ngezinto ezincane.");

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (percentage >= 70) {
    strengths.push("Strong grammar foundation");
    strengths.push("Good vocabulary");
    recommendations.push("Continue practicing advanced concepts");
    recommendations.push("Explore literature and idioms");
  } else if (percentage >= 50) {
    strengths.push("Basic understanding");
    weaknesses.push("Grammar needs improvement");
    weaknesses.push("Vocabulary needs expansion");
    recommendations.push("Focus on noun classes and verb conjugation");
    recommendations.push("Practice with past exam papers");
  } else {
    weaknesses.push("Grammar needs significant work");
    weaknesses.push("Limited vocabulary");
    weaknesses.push("Comprehension needs improvement");
    recommendations.push("Start with basic grammar lessons");
    recommendations.push("Learn 10 new words daily");
    recommendations.push("Read simple passages");
  }

  const strengthsInLanguage: string[] = [];
  const weaknessesInLanguage: string[] = [];
  const recommendationsInLanguage: string[] = [];

  if (percentage >= 70) {
    strengthsInLanguage.push(language === "shona" ? "Zvivakadzivo zvakadii" : "Izinhlobo zabantu ezihle");
    strengthsInLanguage.push(language === "shona" ? "Mazita akadii" : "Amagama ahle");
    recommendationsInLanguage.push(language === "shona" ? "Dzidza zviratidzo" : "Funda izinto ezithile");
    recommendationsInLanguage.push(language === "shona" ? "Dzidza zvinyorwa uye tsumo" : "Funda izincwadi nezisho");
  } else if (percentage >= 50) {
    strengthsInLanguage.push(language === "shona" ? "Kudzidza kuri kufadza" : "Ukufunda kuhle");
    weaknessesInLanguage.push(language === "shona" ? "Zvivakadzivo zvinoda kudzidzwa" : "Izinhlobo zabantu zifuna ukufundwa");
    weaknessesInLanguage.push(language === "shona" ? "Mazita anoda kudzidzwa" : "Amagama afuna ukufundwa");
    recommendationsInLanguage.push(language === "shona" ? "Dzidza zvivakadzivo nemabasa" : "Funda izinhlobo zabantu nemisebenzi");
    recommendationsInLanguage.push(language === "shona" ? "Pfunga nemabasa ekare" : "Sebenzisa imisebenzi yekudlala");
  } else {
    weaknessesInLanguage.push(language === "shona" ? "Zvivakadzivo zvinoda kudzidzwa zvakanyanya" : "Izinhlobo zabantu zifuna ukufundwa kakhulu");
    weaknessesInLanguage.push(language === "shona" ? "Mazita mashoma" : "Amagama amancane");
    weaknessesInLanguage.push(language === "shona" ? "Kuverenga kunoda basa" : "Ukufunda kufuna ukusebenza");
    recommendationsInLanguage.push(language === "shona" ? "Tanga kudzidza zvivakadzivo zviri nyore" : "Qala ukufunda izinhlobo zabantu ezincane");
    recommendationsInLanguage.push(language === "shona" ? "Dzidza gumi mazita masikati" : "Funda amagama ayishumi nsuku zonke");
    recommendationsInLanguage.push(language === "shona" ? "Verenga zvinyorwa zviri nyore" : "Funda izincwadi ezincane");
  }

  return {
    overall,
    overallInLanguage,
    strengths,
    weaknesses,
    recommendations,
    strengthsInLanguage,
    weaknessesInLanguage,
    recommendationsInLanguage,
  };
}
