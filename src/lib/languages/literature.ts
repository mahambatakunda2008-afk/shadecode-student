/**
 * /lib/languages/literature.ts
 *
 * Literature study module for indigenous languages
 */

import { LiteratureWork, IndigenousLanguage, DifficultyLevel } from "./types";

const SHONA_LITERATURE: LiteratureWork[] = [
  {
    id: "shona-lit-1",
    language: "shona",
    title: "Nhoroondo dzeZimbabwe",
    author: "Traditional",
    type: "folklore",
    period: "Traditional",
    excerpt: `Kare kare, Zimbabwe yakanga iri nyika yakaipenyu nemifidzo yakaipenyu. Vanhu vaive vachitenda basa dzakasiyana-siyana. Vakatenda mabasa ekurima, ekupfuya mombe, uye ekudzidza vana vavo.

Vakatenda se mhuri dzakabatana. Sekuru vaive vachidzidza vana kuti vazive zviri kuita. Ambuya vaive vachigadzira kudya. Vana vaive vachitsvaka mvura uye kuchengeta mombe.`,
    themes: ["Unity", "Tradition", "Family", "Hard work"],
    analysis: {
      summary: "This traditional Shona text describes the way of life in ancient Zimbabwe, emphasizing unity, tradition, family values, and hard work.",
      themes: ["Unity and cooperation", "Preservation of tradition", "Family roles and responsibilities", "Value of hard work"],
      literaryDevices: ["Repetition", "Imagery", "Parallelism"],
      culturalSignificance: "This text represents the oral tradition of Shona culture, passing down values and wisdom through generations. It emphasizes the communal nature of Shona society and the importance of maintaining cultural practices.",
    },
    questions: [
      {
        id: "shona-lit-q1",
        question: "Zviri sei vanhu vaive vachitenda basa?",
        type: "understanding",
        correctAnswer: "Vaive vachitenda mabasa dzakasiyana-siyana",
        explanation: "The text mentions that people did different types of work including farming, cattle herding, and teaching children.",
      },
      {
        id: "shona-lit-q2",
        question: "Chii chinotsanangurwa nezve mhuri?",
        type: "context",
        correctAnswer: "Kubatana kwe mhuri",
        explanation: "The text emphasizes that families worked together, with elders teaching children and everyone contributing to household tasks.",
      },
    ],
  },
  {
    id: "shona-lit-2",
    language: "shona",
    title: "Tsumo dzeChiShona",
    author: "Traditional",
    type: "folklore",
    period: "Traditional",
    excerpt: `Chara chimwe hachitswanyi inda. Gudo rinopa kunze, richarama mukati. Mwana akakura amamwa epasi. Rume rwa guru rimaruramwe. Chawana hachina kuti. Gumbo remota. Mwana asakura haatauriri.`,
    themes: ["Wisdom", "Unity", "Life lessons", "Community"],
    analysis: {
      summary: "A collection of traditional Shona proverbs (tsumo) that convey wisdom, life lessons, and cultural values.",
      themes: ["Wisdom and knowledge", "Community and unity", "Life cycles and growth", "Social behavior"],
      literaryDevices: ["Metaphor", "Symbolism", "Parallelism"],
      culturalSignificance: "Tsumo are an integral part of Shona oral tradition, used to teach moral lessons and preserve cultural wisdom. Each proverb carries deep meaning and is used in appropriate social contexts.",
    },
    questions: [
      {
        id: "shona-lit-q3",
        question: "Chara chimwe hachitswanyi inda inorevei?",
        type: "understanding",
        correctAnswer: "Kubatana",
        explanation: "This proverb teaches that unity and cooperation are essential for success - one finger cannot accomplish much alone.",
      },
      {
        id: "shona-lit-q4",
        question: "Tsumo dzinobatsira sei vanhu?",
        type: "evaluation",
        correctAnswer: "Dzinodzidza vanhu zvakanaka uye dzinopa ruzivo",
        explanation: "Proverbs are used to teach moral lessons, provide guidance, and preserve cultural wisdom across generations.",
      },
    ],
  },
];

const NDEBELE_LITERATURE: LiteratureWork[] = [
  {
    id: "ndebele-lit-1",
    language: "ndebele",
    title: "Umlando weZimbabwe",
    author: "Traditional",
    type: "folklore",
    period: "Traditional",
    excerpt: `Kade kade, Zimbabwe yayindawo eyencongcwane yezimpilo. Abantu babesebenza imisebenzi eyahlukene. Babesebenza ukulima, ukulima inkomo, futhi ukufunda abantwana babo.

Abantu babesebenza njengomndini. Umkhulu wayefunda abantwana ukuthi bazazi ukwenza. Ugogo wayebikela ukudla. Abantwana babebika amanzi futhi ukulinda inkomo.`,
    themes: ["Unity", "Tradition", "Family", "Hard work"],
    analysis: {
      summary: "This traditional IsiNdebele text describes the way of life in ancient Zimbabwe, emphasizing unity, tradition, family values, and hard work.",
      themes: ["Unity and cooperation", "Preservation of tradition", "Family roles and responsibilities", "Value of hard work"],
      literaryDevices: ["Repetition", "Imagery", "Parallelism"],
      culturalSignificance: "This text represents the oral tradition of Ndebele culture, passing down values and wisdom through generations. It emphasizes the communal nature of Ndebele society and the importance of maintaining cultural practices.",
    },
    questions: [
      {
        id: "ndebele-lit-q1",
        question: "Abantu babesebenza kanjani?",
        type: "understanding",
        correctAnswer: "Babesebenza imisebenzi eyahlukene",
        explanation: "The text mentions that people did different types of work including farming, cattle herding, and teaching children.",
      },
      {
        id: "ndebele-lit-q2",
        question: "Yini ethethwa ngomndeni?",
        type: "context",
        correctAnswer: "Ukubambisana komndeni",
        explanation: "The text emphasizes that families worked together, with elders teaching children and everyone contributing to household tasks.",
      },
    ],
  },
  {
    id: "ndebele-lit-2",
    language: "ndebele",
    title: "Izisho zesiNdebele",
    author: "Traditional",
    type: "folklore",
    period: "Traditional",
    excerpt: `Isiqu esisodwa asisabangeli indla. Impundzi yodla ngaphandle, ihlala ingenala. Umntwana omkhulu udla umhlabathi. Isiqu somkhulu asisoli. Othunyelwe akalahlwa. Impundzi yodla ngaphandle.`,
    themes: ["Wisdom", "Unity", "Life lessons", "Community"],
    analysis: {
      summary: "A collection of traditional IsiNdebele proverbs (izisho) that convey wisdom, life lessons, and cultural values.",
      themes: ["Wisdom and knowledge", "Community and unity", "Life cycles and growth", "Social behavior"],
      literaryDevices: ["Metaphor", "Symbolism", "Parallelism"],
      culturalSignificance: "Izisho are an integral part of Ndebele oral tradition, used to teach moral lessons and preserve cultural wisdom. Each proverb carries deep meaning and is used in appropriate social contexts.",
    },
    questions: [
      {
        id: "ndebele-lit-q3",
        question: "Isiqu esisodwa asisabangeli indla ithethwa ukuthini?",
        type: "understanding",
        correctAnswer: "Ukubambisana",
        explanation: "This proverb teaches that unity and cooperation are essential for success - one finger cannot accomplish much alone.",
      },
      {
        id: "ndebele-lit-q4",
        question: "Izisho zisiza kanjani abantu?",
        type: "evaluation",
        correctAnswer: "Zifundisa abantu kahle futhi zinike ulwazi",
        explanation: "Proverbs are used to teach moral lessons, provide guidance, and preserve cultural wisdom across generations.",
      },
    ],
  },
];

export function getLiteratureWorks(language: IndigenousLanguage): LiteratureWork[] {
  return language === "shona" ? SHONA_LITERATURE : NDEBELE_LITERATURE;
}

export function getLiteratureByType(language: IndigenousLanguage, type: string): LiteratureWork[] {
  const works = getLiteratureWorks(language);
  return works.filter(w => w.type.toLowerCase() === type.toLowerCase());
}

export function getRandomLiterature(language: IndigenousLanguage, count: number = 2): LiteratureWork[] {
  const works = getLiteratureWorks(language);
  const shuffled = [...works].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
