/**
 * src/lib/exam/curated/english.ts
 *
 * Hand-authored English Language knowledge checks for ZIMSEC / Cambridge O-Level (Forms 1-4), in British English.
 *
 * IMPORTANT: ZIMSEC English Language (1122) has no multiple-choice paper. Paper 1 is composition (a free essay and a
 * guided essay: speech, report, letter or article). Paper 2 is reading: a comprehension passage with vocabulary and
 * inference questions, a summary, and short questions on register. These items check the language knowledge underneath
 * those papers (grammar, concord, punctuation, spelling, vocabulary, figures of speech, register and writing forms,
 * vocabulary in context). They do not replace writing practice, and essays and summaries still need a teacher or AI
 * to mark. All wording is original. O-Level only; not served for A-Level or for Literature.
 * Authored from standard usage. Intended for a teacher to review before being described as "verified".
 */
import { levelForDifficulty } from "../engine";
import { buildBank, matchTopics, mc, type CuratedSeed, type CuratedTopic } from "./bank";

export const ENGLISH_TOPICS: CuratedTopic[] = [
  {
    topic: "Parts of speech",
    keywords: ["parts of speech", "grammar", "noun*", "verb*", "adjective*", "adverb*", "pronoun*", "preposition*", "conjunction*", "interjection*"],
    questions: [
      mc("In the sentence 'The tall boy ran quickly', which word is the adverb?", "quickly", ["tall", "boy", "ran"]),
      mc("Which word is a collective noun?", "flock", ["happiness", "teacher", "Harare"]),
      mc("In 'Chipo gave the book to him', the word 'him' is a", "pronoun", ["noun", "verb", "preposition"]),
      mc("Which of these is an abstract noun?", "bravery", ["table", "river", "lion"]),
      mc("In 'She sings beautifully', the word 'beautifully' is an", "adverb", ["adjective", "noun", "pronoun"]),
      mc("Which word is the preposition in 'The cat jumped onto the roof'?", "onto", ["cat", "jumped", "roof"]),
      mc("Which word is the conjunction in 'I stayed home because it was raining'?", "because", ["stayed", "home", "raining"]),
      mc("In 'Wow! That was a great goal', the word 'Wow' is an", "interjection", ["adverb", "adjective", "conjunction"]),
      mc("Which of these is a proper noun?", "Zambezi", ["river", "country", "mountain"]),
      mc("In 'the red car', the word 'red' is an", "adjective", ["adverb", "verb", "noun"]),
      mc("Which word is the verb in 'The children play in the garden'?", "play", ["children", "in", "garden"]),
    ],
  },
  {
    topic: "Tenses and verb forms",
    keywords: ["tense*", "grammar", "verb form*", "past participle*", "irregular verb*", "present perfect", "past perfect"],
    questions: [
      mc("Choose the correct word: 'Yesterday, she ___ to the market.'", "went", ["goed", "gone", "go"]),
      mc("Choose the correct word: 'She has ___ the window.'", "broken", ["broke", "breaked", "breaking"]),
      mc("Which sentence is in the present perfect tense?", "They have arrived.", ["They arrived.", "They are arriving.", "They will arrive."]),
      mc("Which sentence is in the future tense?", "We will visit Bulawayo next week.", ["We visited Bulawayo last week.", "We visit Bulawayo every week.", "We have visited Bulawayo."]),
      mc("Choose the correct words: 'By the time we arrived, the film ___.'", "had started", ["has started", "starts", "will start"]),
      mc("Choose the correct words: 'Right now, he ___ football in the yard.'", "is playing", ["plays", "play", "has played"]),
      mc("Choose the correct word: 'She ___ been waiting for an hour.'", "has", ["have", "is", "do"]),
      mc("Choose the correct word: 'The window was ___ by the storm.'", "broken", ["broke", "break", "breaking"]),
      mc("What is the past participle of 'write'?", "written", ["wrote", "writed", "writing"]),
      mc("What is the past tense of 'teach'?", "taught", ["teached", "tought", "teaches"]),
    ],
  },
  {
    topic: "Concord (subject and verb agreement)",
    keywords: ["concord", "agreement", "grammar", "subject and verb", "subject-verb"],
    questions: [
      mc("Choose the correct word: 'Each of the girls ___ a bag.'", "has", ["have", "are", "were"]),
      mc("Choose the correct word: 'Neither the teacher nor the students ___ present.'", "were", ["was", "is", "has been"]),
      mc("Choose the correct word: 'The boys, together with their coach, ___ travelling to Gweru.'", "are", ["is", "was", "has"]),
      mc("Choose the correct word: 'Everyone ___ invited to the party.'", "is", ["are", "were", "be"]),
      mc("Which sentence has the correct verb after the noun 'news'?", "The news is good.", ["The news are good.", "The news were good.", "The news have been good."]),
      mc("Choose the correct word: 'Mathematics ___ my favourite subject.'", "is", ["are", "were", "have"]),
      mc("Choose the correct word: 'The number of students ___ increasing.'", "is", ["are", "were", "have been"]),
      mc("Choose the correct word: 'A number of students ___ absent today.'", "are", ["is", "was", "has"]),
      mc("Which sentence has the correct verb after 'neither of'?", "Neither of the answers is correct.", ["Neither of the answers are correct.", "Neither of the answers were correct.", "Neither of the answers have been correct."]),
      mc("Choose the correct word: 'My friends and I ___ going to the match.'", "are", ["is", "am", "was"]),
    ],
  },
  {
    topic: "Sentences and paragraphs",
    keywords: ["sentence*", "clause*", "phrase*", "paragraph*", "grammar", "sentence structure", "topic sentence*"],
    questions: [
      mc("A group of words with its own subject and verb, forming part of a sentence, is called a", "clause", ["phrase", "paragraph", "syllable"]),
      mc("Which sentence is a complex sentence?", "Although it was raining, we played outside.", ["We played outside.", "It rained.", "We played outside and then went home."]),
      mc("Which sentence is a compound sentence?", "I wanted to go, but it was late.", ["Because it was late, I stayed.", "I went home.", "When he arrived, we left."]),
      mc("A sentence that gives a command is called", "imperative", ["interrogative", "declarative", "exclamatory"]),
      mc("Which sentence is exclamatory?", "What a beautiful day it is!", ["The day is beautiful.", "Is the day beautiful?", "Open the window."]),
      mc("The word group 'in the morning' is a", "phrase", ["clause", "sentence", "paragraph"]),
      mc("In 'The dog barked', what is the subject?", "The dog", ["barked", "The", "dog barked"]),
      mc("What does a topic sentence do in a paragraph?", "States the main idea of the paragraph", ["Ends the paragraph", "Gives the title of the essay", "Lists the writer's sources"]),
      mc("A sentence fragment is", "an incomplete sentence", ["a very long sentence", "a sentence with two verbs", "a question without a mark"]),
      mc("Which sentence contains a relative clause?", "The girl who won the race is my cousin.", ["The girl won the race.", "Run quickly to school.", "What a good race that was!"]),
    ],
  },
  {
    topic: "Voice, reported speech and conditionals",
    keywords: ["active and passive", "passive", "active voice", "reported speech", "indirect speech", "conditional*", "grammar"],
    questions: [
      mc("Change to the passive: 'The farmer planted the maize.'", "The maize was planted by the farmer.", ["The maize planted the farmer.", "The maize is planted by the farmer.", "The farmer was planted by the maize."]),
      mc("Which sentence is in the active voice?", "The girl wrote the letter.", ["The letter was written by the girl.", "The letter has been written.", "The letter is being written."]),
      mc("Report the speech: 'I am tired,' said Tino.", "Tino said that he was tired.", ["Tino said that I am tired.", "Tino said that he is tired yesterday.", "Tino said he were tired."]),
      mc("Report the question: 'Where do you live?' she asked me.", "She asked me where I lived.", ["She asked me where do I live.", "She asked me where did I live.", "She asked me where you lived."]),
      mc("Which sentence is a correct first conditional?", "If it rains, we will stay indoors.", ["If it will rain, we stay indoors.", "If it rained, we will stay indoors.", "If it rains, we would stay indoors."]),
      mc("Complete the sentence: 'If I had studied harder, I ___ the test.'", "would have passed", ["will pass", "would pass", "passed"]),
      mc("Which sentence is a correct second conditional?", "If I won a prize, I would share it.", ["If I win a prize, I would share it.", "If I had won a prize, I will share it.", "If I would win a prize, I share it."]),
      mc("In reported speech, 'tomorrow' usually changes to", "the next day", ["yesterday", "today", "last day"]),
      mc("Change to the passive: 'They are repairing the road.'", "The road is being repaired.", ["The road was repaired.", "The road is repaired by them being.", "The road has been repairing."]),
      mc("Report the speech: 'I will come early,' Rudo said.", "Rudo said that she would come early.", ["Rudo said that she will come early.", "Rudo said that I would come early.", "Rudo said she is coming early."]),
    ],
  },
  {
    topic: "Punctuation and capital letters",
    keywords: ["punctuation", "comma*", "apostrophe*", "semicolon*", "colon*", "hyphen*", "capital letter*", "capitalisation"],
    questions: [
      mc("Which sentence punctuates the extra information about the brother correctly?", "My brother, who lives in Mutare, is a nurse.", ["My brother who lives in Mutare, is a nurse.", "My brother, who lives in Mutare is a nurse.", "My brother who, lives in Mutare is a nurse."]),
      mc("Which sentence uses the apostrophe and the comma correctly?", "It's raining, so we are staying inside.", ["Its raining so we are staying inside.", "It's raining so, we are staying inside.", "Its' raining, so we are staying inside."]),
      mc("Which phrase correctly shows books that belong to several students?", "the students' books", ["the student's books", "the students books", "the studen'ts books"]),
      mc("Which sentence uses a semicolon correctly?", "I like tea; my sister prefers coffee.", ["I like; tea my sister prefers coffee.", "I like tea; and coffee.", "I like tea my; sister prefers coffee."]),
      mc("Which punctuation mark usually introduces a list after a complete statement?", "A colon", ["A comma", "An apostrophe", "A hyphen"]),
      mc("Which is the correct short form of 'they are'?", "they're", ["their", "theyre", "the're"]),
      mc("Which sentence uses capital letters correctly?", "On Monday, we visited Lake Kariba.", ["on monday, we visited lake Kariba.", "On monday, we visited Lake kariba.", "On Monday, we visited lake kariba."]),
      mc("What is the main use of a hyphen?", "To join words or to split a word at the end of a line", ["To end a sentence", "To show a question", "To show ownership"]),
      mc("Which sentence uses commas correctly in a list?", "We bought maize, beans, rice and salt.", ["We bought, maize beans, rice and salt.", "We bought maize beans rice, and, salt.", "We, bought maize, beans rice and salt."]),
      mc("What does an exclamation mark show?", "Strong feeling or emphasis", ["A pause", "A question", "A list"]),
    ],
  },
  {
    topic: "Spelling and commonly confused words",
    keywords: ["spelling*", "commonly confused", "homophone*", "confused words", "their", "there", "affect", "effect", "principal", "principle"],
    questions: [
      mc("Choose the correct word: 'The dog wagged ___ tail.'", "its", ["it's", "its'", "it is"]),
      mc("Choose the correct word: '___ going to be late.'", "They're", ["Their", "There", "Thier"]),
      mc("Choose the correct word: 'Put the books over ___.'", "there", ["their", "they're", "thare"]),
      mc("Choose the correct word: 'The new rule will ___ everyone.'", "affect", ["effect", "affet", "afect"]),
      mc("Choose the correct word: 'The medicine had a good ___ on him.'", "effect", ["affect", "afect", "efect"]),
      mc("Choose the correct word: 'The school ___ gave a speech.'", "principal", ["principle", "principel", "princeple"]),
      mc("Choose the correct word: 'Honesty is a good ___.'", "principle", ["principal", "principel", "princeple"]),
      mc("Choose the correct word: 'Regular ___ makes perfect.'", "practice", ["practise", "practis", "practize"]),
      mc("Choose the correct spelling of the word meaning 'apart or divided'.", "separate", ["seperate", "separete", "seprate"]),
      mc("Choose the correct spelling of the word meaning 'needed or required'.", "necessary", ["neccessary", "necesary", "neccesary"]),
      mc("Choose the correct word: 'She is taller ___ her brother.'", "than", ["then", "thon", "that"]),
      mc("Choose the correct word: 'It is ___ hot to play outside.'", "too", ["to", "two", "tue"]),
      mc("Choose the correct spelling of the word meaning 'without any doubt'.", "definitely", ["definately", "definitly", "defanitely"]),
      mc("Choose the correct spelling of the past tense of 'occur'.", "occurred", ["occured", "ocurred", "occurd"]),
    ],
  },
  {
    topic: "Vocabulary, idioms and proverbs",
    keywords: ["vocabulary", "synonym*", "antonym*", "prefix*", "suffix*", "idiom*", "proverb*", "meaning of words", "word meaning*"],
    questions: [
      mc("Which word is closest in meaning to 'abundant'?", "plentiful", ["scarce", "tiny", "silent"]),
      mc("Which word is opposite in meaning to 'generous'?", "stingy", ["kind", "giving", "wealthy"]),
      mc("The prefix 'un-' in 'unhappy' means", "not", ["again", "before", "too much"]),
      mc("The prefix 're-' in 'rewrite' means", "again", ["not", "against", "below"]),
      mc("The suffix '-less' in 'hopeless' means", "without", ["full of", "able to", "more than"]),
      mc("What does the idiom 'to spill the beans' mean?", "to reveal a secret", ["to cook a meal", "to waste food", "to make a mess"]),
      mc("What does the idiom 'a piece of cake' mean?", "something very easy", ["a sweet snack", "a small gift", "something dangerous"]),
      mc("What does the idiom 'to break the ice' mean?", "to start a conversation in an awkward situation", ["to damage a freezer", "to stop a fight", "to cool a drink"]),
      mc("The proverb 'Too many cooks spoil the broth' warns that", "too many people working on a task can ruin it", ["cooking should be avoided", "broth is hard to make", "cooks are lazy"]),
      mc("The proverb 'A stitch in time saves nine' means", "fixing a small problem early prevents a bigger one", ["sewing is quick", "nine is a lucky number", "clothes tear often"]),
      mc("Which word means the same as 'reluctant'?", "unwilling", ["eager", "careless", "excited"]),
      mc("Which word is the antonym of 'ancient'?", "modern", ["old", "historic", "broken"]),
      mc("A word with the same meaning as another word is called a", "synonym", ["antonym", "homophone", "acronym"]),
      mc("Which pair are homophones?", "meet and meat", ["big and large", "hot and cold", "run and ran"]),
    ],
  },
  {
    topic: "Figures of speech",
    keywords: ["figures of speech", "figurative language", "simile*", "metaphor*", "personification", "hyperbole", "onomatopoeia", "alliteration", "oxymoron*", "irony"],
    questions: [
      mc("'Her smile was as bright as the sun.' This is a", "simile", ["metaphor", "hyperbole", "irony"]),
      mc("'Time is a thief.' This is a", "metaphor", ["simile", "onomatopoeia", "alliteration"]),
      mc("'The wind whispered through the trees.' This is an example of", "personification", ["simile", "hyperbole", "oxymoron"]),
      mc("'I have told you a million times!' is an example of", "hyperbole", ["understatement", "simile", "metaphor"]),
      mc("The sound words 'buzz' and 'crash' are examples of", "onomatopoeia", ["alliteration", "oxymoron", "irony"]),
      mc("'Peter picked a peck of pickled peppers' uses", "alliteration", ["onomatopoeia", "personification", "metaphor"]),
      mc("'Deafening silence' is an example of", "an oxymoron", ["a simile", "an idiom", "alliteration"]),
      mc("A fire station burning down is an example of", "irony", ["simile", "alliteration", "personification"]),
      mc("What is the effect of figurative language in writing?", "It creates vivid pictures and strong feeling", ["It shortens the text", "It makes facts more exact", "It replaces punctuation"]),
      mc("'The classroom was a zoo.' Which device is used?", "Metaphor", ["Simile", "Onomatopoeia", "Hyperbole"]),
    ],
  },
  {
    topic: "Register and writing forms",
    keywords: ["register", "formal*", "informal*", "letter*", "speech*", "report*", "article*", "writing forms", "tone", "guided composition", "guided essay"],
    questions: [
      mc("Which phrase is most suitable in a formal letter to a headmaster?", "I am writing to request permission to", ["Hey, can I please", "What's up, sir? I want to", "Guess what I want to"]),
      mc("Which closing goes with a formal letter that begins 'Dear Sir'?", "Yours faithfully", ["Yours sincerely", "Your loving friend", "Cheers"]),
      mc("Which closing goes with a letter that begins 'Dear Mrs Dube'?", "Yours sincerely", ["Yours faithfully", "Best wishes always", "See you"]),
      mc("Which greeting suits an informal letter to a friend?", "Dear Tafara,", ["Dear Sir,", "To whom it may concern,", "Honourable Minister,"]),
      mc("Which of these is informal language?", "I'm gonna get some food.", ["I intend to purchase some food.", "Kindly provide the information.", "We regret to inform you."]),
      mc("A speech to a school assembly should usually begin by", "greeting the audience", ["signing with 'Yours faithfully'", "listing page numbers", "giving a bibliography"]),
      mc("Which feature belongs in a report?", "A heading and clear sections such as introduction and findings", ["A greeting such as 'Dear friend'", "Lines of rhyming verse", "A closing like 'Your pal'"]),
      mc("Which feature is typical of a magazine article?", "An eye-catching headline and a lively style", ["A formal salutation and sign-off", "Stage directions", "Numbered legal clauses"]),
      mc("In writing, register means", "the style of language that suits a situation or audience", ["a list of student names", "the spelling of a word", "the length of a sentence"]),
      mc("Which is the most formal word?", "purchase", ["buy", "grab", "get"]),
      mc("Which sentence is written in a formal register?", "We would appreciate a prompt reply.", ["Write back quick, okay?", "Hurry up and answer!", "Reply when you feel like it."]),
      mc("Which tone is best for a letter to a newspaper editor?", "Polite and formal", ["Rude and angry", "Joking and full of slang", "Secretive"]),
    ],
  },
  {
    topic: "Essay types and summary skills",
    keywords: ["essay*", "composition*", "summary", "summarising", "narrative", "descriptive", "argumentative", "expository", "proofreading", "planning an essay"],
    questions: [
      mc("A descriptive essay mainly", "paints a picture of a person, place or event using the senses", ["argues for and against an issue", "lists the steps of a process only", "sets out numbered rules"]),
      mc("A narrative essay", "tells a story with a beginning, a middle and an end", ["lists the pros and cons of a policy", "describes scenery without any events", "gives an outline for a speech"]),
      mc("An argumentative essay", "gives reasons for a point of view and considers other views", ["tells a story", "describes a scene", "gives a recipe"]),
      mc("An expository essay", "explains or discusses an idea or topic clearly", ["tells a ghost story", "copies a poem", "describes a dream only"]),
      mc("The main point of each paragraph is usually found in", "a topic sentence", ["the title page", "a footnote", "the last word only"]),
      mc("A good conclusion", "sums up the main points without adding many new ideas", ["introduces a new topic", "repeats the whole essay word for word", "stops in the middle of an idea"]),
      mc("What should a summary contain?", "The main points in your own words", ["Every detail of the passage", "Your opinion about the writer", "Only the first paragraph"]),
      mc("In a summary you should avoid", "copying long phrases straight from the passage", ["using your own words", "keeping to the word limit", "including only the main points"]),
      mc("Why is planning an essay useful?", "It helps you organise ideas before you write", ["It makes the essay longer by repeating ideas", "It replaces proofreading", "It removes the need for paragraphs"]),
      mc("Proofreading is done to", "check and correct mistakes in spelling, punctuation and grammar", ["add more paragraphs", "change the topic", "copy another essay"]),
    ],
  },
  {
    topic: "Vocabulary in context",
    keywords: ["vocabulary in context", "comprehension", "inference*", "reading", "context clue*", "tone and mood", "passage*"],
    questions: [
      mc("Read: 'Tendai's footsteps were hesitant, as if the floor might give way.' What does 'hesitant' suggest?", "He was unsure and cautious", ["He was running fast", "He was angry", "He was very happy"]),
      mc("Read: 'The prices rose steadily, and by June the shop owner was struggling to cope.' What can we infer?", "The shop owner was finding it hard to manage the higher prices", ["The shop owner was getting rich", "Prices fell in June", "The shop was closed all year"]),
      mc("Read: 'She glared at the clock, tapping her foot, while the bus still did not come.' How does she feel?", "Impatient", ["Relaxed", "Amused", "Sleepy"]),
      mc("Read: 'The old well had been abandoned for years.' The word 'abandoned' means", "left empty and no longer used", ["newly built", "very deep", "full of water"]),
      mc("Read: 'Though the road was rough, the driver pressed on.' 'Pressed on' means", "continued", ["stopped", "turned back", "complained"]),
      mc("Read: 'The crowd erupted in cheers when the final whistle blew.' The word 'erupted' suggests", "a sudden burst of noise", ["a slow quiet murmur", "a long silence", "a gentle whisper"]),
      mc("Read: 'He spoke in a hushed voice so that nobody would hear.' 'Hushed' means", "very quiet", ["loud", "angry", "slow"]),
      mc("A writer says a character 'beamed' at the news. This means the character", "smiled broadly with joy", ["frowned", "shouted", "fell asleep"]),
      mc("Read: 'Her explanation was so convoluted that no one understood it.' 'Convoluted' means", "complicated and hard to follow", ["short and clear", "funny", "polite"]),
      mc("In 'The scientist's findings were conclusive', the word 'conclusive' means", "leaving no doubt", ["uncertain", "incomplete", "old-fashioned"]),
    ],
  },
];

const GENERIC_WORDS = /\b(english|language|core|concepts?|mixed|all|general|revision|practice|paper|overview|full|random|everything|test|quick)\b/;

/** Topics whose keywords appear in the requested topic text; every topic for a broad request. */
export const matchEnglishTopics = (topic: string): CuratedTopic[] => matchTopics(ENGLISH_TOPICS, topic, GENERIC_WORDS);

/**
 * Questions for an English Language paper, or null when the topic is not covered or the learner is on A-Level
 * (these are O-Level knowledge checks and would be below the level).
 */
export function englishBank(topic: string, difficulty?: string): CuratedSeed[] | null {
  if (levelForDifficulty(difficulty) === "alevel") return null;
  return buildBank(ENGLISH_TOPICS, topic, GENERIC_WORDS);
}
