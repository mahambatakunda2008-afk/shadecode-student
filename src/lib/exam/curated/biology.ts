/**
 * src/lib/exam/curated/biology.ts
 *
 * Hand-authored Biology multiple-choice questions for CAMBRIDGE IGCSE / AS / A-Level style practice.
 * They are marked exactly (the model answer is the correct option), need no network and no AI,
 * and are served when live generation is unavailable or unnecessary.
 *
 * Authored once from standard textbook facts. Intended for a teacher to review before the
 * paper is described to learners as "verified".
 */

export interface BiologyMcq {
  question: string;
  options: string[];
  answer: string;
}

export interface BiologyTopic {
  topic: string;
  keywords: string[];
  questions: BiologyMcq[];
}

export interface BiologySeed {
  topic: string;
  type: "multiple_choice";
  question: string;
  options: string[];
  marks: number;
  modelAnswer: string;
  markingCriteria: string;
}

export const BIOLOGY_TOPICS: BiologyTopic[] = [
  {
    topic: "Cell structure",
    keywords: ["cell structure", "cell", "cells", "organelle*", "microscop*", "nucleus", "ribosome", "eukaryot*", "prokaryot*"],
    questions: [
      { question: "Which organelle is the main site of aerobic respiration in a eukaryotic cell?", options: ["Ribosome", "Golgi body", "Lysosome", "Mitochondrion"], answer: "Mitochondrion" },
      { question: "Which structure is found in plant cells but not in animal cells?", options: ["A cell surface membrane", "A cellulose cell wall", "Ribosomes", "Mitochondria"], answer: "A cellulose cell wall" },
      { question: "Which organelle synthesises proteins by translating mRNA?", options: ["Ribosome", "Lysosome", "Centriole", "Smooth endoplasmic reticulum"], answer: "Ribosome" },
      { question: "What is the main function of the Golgi body?", options: ["Modifying, packaging and secreting proteins", "Producing ATP by respiration", "Storing the genetic material", "Digesting worn-out organelles"], answer: "Modifying, packaging and secreting proteins" },
      { question: "Which of these is a feature of a prokaryotic cell?", options: ["A nucleus bounded by a nuclear envelope", "Circular DNA that is not enclosed in a nucleus", "Mitochondria", "Membrane-bound chloroplasts"], answer: "Circular DNA that is not enclosed in a nucleus" },
      { question: "An image of a cell is 5 mm long and the actual cell is 0.02 mm long. What is the magnification?", options: ["x25", "x100", "x250", "x2500"], answer: "x250" },
      { question: "Which organelle contains enzymes that digest worn-out organelles and engulfed material?", options: ["Lysosome", "Ribosome", "Chloroplast", "Centrosome"], answer: "Lysosome" },
      { question: "Which pair correctly matches an organelle with its function?", options: ["Nucleus - site of aerobic respiration", "Ribosome - site of lipid storage", "Lysosome - site of protein synthesis", "Chloroplast - site of photosynthesis"], answer: "Chloroplast - site of photosynthesis" },
      { question: "Which unit is most suitable for measuring the diameter of a typical animal cell?", options: ["nanometres", "micrometres", "millimetres", "metres"], answer: "micrometres" },
    ],
  },
  {
    topic: "Transport across membranes",
    keywords: ["membrane", "transport", "diffusion", "osmosis", "water potential", "active transport"],
    questions: [
      { question: "What is osmosis?", options: ["The movement of solute molecules from high to low concentration using ATP", "The net movement of water from a region of higher water potential to a region of lower water potential through a partially permeable membrane", "The movement of water from lower to higher water potential through a fully permeable membrane", "The movement of ions against a concentration gradient using carrier proteins"], answer: "The net movement of water from a region of higher water potential to a region of lower water potential through a partially permeable membrane" },
      { question: "Which process requires energy from ATP?", options: ["Simple diffusion", "Osmosis", "Facilitated diffusion", "Active transport"], answer: "Active transport" },
      { question: "Red blood cells are placed in distilled water. What happens to them?", options: ["They shrink because water leaves by osmosis", "They burst because water enters by osmosis", "They stay the same size", "They shrink because solutes enter the cell"], answer: "They burst because water enters by osmosis" },
      { question: "Which change would increase the rate of diffusion across an exchange surface?", options: ["A smaller surface area", "A thicker exchange surface", "A lower temperature", "A steeper concentration gradient"], answer: "A steeper concentration gradient" },
      { question: "A plant cell is placed in a concentrated sugar solution. The cell surface membrane pulls away from the cell wall. What is this called?", options: ["Turgor", "Plasmolysis", "Lysis", "Translocation"], answer: "Plasmolysis" },
      { question: "Which molecules cross the phospholipid bilayer most easily by simple diffusion?", options: ["Small non-polar molecules such as oxygen", "Large polar molecules such as glucose", "Charged ions such as sodium ions", "Large proteins"], answer: "Small non-polar molecules such as oxygen" },
      { question: "How does facilitated diffusion differ from simple diffusion?", options: ["It uses ATP from respiration", "It uses channel or carrier proteins", "It moves substances against their concentration gradient", "It involves the formation of vesicles"], answer: "It uses channel or carrier proteins" },
      { question: "What is the water potential of pure water?", options: ["-100 kPa", "0 kPa", "1 kPa", "+100 kPa"], answer: "0 kPa" },
      { question: "Which statement about active transport is correct?", options: ["It uses carrier proteins and energy to move substances against a concentration gradient", "It moves substances down a concentration gradient without energy", "It does not involve a membrane", "It can only move water molecules"], answer: "It uses carrier proteins and energy to move substances against a concentration gradient" },
    ],
  },
  {
    topic: "Biological molecules and enzymes",
    keywords: ["molecule", "enzyme", "carbohydrate*", "protein", "lipid", "biochem*", "starch", "glucose", "digest*"],
    questions: [
      { question: "Which bond joins amino acids together in a polypeptide?", options: ["Glycosidic bond", "Ester bond", "Peptide bond", "Phosphodiester bond"], answer: "Peptide bond" },
      { question: "Which reagent is used to test for starch?", options: ["Benedict's solution", "Iodine solution", "Biuret reagent", "Ethanol"], answer: "Iodine solution" },
      { question: "What happens to an enzyme at a very high temperature?", options: ["It becomes more specific for its substrate", "It is used up in the reaction", "Its rate of reaction keeps increasing", "It is denatured because the shape of its active site changes"], answer: "It is denatured because the shape of its active site changes" },
      { question: "What does the lock-and-key hypothesis state?", options: ["The active site changes shape to mould around the substrate", "Enzymes are used up as the reaction proceeds", "The substrate has a shape complementary to the active site of the enzyme", "Enzymes only work at very high temperatures"], answer: "The substrate has a shape complementary to the active site of the enzyme" },
      { question: "Which molecule is the monomer of the polysaccharide starch?", options: ["Glycerol", "Glucose", "An amino acid", "A fatty acid"], answer: "Glucose" },
      { question: "Which is a function of triglycerides in animals?", options: ["Catalysing metabolic reactions", "Carrying genetic information", "Forming the cell wall", "Energy storage and insulation"], answer: "Energy storage and insulation" },
      { question: "How does a competitive inhibitor reduce enzyme activity?", options: ["It binds to the active site so the substrate cannot bind", "It binds away from the active site and changes its shape", "It denatures the substrate", "It raises the temperature of the reaction"], answer: "It binds to the active site so the substrate cannot bind" },
      { question: "How do enzymes speed up chemical reactions?", options: ["By raising the temperature of the reaction", "By being used up as a reactant", "By lowering the activation energy", "By changing the products that are formed"], answer: "By lowering the activation energy" },
      { question: "Which element is found in proteins but not in carbohydrates?", options: ["Carbon", "Hydrogen", "Nitrogen", "Oxygen"], answer: "Nitrogen" },
      { question: "Which reagent changes from blue to purple when protein is present?", options: ["Benedict's reagent", "Iodine solution", "DCPIP", "Biuret reagent"], answer: "Biuret reagent" },
    ],
  },
  {
    topic: "DNA, protein synthesis and inheritance",
    keywords: ["dna", "gene", "genes", "genetic*", "inherit*", "protein synthesis", "transcript*", "translat*", "mutat*", "allele"],
    questions: [
      { question: "Which bases pair together in DNA?", options: ["A with C and T with G", "A with T and C with G", "A with G and C with T", "A with U and C with G"], answer: "A with T and C with G" },
      { question: "In a eukaryotic cell, where does transcription take place?", options: ["In the nucleus", "At the ribosome", "In the Golgi body", "In the lysosome"], answer: "In the nucleus" },
      { question: "What is a gene?", options: ["A whole chromosome", "A section of RNA that carries amino acids", "A length of DNA that codes for a polypeptide", "A group of cells with identical DNA"], answer: "A length of DNA that codes for a polypeptide" },
      { question: "An organism has the genotype Tt, where T (tall) is dominant to t (dwarf). What is its phenotype?", options: ["Dwarf", "Intermediate height", "Tall", "It cannot be determined"], answer: "Tall" },
      { question: "Two heterozygous tall plants (Tt x Tt) are crossed. What proportion of the offspring is expected to be dwarf?", options: ["0", "1/4", "1/2", "3/4"], answer: "1/4" },
      { question: "What does mRNA carry from the nucleus to the ribosome?", options: ["Amino acids", "Enzymes for DNA replication", "A copy of the genetic code for a polypeptide", "The ribosomal subunits"], answer: "A copy of the genetic code for a polypeptide" },
      { question: "What is the sequence of three bases on tRNA that pairs with a codon called?", options: ["An anticodon", "A codon", "A gene", "An allele"], answer: "An anticodon" },
      { question: "What is a change in the base sequence of DNA called?", options: ["A mutation", "Translation", "Transcription", "Replication"], answer: "A mutation" },
      { question: "Which statement about DNA replication is correct?", options: ["It is semi-conservative: each new DNA molecule contains one original strand", "Each new DNA molecule contains two new strands", "It happens only in meiosis II", "It uses ribosomes to join nucleotides"], answer: "It is semi-conservative: each new DNA molecule contains one original strand" },
      { question: "Which pair of sex chromosomes does a human male normally have?", options: ["XX", "YY", "XO", "XY"], answer: "XY" },
    ],
  },
  {
    topic: "Cell division",
    keywords: ["mitosis", "meiosis", "division", "chromosome", "cell cycle"],
    questions: [
      { question: "What does mitosis produce?", options: ["Four genetically different haploid cells", "Two genetically identical daughter cells", "Two haploid gametes", "Four identical diploid cells"], answer: "Two genetically identical daughter cells" },
      { question: "Which is a role of mitosis in a multicellular organism?", options: ["Production of gametes", "Increasing genetic variation", "Growth and repair of tissues", "Halving the chromosome number"], answer: "Growth and repair of tissues" },
      { question: "During which stage of mitosis do the chromatids move to opposite poles of the cell?", options: ["Prophase", "Metaphase", "Telophase", "Anaphase"], answer: "Anaphase" },
      { question: "Why does meiosis halve the chromosome number?", options: ["DNA is copied twice before division", "Sister chromatids separate in the first division", "Homologous chromosomes are separated in the first division", "Only one nuclear division takes place"], answer: "Homologous chromosomes are separated in the first division" },
      { question: "How many chromosomes are in a normal human gamete?", options: ["22", "23", "46", "92"], answer: "23" },
      { question: "Which process in meiosis increases genetic variation?", options: ["Replication of DNA", "Crossing over between homologous chromosomes", "Cytokinesis", "Formation of the spindle"], answer: "Crossing over between homologous chromosomes" },
      { question: "Uncontrolled cell division can result in the formation of what?", options: ["A zygote", "A gamete", "A spindle", "A tumour"], answer: "A tumour" },
      { question: "What does each chromosome consist of at the start of mitosis?", options: ["A single chromatid", "Two different homologous chromosomes", "Four chromatids", "Two identical sister chromatids joined at the centromere"], answer: "Two identical sister chromatids joined at the centromere" },
    ],
  },
  {
    topic: "Human transport and gas exchange",
    keywords: ["heart", "blood", "circulat*", "gas exchange", "lung", "alveol*", "respiration", "artery", "vein"],
    questions: [
      { question: "Which blood vessel carries oxygenated blood from the lungs to the heart?", options: ["The pulmonary artery", "The vena cava", "The pulmonary vein", "The aorta"], answer: "The pulmonary vein" },
      { question: "Which chamber of the heart has the thickest muscular wall?", options: ["The right atrium", "The left atrium", "The right ventricle", "The left ventricle"], answer: "The left ventricle" },
      { question: "Why are alveoli efficient for gas exchange?", options: ["They have thick walls that store oxygen", "They contain haemoglobin", "They have a large surface area and very thin walls", "They have no blood supply"], answer: "They have a large surface area and very thin walls" },
      { question: "What is the function of valves in veins?", options: ["To pump blood forwards", "To increase blood pressure", "To carry blood away from the heart", "To prevent the backflow of blood"], answer: "To prevent the backflow of blood" },
      { question: "Which blood component carries oxygen?", options: ["Platelets", "Red blood cells", "Phagocytes", "Lymphocytes"], answer: "Red blood cells" },
      { question: "Which type of blood vessel carries blood away from the heart at the highest pressure?", options: ["A vein", "A capillary", "A venule", "An artery"], answer: "An artery" },
      { question: "Where does blood flow from the right ventricle?", options: ["To the body through the aorta", "To the lungs through the pulmonary artery", "Directly to the left atrium", "Back to the right atrium"], answer: "To the lungs through the pulmonary artery" },
      { question: "Which gas is released as a waste product of aerobic respiration?", options: ["Oxygen", "Nitrogen", "Methane", "Carbon dioxide"], answer: "Carbon dioxide" },
      { question: "Why are capillary walls well adapted for exchange?", options: ["They are thick and muscular", "They are only one cell thick", "They contain valves", "They are made of cartilage"], answer: "They are only one cell thick" },
    ],
  },
  {
    topic: "Plant nutrition and transport",
    keywords: ["plant", "photosynth*", "xylem", "phloem", "transpir*", "leaf", "leaves", "stomata"],
    questions: [
      { question: "Which equation summarises photosynthesis?", options: ["glucose + oxygen -> carbon dioxide + water", "glucose -> ethanol + carbon dioxide", "carbon dioxide + water -> glucose + oxygen, in the presence of light", "water + oxygen -> glucose + carbon dioxide"], answer: "carbon dioxide + water -> glucose + oxygen, in the presence of light" },
      { question: "Which tissue transports water from the roots to the leaves?", options: ["Phloem", "Epidermis", "Palisade mesophyll", "Xylem"], answer: "Xylem" },
      { question: "Which tissue transports sucrose around a plant?", options: ["Xylem", "Phloem", "Guard cells", "Root hairs"], answer: "Phloem" },
      { question: "Where does most photosynthesis take place in a leaf?", options: ["In the upper epidermis", "In the xylem", "In the lower epidermis", "In the palisade mesophyll"], answer: "In the palisade mesophyll" },
      { question: "What is transpiration?", options: ["The movement of sucrose in the phloem", "The uptake of mineral ions by active transport", "The loss of water vapour from a plant, mainly through the stomata", "The release of oxygen during photosynthesis"], answer: "The loss of water vapour from a plant, mainly through the stomata" },
      { question: "Which change would increase the rate of transpiration?", options: ["A higher humidity", "Closed stomata", "A higher temperature", "A lower light intensity"], answer: "A higher temperature" },
      { question: "Which colours of light does chlorophyll absorb most strongly?", options: ["Green and yellow", "Green only", "Red and blue", "Infrared only"], answer: "Red and blue" },
      { question: "What is the function of a root hair cell?", options: ["To carry out photosynthesis", "To transport sucrose", "To control gas exchange", "To absorb water and mineral ions from the soil"], answer: "To absorb water and mineral ions from the soil" },
      { question: "Which of these can be a limiting factor for the rate of photosynthesis?", options: ["The colour of the pot", "The number of roots", "Light intensity", "The direction of the wind"], answer: "Light intensity" },
    ],
  },
  {
    topic: "Ecology and energy flow",
    keywords: ["ecolog*", "ecosystem", "food chain", "food web", "population", "energy flow", "carbon cycle", "habitat"],
    questions: [
      { question: "What do the arrows in a food chain represent?", options: ["The direction in which predators move", "The direction of energy flow", "The number of organisms", "The amount of waste produced"], answer: "The direction of energy flow" },
      { question: "Which organism is a producer?", options: ["A rabbit", "A fox", "Grass", "A bacterium that feeds on dead matter"], answer: "Grass" },
      { question: "Why are food chains rarely longer than five trophic levels?", options: ["Producers cannot be eaten", "Decomposers stop energy transfer", "The supply of carbon dioxide runs out", "Energy is lost at each trophic level"], answer: "Energy is lost at each trophic level" },
      { question: "Why are decomposers important in an ecosystem?", options: ["They break down dead organic matter and recycle nutrients", "They make food by photosynthesis", "They are always at the top of a food chain", "They prevent energy being lost as heat"], answer: "They break down dead organic matter and recycle nutrients" },
      { question: "What is a population?", options: ["All the organisms of one species living in an area", "All the organisms living in an area", "All the species in an ecosystem", "The physical environment of an area"], answer: "All the organisms of one species living in an area" },
      { question: "Which process removes carbon dioxide from the atmosphere?", options: ["Respiration", "Photosynthesis", "Combustion", "Decomposition"], answer: "Photosynthesis" },
      { question: "A single oak tree supports thousands of insects. Why might the pyramid of numbers look inverted?", options: ["The insects are producers", "Energy increases at each trophic level", "The producer is one very large organism", "Decomposers are missing"], answer: "The producer is one very large organism" },
      { question: "What is a habitat?", options: ["The place where an organism lives", "The role of an organism in an ecosystem", "A group of different populations", "The food an organism eats"], answer: "The place where an organism lives" },
    ],
  },
];

const MIXED_WORDS = /\b(biology|core|concepts?|mixed|all|general|revision|practice|paper|overview|full|random|everything|test|quick)\b/;

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const toSeed = (topic: string, item: BiologyMcq): BiologySeed => ({
  topic,
  type: "multiple_choice",
  question: item.question,
  options: item.options,
  marks: 1,
  modelAnswer: item.answer,
  markingCriteria: "Award full credit only for the correct option.",
});

/** Stems end in `*` (prefix match at a word start); other keywords match whole words, with an optional plural. */
function keywordMatches(text: string, keyword: string): boolean {
  const isStem = keyword.endsWith("*");
  const word = (isStem ? keyword.slice(0, -1) : keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${word}${isStem ? "" : "(?:s|es)?\\b"}`).test(text);
}

/** Topics whose keywords appear in the requested topic text; every topic for a generic request. */
export function matchBiologyTopics(topic: string): BiologyTopic[] {
  const text = topic.toLowerCase().trim();
  const hits = BIOLOGY_TOPICS.filter((entry) => entry.keywords.some((keyword) => keywordMatches(text, keyword)));
  if (hits.length) return hits;
  return !text || MIXED_WORDS.test(text) ? BIOLOGY_TOPICS : [];
}

/**
 * Questions for a Biology paper, or null when the topic is not covered (so callers show an honest
 * message rather than invented questions). A broad request is interleaved across topics so a short
 * paper samples the whole syllabus; every request is shuffled so a retake is not identical.
 */
export function biologyBank(topic: string): BiologySeed[] | null {
  const matched = matchBiologyTopics(topic);
  if (!matched.length) return null;
  const pools = matched.map((entry) => shuffled(entry.questions).map((item) => toSeed(entry.topic, item)));
  if (pools.length === 1) return pools[0];
  const order = shuffled(pools);
  const mixed: BiologySeed[] = [];
  for (let i = 0; order.some((pool) => i < pool.length); i += 1) {
    for (const pool of order) if (i < pool.length) mixed.push(pool[i]);
  }
  return mixed;
}
