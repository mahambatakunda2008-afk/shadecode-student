/**
 * /lib/languages/shona/grammar.ts
 *
 * Shona grammar lesson generator
 */

import { GrammarLesson, GrammarExample, GrammarExercise, DifficultyLevel } from "../types";

const SHONA_GRAMMAR_TOPICS = [
  "noun-classes",
  "verb-conjugation",
  "adjectives",
  "pronouns",
  "sentence-structure",
  "tenses",
  "negation",
  "questions",
  "possessives",
  "demonstratives",
];

function getShonaGrammarContent(topic: string, difficulty: DifficultyLevel) {
  const contentMap: Record<string, any> = {
    "noun-classes": {
      title: "Shona Noun Classes (Zvivakadzivo)",
      explanation: `Shona uses a system of noun classes (zvivakadzivo) that categorize nouns based on their characteristics. Each class has specific prefixes for nouns, adjectives, and verbs. There are approximately 15-18 noun classes in Shona.

The noun class system is fundamental to Shona grammar and affects how words agree with each other in sentences.`,
      examples: [
        {
          correct: "Munhu - a person (Class 1: mu- prefix)",
          explanation: "Class 1 is for people and animate beings. The prefix 'mu-' indicates singular.",
          translation: "Person",
        },
        {
          correct: "Vanhu - people (Class 2: va- prefix)",
          explanation: "Class 2 is the plural of Class 1. The prefix 'va-' indicates plural people.",
          translation: "People",
        },
        {
          correct: "Muti - tree (Class 3: mu- prefix)",
          explanation: "Class 3 is for trees, plants, and natural objects. The prefix 'mu-' is used.",
          translation: "Tree",
        },
        {
          correct: "Mitimiri - trees (Class 4: mi- prefix)",
          explanation: "Class 4 is the plural of Class 3. The prefix 'mi-' indicates plural plants.",
          translation: "Trees",
        },
      ],
      exercises: [
        {
          type: "multiple-choice",
          question: "What is the plural of 'munhu' (person)?",
          options: ["Vanhu", "Mitimiri", "Zvipfumi", "Mazita"],
          correctAnswer: "Vanhu",
          explanation: "The plural of 'munhu' (person) is 'vanhu' (people). Class 1 (mu-) becomes Class 2 (va-).",
        },
        {
          type: "fill-blank",
          question: "The Shona word for 'tree' is ____.",
          correctAnswer: "muti",
          explanation: "The Shona word for 'tree' is 'muti'. It belongs to Class 3 with the 'mu-' prefix.",
        },
      ],
      culturalContext: "Noun classes reflect the Bantu linguistic tradition and are deeply embedded in Shona culture. Understanding them is essential for proper communication and shows respect for the language's structure.",
    },
    "verb-conjugation": {
      title: "Shona Verb Conjugation",
      explanation: `Shona verbs conjugate based on subject, tense, aspect, and mood. The basic verb form is the infinitive (kuchinjira - to work), which changes based on the subject prefix.

Subject prefixes: ndi- (I), u- (you singular), a- (he/she), ti- (we), mu- (you plural), va- (they).`,
      examples: [
        {
          correct: "Ndinofamba - I walk",
          explanation: "The prefix 'ndi-' indicates first person singular. The verb root is '-famba' (walk).",
          translation: "I walk",
        },
        {
          correct: "Unofamba - You walk",
          explanation: "The prefix 'u-' indicates second person singular. Used when addressing one person.",
          translation: "You walk",
        },
        {
          correct: "Anofamba - He/she walks",
          explanation: "The prefix 'a-' indicates third person singular. Used for he, she, or it.",
          translation: "He/she walks",
        },
      ],
      exercises: [
        {
          type: "fill-blank",
          question: "The subject prefix for 'I' in Shona is ____.",
          correctAnswer: "ndi",
          explanation: "The subject prefix for 'I' is 'ndi-'. Example: Ndinofamba (I walk).",
        },
        {
          type: "multiple-choice",
          question: "What does 'Vanofamba' mean?",
          options: ["They walk", "We walk", "You walk", "I walk"],
          correctAnswer: "They walk",
          explanation: "'Va-' is the subject prefix for 'they'. So 'Vanofamba' means 'They walk'.",
        },
      ],
      culturalContext: "Verb conjugation in Shona reflects the communal nature of the culture. The language emphasizes clear subject identification and action, which is important in a society that values collective responsibility.",
    },
    "adjectives": {
      title: "Shona Adjectives (Zviripo)",
      explanation: `Shona adjectives agree with the noun they modify based on the noun class. This agreement is called concord. The adjective prefix must match the noun class prefix.

Example: Munhu akabva (The person is tall) - the adjective 'kabva' agrees with Class 1.`,
      examples: [
        {
          correct: "Akabva - tall (Class 1)",
          explanation: "The prefix 'a-' agrees with Class 1 nouns like 'munhu' (person).",
          translation: "Tall",
        },
        {
          correct: "Vakabva - tall (Class 2)",
          explanation: "The prefix 'va-' agrees with Class 2 plural nouns like 'vanhu' (people).",
          translation: "Tall (plural)",
        },
      ],
      exercises: [
        {
          type: "fill-blank",
          question: "If 'muti' (tree) is big, we say 'muti ____'.",
          correctAnswer: "huru",
          explanation: "The adjective for 'big' in Class 3 is 'huru'. So 'muti huru' means 'big tree'.",
        },
      ],
      culturalContext: "Adjective agreement in Shona shows the interconnectedness of language elements. This reflects the cultural value of harmony and proper relationships between different elements of communication.",
    },
  };

  return contentMap[topic] || {
    title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} in Shona`,
    explanation: `This lesson covers ${topic} in Shona grammar. Understanding this topic is essential for mastering the language.`,
    examples: [],
    exercises: [],
    culturalContext: "Shona grammar reflects the rich cultural heritage of the Shona people. Each grammatical structure carries cultural significance and historical context.",
  };
}

export function generateShonaGrammarLesson(topic: string, difficulty: DifficultyLevel = "intermediate"): GrammarLesson {
  const lessonId = crypto.randomUUID();
  
  const lessonContent = getShonaGrammarContent(topic, difficulty);
  
  return {
    id: lessonId,
    language: "shona",
    title: lessonContent.title,
    topic,
    difficulty,
    explanation: lessonContent.explanation,
    examples: lessonContent.examples,
    exercises: lessonContent.exercises,
    culturalContext: lessonContent.culturalContext,
  };
}

export function getShonaGrammarTopics(): string[] {
  return SHONA_GRAMMAR_TOPICS;
}
