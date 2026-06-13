/**
 * /lib/exams/indigenous/marking.ts
 *
 * Marking schemes for indigenous language examinations
 */

import { IndigenousLanguage, IndigenousExamQuestion, IndigenousExamAnswer, IndigenousExamResult, IndigenousQuestionResult, IndigenousExamFeedback, ComprehensionMarking, VocabularyAssessment, LiteratureAnalysisMarking } from "./types";

// Shona marking criteria
const SHONA_MARKING_CRITERIA = {
  grammar: {
    keyPoints: [
      "Correct use of noun classes (zvivakadzivo)",
      "Proper verb conjugation",
      "Correct adjective agreement (concord)",
      "Appropriate use of pronouns",
      "Correct sentence structure",
    ],
    grammarWeight: 0.3,
    contentWeight: 0.4,
    culturalContextWeight: 0.2,
    languageAccuracyWeight: 0.1,
  },
  comprehension: {
    literalUnderstanding: 3,
    inferentialUnderstanding: 4,
    vocabulary: 2,
    grammar: 1,
  },
  vocabulary: {
    wordMeaning: 3,
    pronunciation: 2,
    usage: 3,
    context: 2,
  },
  literature: {
    understanding: 3,
    analysis: 3,
    themes: 2,
    literaryDevices: 1,
    culturalContext: 1,
  },
};

// Ndebele marking criteria
const NDEBELE_MARKING_CRITERIA = {
  grammar: {
    keyPoints: [
      "Correct use of noun classes (izinhlobo zabantu)",
      "Proper verb conjugation",
      "Correct adjective agreement (concord)",
      "Appropriate use of pronouns",
      "Correct sentence structure",
    ],
    grammarWeight: 0.3,
    contentWeight: 0.4,
    culturalContextWeight: 0.2,
    languageAccuracyWeight: 0.1,
  },
  comprehension: {
    literalUnderstanding: 3,
    inferentialUnderstanding: 4,
    vocabulary: 2,
    grammar: 1,
  },
  vocabulary: {
    wordMeaning: 3,
    pronunciation: 2,
    usage: 3,
    context: 2,
  },
  literature: {
    understanding: 3,
    analysis: 3,
    themes: 2,
    literaryDevices: 1,
    culturalContext: 1,
  },
};

function getMarkingCriteria(language: IndigenousLanguage) {
  return language === "shona" ? SHONA_MARKING_CRITERIA : NDEBELE_MARKING_CRITERIA;
}

function markGrammarAnswer(question: IndigenousExamQuestion, answer: IndigenousExamAnswer): IndigenousQuestionResult {
  const criteria = getMarkingCriteria(question.language).grammar;
  const isCorrect = answer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  
  let obtainedMarks = isCorrect ? question.marks : 0;
  
  // Partial marking for grammar questions
  if (!isCorrect && answer.answer.length > 0) {
    // Check if answer contains key grammatical elements
    const hasPartialMatch = answer.answer.toLowerCase().includes(question.correctAnswer.toLowerCase().substring(0, 3));
    if (hasPartialMatch) {
      obtainedMarks = Math.floor(question.marks * 0.5);
    }
  }

  const feedback = isCorrect
    ? (question.language === "shona" ? "Maitiro ayo akanyanya!" : "Indlela yakwethu ihle!")
    : (question.language === "shona" ? "Edza zvekare. Chinangwa chekudzidza zvivakadzivo." : "Zama kwakhona. Ufunde izinhlobo zabantu.");

  const feedbackInLanguage = isCorrect
    ? (question.language === "shona" ? "Excellent work!" : "Umsebenzi omuhle!")
    : (question.language === "shona" ? "Try again. Focus on noun classes." : "Zama kwakhona. Qondela izinhlobo zabantu.");

  return {
    questionId: question.id,
    obtainedMarks,
    totalMarks: question.marks,
    feedback,
    feedbackInLanguage,
    correctAnswer: question.correctAnswer,
    correctAnswerInLanguage: question.correctAnswerInLanguage,
  };
}

function markComprehensionAnswer(question: IndigenousExamQuestion, answer: IndigenousExamAnswer): IndigenousQuestionResult {
  const criteria = getMarkingCriteria(question.language).comprehension;
  
  // Simple marking for comprehension - check if answer contains key points
  const keyPoints = question.markingCriteria.keyPoints;
  let matchedPoints = 0;
  
  keyPoints.forEach(point => {
    if (answer.answer.toLowerCase().includes(point.toLowerCase())) {
      matchedPoints++;
    }
  });

  const percentage = matchedPoints / keyPoints.length;
  const obtainedMarks = Math.floor(question.marks * percentage);

  const feedback = percentage >= 0.7
    ? (question.language === "shona" ? "Wakatenda zvakanaka!" : "Uwusebenze kahle!")
    : (question.language === "shona" ? "Edza kuverenga zvakadaro." : "Zama ukufunda kahle.");

  const feedbackInLanguage = percentage >= 0.7
    ? (question.language === "shona" ? "Well done!" : "Kuhle!")
    : (question.language === "shona" ? "Try reading more carefully." : "Zama ukufunda kahle.");

  return {
    questionId: question.id,
    obtainedMarks,
    totalMarks: question.marks,
    feedback,
    feedbackInLanguage,
    correctAnswer: question.correctAnswer,
    correctAnswerInLanguage: question.correctAnswerInLanguage,
  };
}

function markVocabularyAnswer(question: IndigenousExamQuestion, answer: IndigenousExamAnswer): IndigenousQuestionResult {
  const isCorrect = answer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
  const obtainedMarks = isCorrect ? question.marks : 0;

  const feedback = isCorrect
    ? (question.language === "shona" ? "Zvakadii!" : "Kuhle!")
    : (question.language === "shona" ? "Chinangwa chekudzidza mazita." : "Ufunde amagama.");

  const feedbackInLanguage = isCorrect
    ? (question.language === "shona" ? "Correct!" : "Kulungile!")
    : (question.language === "shona" ? "Focus on vocabulary." : "Ufunde amagama.");

  return {
    questionId: question.id,
    obtainedMarks,
    totalMarks: question.marks,
    feedback,
    feedbackInLanguage,
    correctAnswer: question.correctAnswer,
    correctAnswerInLanguage: question.correctAnswerInLanguage,
  };
}

function markLiteratureAnswer(question: IndigenousExamQuestion, answer: IndigenousExamAnswer): IndigenousQuestionResult {
  const criteria = getMarkingCriteria(question.language).literature;
  const keyPoints = question.markingCriteria.keyPoints;
  
  let matchedPoints = 0;
  keyPoints.forEach(point => {
    if (answer.answer.toLowerCase().includes(point.toLowerCase())) {
      matchedPoints++;
    }
  });

  const percentage = matchedPoints / keyPoints.length;
  const obtainedMarks = Math.floor(question.marks * percentage);

  const feedback = percentage >= 0.6
    ? (question.language === "shona" ? "Wakatenda zvakanaka!" : "Uwusebenze kahle!")
    : (question.language === "shona" ? "Edza kuverenga zvakadaro." : "Zama ukufunda kahle.");

  const feedbackInLanguage = percentage >= 0.6
    ? (question.language === "shona" ? "Well done!" : "Kuhle!")
    : (question.language === "shona" ? "Try reading more carefully." : "Zama ukufunda kahle.");

  return {
    questionId: question.id,
    obtainedMarks,
    totalMarks: question.marks,
    feedback,
    feedbackInLanguage,
    correctAnswer: question.correctAnswer,
    correctAnswerInLanguage: question.correctAnswerInLanguage,
  };
}

export function markIndigenousExam(
  questions: IndigenousExamQuestion[],
  answers: IndigenousExamAnswer[],
  language: IndigenousLanguage
): IndigenousExamResult {
  let totalMarks = 0;
  let obtainedMarks = 0;
  const questionResults: IndigenousQuestionResult[] = [];

  questions.forEach((question, index) => {
    const answer = answers[index];
    totalMarks += question.marks;

    let result: IndigenousQuestionResult;
    
    switch (question.type) {
      case "grammar":
        result = markGrammarAnswer(question, answer);
        break;
      case "comprehension":
        result = markComprehensionAnswer(question, answer);
        break;
      case "vocabulary":
        result = markVocabularyAnswer(question, answer);
        break;
      case "literature":
        result = markLiteratureAnswer(question, answer);
        break;
      default:
        result = markGrammarAnswer(question, answer);
    }

    obtainedMarks += result.obtainedMarks;
    questionResults.push(result);
  });

  const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
  const grade = calculateGrade(percentage);

  const feedback = generateFeedback(percentage, questionResults, language);
  const feedbackInLanguage = generateFeedbackInLanguage(percentage, questionResults, language);

  return {
    submissionId: crypto.randomUUID(),
    examId: crypto.randomUUID(),
    language,
    userId: "",
    totalMarks,
    obtainedMarks,
    percentage,
    grade,
    feedback,
    questionResults,
    completedAt: new Date().toISOString(),
  };
}

function calculateGrade(percentage: number): string {
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

function generateFeedback(percentage: number, results: IndigenousQuestionResult[], language: IndigenousLanguage): IndigenousExamFeedback {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const correctCount = results.filter(r => r.obtainedMarks === r.totalMarks).length;
  const totalCount = results.length;

  if (percentage >= 70) {
    strengths.push("Good understanding of grammar");
    strengths.push("Strong vocabulary");
    recommendations.push("Continue practicing to maintain excellence");
  } else if (percentage >= 50) {
    strengths.push("Basic understanding demonstrated");
    weaknesses.push("Need more practice on grammar");
    weaknesses.push("Vocabulary needs improvement");
    recommendations.push("Focus on noun classes and verb conjugation");
    recommendations.push("Practice with past exam papers");
  } else {
    weaknesses.push("Grammar needs significant improvement");
    weaknesses.push("Vocabulary is limited");
    weaknesses.push("Comprehension needs work");
    recommendations.push("Start with basic grammar lessons");
    recommendations.push("Practice vocabulary daily");
    recommendations.push("Read more passages in the target language");
  }

  const overall = percentage >= 70
    ? "Well done! You have a good understanding of the language."
    : percentage >= 50
    ? "You're making progress, but need more practice."
    : "You need to dedicate more time to studying the language.";

  return {
    overall,
    strengths,
    weaknesses,
    recommendations,
  };
}

function generateFeedbackInLanguage(percentage: number, results: IndigenousQuestionResult[], language: IndigenousLanguage): string[] {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (language === "shona") {
    if (percentage >= 70) {
      strengths.push("Kudzidza kwakadii");
      strengths.push("Mazita akadii");
      recommendations.push("Enda mberi kudzidza");
    } else if (percentage >= 50) {
      strengths.push("Kudzidza kuri kufadza");
      weaknesses.push("Zvivakadzivo zvinoda kudzidzwa");
      weaknesses.push("Mazita anoda kudzidzwa");
      recommendations.push("Dzidza zvivakadzivo");
      recommendations.push("Enda mberi kudzidza");
    } else {
      weaknesses.push("Zvivakadzivo zvinoda kudzidzwa zvakanyanya");
      weaknesses.push("Mazita mashoma");
      weaknesses.push("Kuverenga kunoda basa");
      recommendations.push("Tanga kudzidza zvivakadzivo zviri nyore");
      recommendations.push("Dzidza mazita masikati");
      recommendations.push("Verenga zvinyorwa zviri ChiShona");
    }
  } else {
    if (percentage >= 70) {
      strengths.push("Ukufunda kwakuhle");
      strengths.push("Amagama akuhle");
      recommendations.push("Qhubeka ukufunda");
    } else if (percentage >= 50) {
      strengths.push("Ukufunda kuhle");
      weaknesses.push("Izinhlobo zabantu zifuna ukufundwa");
      weaknesses.push("Amagama afuna ukufundwa");
      recommendations.push("Funda izinhlobo zabantu");
      recommendations.push("Qhubeka ukufunda");
    } else {
      weaknesses.push("Izinhlobo zabantu zifuna ukufundwa kakhulu");
      weaknesses.push("Amagama amancane");
      weaknesses.push("Ukufunda kufuna ukusebenza");
      recommendations.push("Qala ukufunda izinhlobo zabantu ezincane");
      recommendations.push("Funda amagama nsuku zonke");
      recommendations.push("Funda izincwadi zesiNdebele");
    }
  }

  return [strengths.join(". "), weaknesses.join(". "), recommendations.join(". ")];
}

export function getComprehensionMarking(language: IndigenousLanguage): ComprehensionMarking {
  const criteria = getMarkingCriteria(language).comprehension;
  return {
    literalUnderstanding: criteria.literalUnderstanding,
    inferentialUnderstanding: criteria.inferentialUnderstanding,
    vocabulary: criteria.vocabulary,
    grammar: criteria.grammar,
    total: criteria.literalUnderstanding + criteria.inferentialUnderstanding + criteria.vocabulary + criteria.grammar,
  };
}

export function getVocabularyAssessment(language: IndigenousLanguage): VocabularyAssessment {
  const criteria = getMarkingCriteria(language).vocabulary;
  return {
    wordMeaning: criteria.wordMeaning,
    pronunciation: criteria.pronunciation,
    usage: criteria.usage,
    context: criteria.context,
    total: criteria.wordMeaning + criteria.pronunciation + criteria.usage + criteria.context,
  };
}

export function getLiteratureAnalysisMarking(language: IndigenousLanguage): LiteratureAnalysisMarking {
  const criteria = getMarkingCriteria(language).literature;
  return {
    understanding: criteria.understanding,
    analysis: criteria.analysis,
    themes: criteria.themes,
    literaryDevices: criteria.literaryDevices,
    culturalContext: criteria.culturalContext,
    total: criteria.understanding + criteria.analysis + criteria.themes + criteria.literaryDevices + criteria.culturalContext,
  };
}
