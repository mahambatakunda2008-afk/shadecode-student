/**
 * /lib/languages/comprehension.ts
 *
 * Comprehension exercise generator for indigenous languages
 */

import { ComprehensionPassage, ComprehensionQuestion, VocabularyItem, IndigenousLanguage, DifficultyLevel } from "./types";

const SHONA_PASSAGES = [
  {
    title: "Kudya kweMusha (Traditional Family Meal)",
    content: `Musha wakabva wakagadzirira kudya kwemhuri yose. Sekuru vaive vachibika sadza remafuta emota. Ambuya vaive vachigadzira muriwo we nyama yehuku. Vana vaive vachitsvaka mvura yekunwa.

Sekuru vakati, "Sadza riripo, tibike zvakanaka." Ambuya vakatenda, "Muriwo wakabva wapera, tinogona kugadzira imwe." Vana vakatambira kuti vadii kudya sadza nemuriwo.

Kudya kwakaitwa kunobva kune rufaro runozadza musha wose.`,
    difficulty: "beginner" as DifficultyLevel,
  },
  {
    title: "Kutenda Basa Rokudaro (Doing Community Work)",
    content: `Musha wakabva wakatanga basa rokudaro. Vanhu vose vakasangana pachigaro chemusha kuti vateedzere basa. Vakatanga nekupera misha yose kuti vave nyore.

Sekuru vakati, "Tinofanira kubatsirana kuti musha wedu uve wakanaka." Vana vakatenda, "Tinogona kushanda zvirinani." Vakatanga kubvisa marara uye kugadzira nzira dzakajeka.

Basa rakapera muna masikati, uye musha wakabva wava wakanaka zvikuru.`,
    difficulty: "intermediate" as DifficultyLevel,
  },
];

const NDEBELE_PASSAGES = [
  {
    title: "Ukudla Kwasekhaya (Traditional Family Meal)",
    content: `Ikhaya labekulungiselela ukudla kwomndeni wonke. Umkhulu wayebika isitshala samanzi amafutha. Ugogo wayebikela ushagalabasha yenkukhu. Abantwana bayebika amanzi okunwa.

Umkhulu wathi, "Isitshala sikhona, sibike kahle." Ugogo wathi, "Ushagalabashi sesiphele, singakwazi ukubika elinye." Abantwana bathi, "Sifuna ukudla isitshala noshagalabashi."

Ukudla kwakwenza ukuthi ikhaya libe lijabulayo kunene.`,
    difficulty: "beginner" as DifficultyLevel,
  },
  {
    title: "Ukusebenza Umsebenzi Womphakathi (Doing Community Work)",
    content: `Ikhaya labekuqala umsebenzi womphakathi. Abantu bonke baqumane esitolo sasekhaya ukuze basebenze. Baqala ngokususa amakhanda ukuze kube lula.

Umkhulu wathi, "Kufanele sibambisane ukuze ikhaya lethu lihle." Abantwana bathi, "Singakwazi ukusebenza kahle." Baqala ukususa amakhanda ukuze umzila ube mnandi.

Umsebenzi uphele emini, futhi ikhaya lihle kakhulu.`,
    difficulty: "intermediate" as DifficultyLevel,
  },
];

function generateComprehensionPassage(language: IndigenousLanguage, difficulty: DifficultyLevel): ComprehensionPassage {
  const passages = language === "shona" ? SHONA_PASSAGES : NDEBELE_PASSAGES;
  const passage = passages.find(p => p.difficulty === difficulty) || passages[0];
  
  const questions = generateComprehensionQuestions(language, passage.content, difficulty);
  const vocabulary = generateVocabularyFromPassage(language, passage.content);

  return {
    id: crypto.randomUUID(),
    language,
    title: passage.title,
    content: passage.content,
    difficulty,
    questions,
    vocabulary,
  };
}

function generateComprehensionQuestions(language: IndigenousLanguage, content: string, difficulty: DifficultyLevel): ComprehensionQuestion[] {
  const questions: ComprehensionQuestion[] = [];

  // Literal comprehension question
  questions.push({
    id: crypto.randomUUID(),
    question: language === "shona" 
      ? "Chii chinonyorwa mupasuru iyi?" 
      : "Yini ibhalwe kulesi sikhundla?",
    type: "literal",
    options: language === "shona"
      ? ["Kudya kweMusha", "Kutenda Basa", "Kufunda", "Kutamba"]
      : ["Ukudla Kwasekhaya", "Ukusebenza Umsebenzi", "Ukufunda", "Ukudlala"],
    correctAnswer: language === "shona" ? "Kudya kweMusha" : "Ukudla Kwasekhaya",
    explanation: language === "shona"
      ? "The passage describes a traditional family meal preparation."
      : "Lesi sikhundla sichaza ukudla kwendalo kwomndini.",
  });

  // Inferential comprehension question
  questions.push({
    id: crypto.randomUUID(),
    question: language === "shona"
      ? "Zviri sei mhuri iyi?"
      : "Indlela umndini ophila ngayo iyiphi?",
    type: "inferential",
    options: language === "shona"
      ? ["Yakaramba", "Yakabva iri yakabatana", "Yakabva iri yakatambura", "Yakabva iri yakatambudzika"]
      : ["Ihlupheke", "Ibubeke, ibambisane", "Ihlupheke, ingabambisani", "Ihlupheke, ingasebenzi"],
    correctAnswer: language === "shona" ? "Yakabva iri yakabatana" : "Ibubeke, ibambisane",
    explanation: language === "shona"
      ? "The family is working together happily, showing unity and cooperation."
      : "Umndini usebenza kanjalo, ukukhombisa ubumbeswane nokubambisana.",
  });

  return questions;
}

function generateVocabularyFromPassage(language: IndigenousLanguage, content: string): VocabularyItem[] {
  const vocabulary: VocabularyItem[] = [];

  if (language === "shona") {
    vocabulary.push(
      {
        word: "Musha",
        pronunciation: "moo-sha",
        partOfSpeech: "Noun",
        meaning: "Home/Homestead",
        example: "Musha wakabva wakagadzirira kudya.",
        synonyms: ["Kumba"],
      },
      {
        word: "Sadza",
        pronunciation: "sad-za",
        partOfSpeech: "Noun",
        meaning: "Traditional staple food (thick porridge)",
        example: "Sekuru vaive vachibika sadza.",
        synonyms: [],
      },
      {
        word: "Sekuru",
        pronunciation: "seh-koo-roo",
        partOfSpeech: "Noun",
        meaning: "Grandfather/Elder",
        example: "Sekuru vakati, 'Sadza riripo.'",
        synonyms: ["Guru"],
      }
    );
  } else {
    vocabulary.push(
      {
        word: "Ikhaya",
        pronunciation: "ee-khai-yah",
        partOfSpeech: "Noun",
        meaning: "Home/Homestead",
        example: "Ikhaya labekulungiselela ukudla.",
        synonyms: ["Umzi"],
      },
      {
        word: "Isitshala",
        pronunciation: "ee-see-tsha-la",
        partOfSpeech: "Noun",
        meaning: "Traditional staple food (thick porridge)",
        example: "Umkhulu wayebika isitshala samanzi.",
        synonyms: [],
      },
      {
        word: "Umkhulu",
        pronunciation: "oom-khoo-loo",
        partOfSpeech: "Noun",
        meaning: "Grandfather/Elder",
        example: "Umkhulu wathi, 'Isitshala sikhona.'",
        synonyms: ["Ubaba"],
      }
    );
  }

  return vocabulary;
}

export function generateComprehensionExercise(language: IndigenousLanguage, difficulty: DifficultyLevel = "intermediate"): ComprehensionPassage {
  return generateComprehensionPassage(language, difficulty);
}
