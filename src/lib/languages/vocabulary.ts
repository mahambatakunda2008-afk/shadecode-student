/**
 * /lib/languages/vocabulary.ts
 *
 * Vocabulary building system for indigenous languages
 */

import { VocabularyItem, IndigenousLanguage } from "./types";

const SHONA_VOCABULARY: VocabularyItem[] = [
  {
    word: "Mwana",
    pronunciation: "mwa-na",
    partOfSpeech: "Noun",
    meaning: "Child",
    example: "Mwana akapinda mumba.",
    synonyms: ["Mwanakomana", "Mwanasikana"],
    relatedWords: ["Mukuru", "Mudiki", "Mhuri"],
  },
  {
    word: "Mhuri",
    pronunciation: "moo-ree",
    partOfSpeech: "Noun",
    meaning: "Family",
    example: "Mhuri yangu yakabva inoenda kucheche.",
    synonyms: ["Hama"],
    relatedWords: ["Baba", "Amai", "Sekuru", "Ambuya"],
  },
  {
    word: "Rufaro",
    pronunciation: "oo-fa-ro",
    partOfSpeech: "Noun",
    meaning: "Happiness/Joy",
    example: "Tinofarira rufaro rwedu.",
    synonyms: ["Kudaro", "Kufara"],
    relatedWords: ["Kutenda", "Kubudirira", "Kushamwaridza"],
  },
  {
    word: "Kudaro",
    pronunciation: "oo-da-ro",
    partOfSpeech: "Verb",
    meaning: "To be happy/joyful",
    example: "Vanhu vose vane kudaro.",
    synonyms: ["Kufara"],
    relatedWords: ["Rufaro", "Kushamwaridza"],
  },
  {
    word: "Chikoro",
    pronunciation: "chi-ko-ro",
    partOfSpeech: "Noun",
    meaning: "School",
    example: "Ndichenda kuchikoro nguva yose.",
    synonyms: ["Chikoro cheMasikati"],
    relatedWords: ["Kudzidza", "Mudzidzi", "Ishe"],
  },
  {
    word: "Kudzidza",
    pronunciation: "oo-dzi-dza",
    partOfSpeech: "Verb",
    meaning: "To teach/learn",
    example: "Ishe vanoudzidza vana.",
    synonyms: ["Kufunda"],
    relatedWords: ["Chikoro", "Mudzidzi", "Ruzivo"],
  },
];

const NDEBELE_VOCABULARY: VocabularyItem[] = [
  {
    word: "Umntwana",
    pronunciation: "oom-twa-na",
    partOfSpeech: "Noun",
    meaning: "Child",
    example: "Umntwana angena ngaphandle.",
    synonyms: ["Umfana", "Intombi"],
    relatedWords: ["Umkhulu", "Umdala", "Umdala"],
  },
  {
    word: "Umndeni",
    pronunciation: "oom-de-nee",
    partOfSpeech: "Noun",
    meaning: "Family",
    example: "Umndeni wami uya esikolweni.",
    synonyms: ["Umnakwabo"],
    relatedWords: ["Ubaba", "Umama", "Umkhulu", "Ugogo"],
  },
  {
    word: "Injabulo",
    pronunciation: "in-ja-boo-lo",
    partOfSpeech: "Noun",
    meaning: "Happiness/Joy",
    example: "Sinethembisa injabulo yethu.",
    synonyms: ["Ukujabula"],
    relatedWords: ["Ukudlala", "Ukubusiseka", "Ukuthandaza"],
  },
  {
    word: "Ukujabula",
    pronunciation: "oo-koo-ja-boo-la",
    partOfSpeech: "Verb",
    meaning: "To be happy/joyful",
    example: "Abantu bonke bajabula.",
    synonyms: ["Ukudlala"],
    relatedWords: ["Injabulo", "Ukubusiseka"],
  },
  {
    word: "Isikole",
    pronunciation: "ee-see-koh-le",
    partOfSpeech: "Noun",
    meaning: "School",
    example: "Ngiya esikoleni nsuku zonke.",
    synonyms: ["Isikole samini"],
    relatedWords: ["Ukufunda", "Umfundi", "Uthisha"],
  },
  {
    word: "Ukufunda",
    pronunciation: "oo-koo-foo-nda",
    partOfSpeech: "Verb",
    meaning: "To teach/learn",
    example: "Uthisha ufundisa abantwana.",
    synonyms: ["Ukudlala"],
    relatedWords: ["Isikole", "Umfundi", "Ulwazi"],
  },
];

export function getVocabulary(language: IndigenousLanguage): VocabularyItem[] {
  return language === "shona" ? SHONA_VOCABULARY : NDEBELE_VOCABULARY;
}

export function getRandomVocabulary(language: IndigenousLanguage, count: number = 5): VocabularyItem[] {
  const vocabulary = getVocabulary(language);
  const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function searchVocabulary(language: IndigenousLanguage, query: string): VocabularyItem[] {
  const vocabulary = getVocabulary(language);
  const lowerQuery = query.toLowerCase();
  
  return vocabulary.filter(item => 
    item.word.toLowerCase().includes(lowerQuery) ||
    item.meaning.toLowerCase().includes(lowerQuery) ||
    item.example.toLowerCase().includes(lowerQuery)
  );
}

export function getVocabularyByCategory(language: IndigenousLanguage, category: string): VocabularyItem[] {
  const vocabulary = getVocabulary(language);
  
  return vocabulary.filter(item => 
    item.partOfSpeech.toLowerCase() === category.toLowerCase()
  );
}
