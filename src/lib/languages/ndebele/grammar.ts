/**
 * /lib/languages/ndebele/grammar.ts
 *
 * Ndebele grammar lesson generator
 */

import { GrammarLesson, DifficultyLevel } from "../types";

const NDEBELE_GRAMMAR_TOPICS = [
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

function createNdebeleGrammarLesson(topic: string, difficulty: DifficultyLevel): GrammarLesson {
  const lessonId = crypto.randomUUID();
  
  const lessonContent = getNdebeleGrammarContent(topic, difficulty);
  
  return {
    id: lessonId,
    language: "ndebele",
    title: lessonContent.title,
    topic,
    difficulty,
    explanation: lessonContent.explanation,
    examples: lessonContent.examples,
    exercises: lessonContent.exercises,
    culturalContext: lessonContent.culturalContext,
  };
}

function getNdebeleGrammarContent(topic: string, difficulty: DifficultyLevel) {
  const contentMap: Record<string, any> = {
    "noun-classes": {
      title: "IsiNdebele Noun Classes (Izinhlobo Zabantu)",
      explanation: `IsiNdebele uses a system of noun classes (izinhlobo zabantu) that categorize nouns based on their characteristics. Each class has specific prefixes for nouns, adjectives, and verbs. The noun class system is similar to other Nguni languages.

The noun class system is fundamental to IsiNdebele grammar and affects how words agree with each other in sentences.`,
      examples: [
        {
          correct: "Umuntu - a person (Class 1: umu- prefix)",
          explanation: "Class 1 is for people and animate beings. The prefix 'umu-' indicates singular.",
          translation: "Person",
        },
        {
          correct: "Abantu - people (Class 2: aba- prefix)",
          explanation: "Class 2 is the plural of Class 1. The prefix 'aba-' indicates plural people.",
          translation: "People",
        },
        {
          correct: "Umuthi - tree (Class 3: umu- prefix)",
          explanation: "Class 3 is for trees, plants, and natural objects. The prefix 'umu-' is used.",
          translation: "Tree",
        },
        {
          correct: "Imithi - trees (Class 4: imi- prefix)",
          explanation: "Class 4 is the plural of Class 3. The prefix 'imi-' indicates plural plants.",
          translation: "Trees",
        },
      ],
      exercises: [
        {
          type: "multiple-choice",
          question: "What is the plural of 'umuntu' (person)?",
          options: ["Abantu", "Imithi", "Izimpilo", "Amazwi"],
          correctAnswer: "Abantu",
          explanation: "The plural of 'umuntu' (person) is 'abantu' (people). Class 1 (umu-) becomes Class 2 (aba-).",
        },
        {
          type: "fill-blank",
          question: "The IsiNdebele word for 'tree' is ____.",
          correctAnswer: "umuthi",
          explanation: "The IsiNdebele word for 'tree' is 'umuthi'. It belongs to Class 3 with the 'umu-' prefix.",
        },
      ],
      culturalContext: "Noun classes reflect the Nguni linguistic tradition and are deeply embedded in IsiNdebele culture. Understanding them is essential for proper communication and shows respect for the language's structure.",
    },
    "verb-conjugation": {
      title: "IsiNdebele Verb Conjugation",
      explanation: `IsiNdebele verbs conjugate based on subject, tense, aspect, and mood. The basic verb form is the infinitive (ukusebenza - to work), which changes based on the subject prefix.

Subject prefixes: ngi- (I), u- (you singular), u- (he/she), si- (we), ni- (you plural), ba- (they).`,
      examples: [
        {
          correct: "Ngihamba - I walk",
          explanation: "The prefix 'ngi-' indicates first person singular. The verb root is '-hamba' (walk).",
          translation: "I walk",
        },
        {
          correct: "Uhamba - You walk",
          explanation: "The prefix 'u-' indicates second person singular. Used when addressing one person.",
          translation: "You walk",
        },
        {
          correct: "Uhamba - He/she walks",
          explanation: "The prefix 'u-' indicates third person singular. Used for he, she, or it.",
          translation: "He/she walks",
        },
      ],
      exercises: [
        {
          type: "fill-blank",
          question: "The subject prefix for 'I' in IsiNdebele is ____.",
          correctAnswer: "ngi",
          explanation: "The subject prefix for 'I' is 'ngi-'. Example: Ngihamba (I walk).",
        },
        {
          type: "multiple-choice",
          question: "What does 'Bahamba' mean?",
          options: ["They walk", "We walk", "You walk", "I walk"],
          correctAnswer: "They walk",
          explanation: "'Ba-' is the subject prefix for 'they'. So 'Bahamba' means 'They walk'.",
        },
      ],
      culturalContext: "Verb conjugation in IsiNdebele reflects the communal nature of the culture. The language emphasizes clear subject identification and action, which is important in a society that values collective responsibility.",
    },
    "adjectives": {
      title: "IsiNdebele Adjectives (Izithetho)",
      explanation: `IsiNdebele adjectives agree with the noun they modify based on the noun class. This agreement is called concord. The adjective prefix must match the noun class prefix.

Example: Umuntu mkhulu (The person is tall) - the adjective 'mkhulu' agrees with Class 1.`,
      examples: [
        {
          correct: "Mkhulu - tall/big (Class 1)",
          explanation: "The prefix 'm-' agrees with Class 1 nouns like 'umuntu' (person).",
          translation: "Tall/Big",
        },
        {
          correct: "Abakhulu - tall/big (Class 2)",
          explanation: "The prefix 'aba-' agrees with Class 2 plural nouns like 'abantu' (people).",
          translation: "Tall/Big (plural)",
        },
      ],
      exercises: [
        {
          type: "fill-blank",
          question: "If 'umuthi' (tree) is big, we say 'umuthi ____'.",
          correctAnswer: "mkhulu",
          explanation: "The adjective for 'big' in Class 3 is 'mkhulu'. So 'umuthi mkhulu' means 'big tree'.",
        },
      ],
      culturalContext: "Adjective agreement in IsiNdebele shows the interconnectedness of language elements. This reflects the cultural value of harmony and proper relationships between different elements of communication.",
    },
  };

  return contentMap[topic] || {
    title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} in IsiNdebele`,
    explanation: `This lesson covers ${topic} in IsiNdebele grammar. Understanding this topic is essential for mastering the language.`,
    examples: [],
    exercises: [],
    culturalContext: "IsiNdebele grammar reflects the rich cultural heritage of the Ndebele people. Each grammatical structure carries cultural significance and historical context.",
  };
}

export function generateNdebeleGrammarLesson(topic: string, difficulty: DifficultyLevel = "intermediate"): GrammarLesson {
  return createNdebeleGrammarLesson(topic, difficulty);
}

export function getNdebeleGrammarTopics(): string[] {
  return NDEBELE_GRAMMAR_TOPICS;
}
