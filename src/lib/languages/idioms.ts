/**
 * /lib/languages/idioms.ts
 *
 * Idiom and proverb database for indigenous languages
 */

import { Idiom, Proverb, IndigenousLanguage } from "./types";

const SHONA_IDIOMS: Idiom[] = [
  {
    id: "shona-idiom-1",
    language: "shona",
    phrase: "Gumbo remota",
    literalMeaning: "Leg of a goat",
    figurativeMeaning: "Someone who is always present wherever there is food or benefit",
    example: "John anoita se gumbo remota, anouya chero pane kudya.",
    usage: "Used to describe someone who always shows up when there's something to gain",
    culturalContext: "Reflects the communal nature of Shona society where sharing is valued, but opportunism is criticized.",
  },
  {
    id: "shona-idiom-2",
    language: "shona",
    phrase: "Mwana asakura haatauriri",
    literalMeaning: "A child who doesn't cry doesn't get fed",
    figurativeMeaning: "You must speak up or ask for what you need",
    example: "Usazvibate, mwana asakura haatauriri.",
    usage: "Encourages people to voice their needs and concerns",
    culturalContext: "Emphasizes the importance of communication in Shona culture, especially for children and those in need.",
  },
  {
    id: "shona-idiom-3",
    language: "shona",
    phrase: "Chinhu chakapfuma icho",
    literalMeaning: "That which is expensive is good",
    figurativeMeaning: "Quality comes at a price; you get what you pay for",
    example: "Zvinhu zvakapfuma zvinogona kudaro, chinhu chakapfuma icho.",
    usage: "Used when justifying the cost of quality items or services",
    culturalContext: "Reflects the value placed on quality and craftsmanship in traditional Shona society.",
  },
];

const NDEBELE_IDIOMS: Idiom[] = [
  {
    id: "ndebele-idiom-1",
    language: "ndebele",
    phrase: "Isiqu somthimba",
    literalMeaning: "Heart of a goat",
    figurativeMeaning: "Someone who is always present wherever there is food or benefit",
    example: "UJohn usebenza njengesiqu somthimba, uza nxa kukhona ukudla.",
    usage: "Used to describe someone who always shows up when there's something to gain",
    culturalContext: "Reflects the communal nature of Ndebele society where sharing is valued, but opportunism is criticized.",
  },
  {
    id: "ndebele-idiom-2",
    language: "ndebele",
    phrase: "Umntwana angakali aziwa",
    literalMeaning: "A child who doesn't cry is not known",
    figurativeMeaning: "You must speak up or ask for what you need",
    example: "Ungazithule, umntwana angakali aziwa.",
    usage: "Encourages people to voice their needs and concerns",
    culturalContext: "Emphasizes the importance of communication in Ndebele culture, especially for children and those in need.",
  },
  {
    id: "ndebele-idiom-3",
    language: "ndebele",
    phrase: "Into embi yimpilo",
    literalMeaning: "That which is expensive is life",
    figurativeMeaning: "Quality comes at a price; you get what you pay for",
    example: "Izinto ezikhulu zingasebenzi, into embi yimpilo.",
    usage: "Used when justifying the cost of quality items or services",
    culturalContext: "Reflects the value placed on quality and craftsmanship in traditional Ndebele society.",
  },
];

const SHONA_PROVERBS: Proverb[] = [
  {
    id: "shona-proverb-1",
    language: "shona",
    proverb: "Chara chimwe hachitswanyi inda",
    meaning: "One finger cannot crush a louse",
    context: "Unity and cooperation are essential for success",
    application: "Used to encourage teamwork and collective effort",
    culturalSignificance: "One of the most famous Shona proverbs, emphasizing the importance of community and working together. It reflects the Ubuntu philosophy that 'I am because we are.'",
  },
  {
    id: "shona-proverb-2",
    language: "shona",
    proverb: "Gudo rinopa kunze, richarama mukati",
    meaning: "A baboon gives outside but is hungry inside",
    context: "People may appear generous while suffering internally",
    application: "Used to describe hypocritical behavior or hidden struggles",
    culturalSignificance: "Warns against judging appearances and encourages empathy for those who may be struggling despite outward appearances.",
  },
  {
    id: "shona-proverb-3",
    language: "shona",
    proverb: "Chawana hachina kuti",
    meaning: "What you find has no owner",
    context: "Finders keepers (with cultural nuances)",
    application: "Used when someone finds something of value",
    culturalSignificance: "While it suggests finders keepers, it's often used with caution, as Shona culture values honesty and returning lost items to their rightful owners.",
  },
  {
    id: "shona-proverb-4",
    language: "shona",
    proverb: "Mwana akakura amamwa epasi",
    meaning: "When a child grows up, they eat the earth",
    context: "Children eventually become independent and face life's challenges",
    application: "Used when children leave home or become independent",
    culturalSignificance: "Acknowledges the natural progression of life and the challenges that come with adulthood. It's both a warning and an acceptance of life's cycle.",
  },
  {
    id: "shona-proverb-5",
    language: "shona",
    proverb: "Rume rwa guru rimaruramwe",
    meaning: "The thigh of a great one is never lonely",
    context: "Great people always have followers/supporters",
    application: "Used to describe influential people or leaders",
    culturalSignificance: "Reflects the respect and following that leaders command in Shona society. It also speaks to the responsibility of leadership.",
  },
];

const NDEBELE_PROVERBS: Proverb[] = [
  {
    id: "ndebele-proverb-1",
    language: "ndebele",
    proverb: "Isiqu esisodwa asisabangeli indlu",
    meaning: "One finger cannot build a house",
    context: "Unity and cooperation are essential for success",
    application: "Used to encourage teamwork and collective effort",
    culturalSignificance: "The Ndebele equivalent of the famous Shona proverb, emphasizing the importance of community and working together. It reflects the Ubuntu philosophy that 'I am because we are.'",
  },
  {
    id: "ndebele-proverb-2",
    language: "ndebele",
    proverb: "Impundzi yodla ngaphandle, ihlala ingenala",
    meaning: "A baboon eats outside but remains hungry inside",
    context: "People may appear generous while suffering internally",
    application: "Used to describe hypocritical behavior or hidden struggles",
    culturalSignificance: "Warns against judging appearances and encourages empathy for those who may be struggling despite outward appearances.",
  },
  {
    id: "ndebele-proverb-3",
    language: "ndebele",
    proverb: "Othunyelwe akalahlwa",
    meaning: "What is sent/found is not forgotten",
    context: "Finders keepers (with cultural nuances)",
    application: "Used when someone finds something of value",
    culturalSignificance: "While it suggests finders keepers, it's often used with caution, as Ndebele culture values honesty and returning lost items to their rightful owners.",
  },
  {
    id: "ndebele-proverb-4",
    language: "ndebele",
    proverb: "Umntana omkhulu udla umhlabathi",
    meaning: "When a child grows up, they eat the earth",
    context: "Children eventually become independent and face life's challenges",
    application: "Used when children leave home or become independent",
    culturalSignificance: "Acknowledges the natural progression of life and the challenges that come with adulthood. It's both a warning and an acceptance of life's cycle.",
  },
  {
    id: "ndebele-proverb-5",
    language: "ndebele",
    proverb: "Isiqu somkhulu asisoli",
    meaning: "The heart of a great one is never lonely",
    context: "Great people always have followers/supporters",
    application: "Used to describe influential people or leaders",
    culturalSignificance: "Reflects the respect and following that leaders command in Ndebele society. It also speaks to the responsibility of leadership.",
  },
];

export function getIdioms(language: IndigenousLanguage): Idiom[] {
  return language === "shona" ? SHONA_IDIOMS : NDEBELE_IDIOMS;
}

export function getProverbs(language: IndigenousLanguage): Proverb[] {
  return language === "shona" ? SHONA_PROVERBS : NDEBELE_PROVERBS;
}

export function getRandomIdiom(language: IndigenousLanguage): Idiom {
  const idioms = getIdioms(language);
  return idioms[Math.floor(Math.random() * idioms.length)];
}

export function getRandomProverb(language: IndigenousLanguage): Proverb {
  const proverbs = getProverbs(language);
  return proverbs[Math.floor(Math.random() * proverbs.length)];
}
