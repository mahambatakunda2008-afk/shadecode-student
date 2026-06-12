/**
 * /lib/languages/exam.ts
 *
 * Exam preparation module for indigenous languages
 */

import { ExamQuestion, IndigenousLanguage, DifficultyLevel } from "./types";

const SHONA_EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: "shona-exam-1",
    language: "shona",
    subject: "Grammar",
    type: "multiple-choice",
    question: "Chii chiri chokutaura nezvivakadzivo?",
    options: ["Kutaura kwemashoko", "Kufambisa mazita", "Kugadzirisa zvinhu", "Kudzidza"],
    correctAnswer: "Kufambisa mazita",
    marks: 2,
    explanation: "Zvivakadzivo (noun classes) zvinofambisa mazita zvichienderana nezvinhu zvinofanira.",
    pastPaper: "ZIMSEC 2023",
    year: 2023,
  },
  {
    id: "shona-exam-2",
    language: "shona",
    subject: "Grammar",
    type: "multiple-choice",
    question: "Munhu anotaura sei achiti 'ndinofamba'?",
    options: ["Ndinotenda", "Ndinoshanda", "Ndinokwira", "Ndinokudya"],
    correctAnswer: "Ndinokwira",
    marks: 2,
    explanation: "'Kufamba' kunoreva kutenda kufamba, saka 'ndinokwira' ndiyo inofadza.",
    pastPaper: "ZIMSEC 2022",
    year: 2022,
  },
  {
    id: "shona-exam-3",
    language: "shona",
    subject: "Comprehension",
    type: "short-answer",
    question: "Taura kuti zviri sei mhuri yakanyorwa mupasuru.",
    correctAnswer: "Mhuri yakabva iri yakabatana uye inofara rufaro.",
    marks: 4,
    explanation: "Mhuri yakabata basa pamwe chete uye yakagadzirira kudya kwose.",
    pastPaper: "ZIMSEC 2023",
    year: 2023,
  },
  {
    id: "shona-exam-4",
    language: "shona",
    subject: "Idioms",
    type: "multiple-choice",
    question: "Chara chimwe hachitswanyi inda inorevei?",
    options: ["Kufambirana", "Kubatana", "Kudya", "Kutenda"],
    correctAnswer: "Kubatana",
    marks: 2,
    explanation: "Tsumo inoreva kuti vanhu vanofanira kubatana kuti vabude mabasa.",
    pastPaper: "ZIMSEC 2021",
    year: 2021,
  },
];

const NDEBELE_EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: "ndebele-exam-1",
    language: "ndebele",
    subject: "Grammar",
    type: "multiple-choice",
    question: "Yini ethethwa ngokwezinhlobo zabantu?",
    options: ["Ukukhuluma amagama", "Ukubambisa amagama", "Ukugadzela izinto", "Ukufunda"],
    correctAnswer: "Ukubambisa amagama",
    marks: 2,
    explanation: "Izinhlobo zabantu (noun classes) zihambisa amagama ngokwezinto ezifanayo.",
    pastPaper: "ZIMSEC 2023",
    year: 2023,
  },
  {
    id: "ndebele-exam-2",
    language: "ndebele",
    subject: "Grammar",
    type: "multiple-choice",
    question: "Umuntu ethetha njani uma ethi 'ngihamba'?",
    options: ["Ngithanda", "Ngisebenza", "Ngihamba", "Ngidla"],
    correctAnswer: "Ngihamba",
    marks: 2,
    explanation: "'Ukuhamba' kusho ukusebenza, ngakho 'ngihamba' iyona elungile.",
    pastPaper: "ZIMSEC 2022",
    year: 2022,
  },
  {
    id: "ndebele-exam-3",
    language: "ndebele",
    subject: "Comprehension",
    type: "short-answer",
    question: "Khuluma ngendlela umndini ophila ngayo kulesi sikhundla.",
    correctAnswer: "Umndoni ububeke, ubambisane, futhi unethembisa injabulo.",
    marks: 4,
    explanation: "Umndoni usebenza kanjolo, wabambisana ukudla, futhi unethembisa injabulo.",
    pastPaper: "ZIMSEC 2023",
    year: 2023,
  },
  {
    id: "ndebele-exam-4",
    language: "ndebele",
    subject: "Idioms",
    type: "multiple-choice",
    question: "Isiqu esisodwa asisabangeli indla ithethwa ukuthini?",
    options: ["Ukubambisana", "Ukudlala", "Ukudla", "Ukusebenza"],
    correctAnswer: "Ukubambisana",
    marks: 2,
    explanation: "Isisho sithi abantu kufanele babambisane ukuze babe nemphumelelo.",
    pastPaper: "ZIMSEC 2021",
    year: 2021,
  },
];

export function getExamQuestions(language: IndigenousLanguage, subject?: string): ExamQuestion[] {
  const questions = language === "shona" ? SHONA_EXAM_QUESTIONS : NDEBELE_EXAM_QUESTIONS;
  
  if (subject) {
    return questions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
  }
  
  return questions;
}

export function getExamQuestionsByYear(language: IndigenousLanguage, year: number): ExamQuestion[] {
  const questions = getExamQuestions(language);
  return questions.filter(q => q.year === year);
}

export function getRandomExamQuestions(language: IndigenousLanguage, count: number = 5): ExamQuestion[] {
  const questions = getExamQuestions(language);
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function calculateScore(questions: ExamQuestion[], answers: string[]): number {
  let totalMarks = 0;
  let earnedMarks = 0;
  
  questions.forEach((question, index) => {
    totalMarks += question.marks;
    if (answers[index] === question.correctAnswer) {
      earnedMarks += question.marks;
    }
  });
  
  return totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;
}
