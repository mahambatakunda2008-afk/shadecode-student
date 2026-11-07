/**
 * src/lib/exam/curated/history.ts
 *
 * Hand-authored History knowledge-check questions for ZIMSEC / Cambridge O-Level (Forms 1-4).
 * Topics follow the Ministry of Primary and Secondary Education History syllabus (Forms 5-6 lists 19 topics that
 * build on Forms 1-4): sources of history, pre-colonial societies and states, early foreign contacts and the slave
 * trade, imperialism and the occupation of Zimbabwe, the First and Second Chimurenga / Umvukela, colonial rule,
 * post-independence developments and the Constitution, other African resistance movements, the French Revolution,
 * nationalism in Europe, the two World Wars, fascism, the communist revolutions and regional / international bodies.
 *
 * IMPORTANT: ZIMSEC History papers are ESSAYS. These multiple-choice items are retrieval practice for the facts
 * (names, dates, causes, effects) that good essays rest on. They do not replace essay practice, and essay marking
 * still needs a teacher or AI. All wording is original. O-Level only; not served for A-Level.
 * Authored from standard textbook facts. Intended for a teacher to review before being described as "verified".
 */
import { levelForDifficulty } from "../engine";
import { buildBank, matchTopics, mc, ordered, type CuratedSeed, type CuratedTopic } from "./bank";

export const HISTORY_TOPICS: CuratedTopic[] = [
  {
    topic: "Sources of history",
    keywords: ["source*", "oral tradition*", "oral history", "archaeolog*", "primary source*", "secondary source*", "historical evidence"],
    questions: [
      mc("Which source of history is passed down by word of mouth from one generation to the next?", "Oral tradition", ["Archaeology", "Written records", "Photographs"]),
      mc("Digging up and studying objects such as pottery and tools is called", "archaeology", ["oral history", "propaganda", "map-making"]),
      mc("A weakness of oral tradition as a source is that", "details can change or be forgotten as it is retold", ["it is always written down", "it cannot describe the past", "it is never used by historians"]),
      mc("A diary written by a person who saw the events happen is", "a primary source", ["a secondary source", "a legend", "a modern textbook"]),
      mc("A textbook written many years later by someone who did not witness the events is", "a secondary source", ["a primary source", "an oral tradition", "a rock painting"]),
      mc("Rock paintings left by the San are an example of", "visual evidence", ["a written treaty", "a newspaper report", "a census record"]),
      mc("Why must historians check whether a source is biased?", "The writer may show only one point of view", ["All sources are identical", "A biased source can never be used", "Only very old sources are true"]),
    ],
  },
  {
    topic: "Pre-colonial societies and states",
    keywords: ["pre-colonial", "precolonial", "pre colonial", "great zimbabwe", "mutapa", "rozvi", "torwa", "ndebele", "bantu", "san", "khoi-khoi", "khoikhoi", "mapungubwe", "mzilikazi", "history of zimbabwe", "regional and international history"],
    questions: [
      mc("The San of Southern Africa lived mainly by", "hunting and gathering", ["growing maize on large farms", "mining iron for export", "trading ivory by ship"]),
      mc("Which group is famous for rock paintings found in Zimbabwe's caves and shelters?", "The San", ["The Portuguese", "The Rozvi", "The Zulu"]),
      mc("The Khoi-Khoi were mainly", "herders of cattle and sheep", ["fishers on the coast only", "city builders", "gold miners"]),
      mc("Bantu-speaking peoples are believed to have spread into Southern Africa from", "West and Central Africa", ["Europe", "Asia", "North America"]),
      mc("Which skills helped Bantu-speaking farmers settle and spread across Southern Africa?", "Iron-working and farming", ["Printing and banking", "Gunpowder making", "Ocean sailing"]),
      mc("The name Zimbabwe comes from a Shona phrase meaning", "houses of stone", ["land of gold", "great river", "place of kings"]),
      mc("Great Zimbabwe was built and used mainly between the", "11th and 15th centuries", ["1st and 3rd centuries", "17th and 18th centuries", "19th and 20th centuries"]),
      mc("Which activities helped Great Zimbabwe become rich and powerful?", "Cattle keeping and trade in gold and ivory", ["Making cars and radios", "Printing books", "Building railways"]),
      mc("The Mutapa state was centred on", "the Zambezi valley and northern Zimbabwe", ["the Atlantic coast of West Africa", "the Cape Peninsula", "the Sahara"]),
      mc("Which ruler founded the Rozvi state and drove the Portuguese off the plateau in the late 1600s?", "Changamire Dombo", ["Lobengula", "Mzilikazi", "Shaka"]),
      mc("Which leader brought the Ndebele into south-western Zimbabwe around 1840?", "Mzilikazi", ["Shaka", "Lobengula", "Soshangane"]),
      mc("Who became Ndebele king after Mzilikazi?", "Lobengula", ["Shaka", "Dingane", "Changamire"]),
      mc("Mapungubwe was an early state near which river?", "The Limpopo", ["The Nile", "The Congo", "The Niger"]),
      mc("Which pair of factors helped to bring down pre-colonial states?", "Internal rivalry and attacks from outside", ["Too much rainfall for centuries", "The invention of the telephone", "A ban on all trade"]),
    ],
  },
  {
    topic: "Early foreign contacts and the slave trade",
    keywords: ["foreign contact*", "early contact*", "slave trade", "slavery", "abolition", "legitimate trade", "missionar*", "portuguese", "opobo", "early foreign contacts"],
    questions: [
      mc("Which European country traded along the east African coast and in the Zambezi valley from the 1500s?", "Portugal", ["Germany", "Belgium", "Russia"]),
      mc("The Inyati Mission, set up in 1859, was among the Ndebele and was founded by missionaries of the", "London Missionary Society", ["Berlin Missionary Society", "British South Africa Company", "League of Nations"]),
      mc("Which hunter and guide later helped the Pioneer Column in 1890?", "Frederick Selous", ["David Livingstone", "Mungo Park", "Henry Morton Stanley"]),
      mc("Concession seekers visited King Lobengula mainly to obtain", "rights to mine minerals or use land", ["permission to build schools only", "free grain", "the right to name rivers"]),
      ordered("Britain made the slave trade illegal in", ["1707", "1807", "1857", "1907"], "1807"),
      mc("Which was a main reason for Britain ending the slave trade?", "Pressure from the anti-slavery movement and changing economic interests", ["A shortage of ships", "A ban by African kings", "The invention of the aeroplane"]),
      mc("Trade in goods such as palm oil and groundnuts that replaced the slave trade was called", "legitimate trade", ["triangular trade", "barter in slaves", "the Silk Road"]),
      mc("King Jaja of Opobo became powerful by", "controlling the palm oil trade", ["leading the Pioneer Column", "signing the Rudd Concession", "hosting the Berlin Conference"]),
      mc("Which product was a leading export of West Africa during legitimate trade?", "Palm oil", ["Wool", "Tea", "Sugar beet"]),
    ],
  },
  {
    topic: "Scramble for Africa and the occupation of Zimbabwe",
    keywords: ["scramble", "partition", "berlin conference", "imperialism", "colonis*", "occupation", "rudd", "pioneer column", "royal charter", "lobengula", "anglo-ndebele", "matabele war", "history of zimbabwe", "regional and international history"],
    questions: [
      mc("The Berlin Conference of 1884-85 was held to", "set rules for European claims in Africa", ["end the slave trade in Brazil", "plan African independence", "create the League of Nations"]),
      mc("At the Berlin Conference, which principle said a power had to actually control an area to claim it?", "Effective occupation", ["Divine right", "Indirect rule", "Self-determination"]),
      mc("The Rudd Concession of 1888 gave Charles Rudd and his partners", "mining rights in Lobengula's kingdom", ["control of Great Zimbabwe", "a port in Mozambique", "the right to rule Europe"]),
      mc("The company led by Cecil Rhodes that occupied Zimbabwe was the", "British South Africa Company", ["East India Company", "Royal Niger Company", "Hudson's Bay Company"]),
      ordered("The British South Africa Company received its Royal Charter in", ["1869", "1879", "1889", "1899"], "1889"),
      ordered("The Pioneer Column entered Mashonaland in", ["1870", "1880", "1890", "1900"], "1890"),
      mc("Where did the Pioneer Column raise the Union Jack in 1890?", "Fort Salisbury (now Harare)", ["Bulawayo", "Great Zimbabwe", "Victoria Falls"]),
      mc("Which two sides fought in the Anglo-Ndebele War of 1893-94?", "The Ndebele and the British South Africa Company", ["The Shona and the Portuguese", "The Zulu and the Boers", "The Rozvi and the Mutapa"]),
      mc("Who was the Ndebele king during the Anglo-Ndebele War?", "Lobengula", ["Mzilikazi", "Shaka", "Dingane"]),
      mc("One major result of the Anglo-Ndebele War was that", "Ndebele power was broken and the Company took control of Matabeleland", ["the Ndebele conquered Mashonaland", "Britain left Zimbabwe", "Zimbabwe became independent"]),
      mc("Which of these was a reason for colonising Zimbabwe?", "Hopes of finding gold and fertile land", ["A wish to spread printing", "Zimbabwe's long coastline and ports", "Zimbabwe's large oil fields"]),
    ],
  },
  {
    topic: "First Chimurenga / Umvukela",
    keywords: ["first chimurenga", "first umvukela", "chimurenga", "umvukela", "1896", "nehanda", "kaguvi", "kagubi", "spirit medium*", "history of zimbabwe"],
    questions: [
      ordered("The First Chimurenga / Umvukela took place in", ["1873-74", "1886-87", "1896-97", "1923-24"], "1896-97"),
      mc("Which spirit medium is closely linked with the First Chimurenga in Mashonaland?", "Mbuya Nehanda", ["Queen Victoria", "Cecil Rhodes", "Lord Carrington"]),
      mc("Sekuru Kaguvi (Kagubi) and Mbuya Nehanda were", "spirit mediums who helped inspire and lead the rising", ["British generals", "Portuguese traders", "missionaries who opposed the rising"]),
      mc("One cause of the First Chimurenga was", "loss of land and cattle and forced labour under the Company", ["generous Company wages and gifts of land", "a treaty that gave Africans the vote", "free schools for every village"]),
      mc("Why was the rising of 1896-97 defeated?", "The Company had better weapons and the African groups were not fully united", ["The Africans refused to fight", "Britain gave up Zimbabwe", "The rising had no leaders at all"]),
      mc("Mbuya Nehanda is remembered for", "inspiring resistance to colonial rule; she was later executed by the authorities", ["signing the Rudd Concession", "leading the Pioneer Column", "writing the Berlin Act"]),
      mc("The Ndebele word Umvukela means", "uprising", ["agreement", "harvest", "migration"]),
      mc("The Shona word Chimurenga refers to", "a struggle or uprising against oppression", ["a harvest festival", "a trading route", "a type of tax"]),
    ],
  },
  {
    topic: "Colonial rule in Rhodesia",
    keywords: ["colonial*", "rhodesia", "company rule", "settler*", "land apportionment", "land husbandry", "udi", "unilateral declaration", "federation", "ian smith", "sanctions", "segregation", "history of zimbabwe"],
    questions: [
      ordered("Company rule in Zimbabwe lasted from 1890 until", ["1893", "1913", "1923", "1953"], "1923"),
      mc("In 1923 Southern Rhodesia became", "a self-governing British colony under white settler rule", ["an independent republic", "a Portuguese colony", "a United Nations trust territory"]),
      mc("The Land Apportionment Act of 1930", "divided land into separate areas for Europeans and Africans", ["gave all land back to Africans", "abolished taxes", "created national parks only"]),
      mc("The Land Husbandry Act of 1951 pushed many Africans to", "cut their livestock and farm smaller, fixed plots", ["farm larger commercial estates", "move to Britain", "stop paying taxes"]),
      mc("Which taxes pushed many African men to seek paid work for Europeans?", "The hut tax and poll tax", ["Value-added tax", "Airport tax", "Tourist tax"]),
      ordered("The Federation of Rhodesia and Nyasaland ended in", ["1943", "1958", "1963", "1968"], "1963"),
      ordered("Ian Smith's Unilateral Declaration of Independence (UDI) was made in", ["1953", "1960", "1965", "1980"], "1965"),
      mc("What was the aim of UDI?", "To keep white minority rule and avoid African majority rule", ["To give Africans the vote", "To hand power to Britain", "To join the United Nations"]),
      mc("After UDI, the United Nations responded by", "imposing sanctions on Rhodesia", ["sending troops to rule the country", "recognising Smith's government", "buying more Rhodesian goods"]),
    ],
  },
  {
    topic: "African nationalism and the Second Chimurenga",
    keywords: ["second chimurenga", "second umvukela", "chimurenga", "umvukela", "nationalis*", "liberation", "zanu*", "zapu", "zanla", "zipra", "lancaster house", "armed struggle", "chinhoyi", "sinoia", "independence", "history of zimbabwe"],
    questions: [
      mc("Which two nationalist parties led the liberation struggle in Zimbabwe?", "ZAPU and ZANU", ["ZANU-PF and the MDC", "BSAC and the Federal Party", "ZESA and ZBC"]),
      mc("ZAPU was led by", "Joshua Nkomo", ["Robert Mugabe", "Abel Muzorewa", "Ian Smith"]),
      ordered("ZANU was formed in", ["1957", "1961", "1963", "1975"], "1963"),
      mc("The armed wings of ZANU and ZAPU were", "ZANLA and ZIPRA", ["ZANU and SADC", "ZBC and ZESA", "UNITA and MPLA"]),
      mc("The Battle of Chinhoyi (Sinoia) in 1966 is remembered as", "the start of the armed phase of the Second Chimurenga", ["the end of the war", "the signing of independence", "the arrival of the Pioneer Column"]),
      mc("Which neighbouring country hosted ZANLA bases after it became independent in 1975?", "Mozambique", ["Namibia", "Madagascar", "Egypt"]),
      mc("Which neighbouring country hosted ZIPRA bases and supported the struggle?", "Zambia", ["Ethiopia", "Mali", "Sudan"]),
      mc("The Lancaster House Conference was held in", "London, in 1979", ["Harare, in 1965", "Lusaka, in 1980", "Pretoria, in 1968"]),
      mc("The Lancaster House Agreement led to", "a ceasefire and elections that brought independence in 1980", ["the start of UDI", "the end of the Federation", "a one-party state in 1965"]),
      mc("Zimbabwe became independent on", "18 April 1980", ["11 November 1965", "22 December 1987", "1 January 1963"]),
      mc("Who was the first Prime Minister of independent Zimbabwe?", "Robert Mugabe", ["Joshua Nkomo", "Ian Smith", "Abel Muzorewa"]),
    ],
  },
  {
    topic: "Zimbabwe since independence",
    keywords: ["post-independence", "reconciliation", "unity accord", "growth with equity", "land reform", "land acquisition", "fast track", "third chimurenga", "indigenis*", "empowerment", "constitution*", "democracy", "human rights", "executive", "legislature", "judiciary", "history of zimbabwe"],
    questions: [
      mc("After independence, the policy of reconciliation aimed to", "unite black and white Zimbabweans and avoid revenge", ["expel all settlers", "close all schools", "end the use of English"]),
      mc("The Unity Accord of 1987 joined", "ZANU and ZAPU", ["ZANU and the MDC", "ZAPU and UANC", "SADC and the AU"]),
      mc("Growth with Equity (1981) was", "a government economic policy statement", ["a peace treaty", "a trade union", "a constitution"]),
      mc("A major social achievement after 1980 was", "the rapid expansion of schools and clinics", ["closing universities", "ending health services in rural areas", "banning education for girls"]),
      mc("The Land Acquisition Act of 1992 allowed government to", "acquire land compulsorily for resettlement", ["sell state land to foreign companies", "return all land to Britain", "ban farming"]),
      ordered("The Fast Track Land Reform Programme, also called the Third Chimurenga, began in", ["1980", "1990", "2000", "2010"], "2000"),
      mc("Indigenisation policies aim to", "increase ownership of businesses and resources by Zimbabweans", ["bring in more foreign owners", "stop all trade", "close all companies"]),
      mc("The Constitution of Zimbabwe is", "the supreme law of the country", ["an ordinary law that Parliament may ignore", "a trade agreement", "a treaty between Britain and Zimbabwe"]),
      mc("The three arms of government are the executive, the legislature and the", "judiciary", ["army", "civil service", "police"]),
      mc("Which arm of government makes laws?", "The legislature (Parliament)", ["The judiciary", "The police", "The army"]),
      mc("Which arm of government interprets the law in the courts?", "The judiciary", ["The legislature", "The executive", "The civil service"]),
      mc("Which of these is a human right protected by the Constitution?", "The right to life", ["The right to rule without elections", "The right to ignore the law", "The right to take other people's property"]),
    ],
  },
  {
    topic: "Resistance and liberation in other African countries",
    keywords: ["ethiopia*", "menelik", "adwa", "maji maji", "maji-maji", "tanzania", "mozambique", "frelimo", "primary resistance", "other african countries", "international history", "regional and international history"],
    questions: [
      mc("Which African leader defeated Italy at the Battle of Adwa in 1896?", "Menelik II of Ethiopia", ["Samori Toure", "Lobengula", "Shaka"]),
      mc("Ethiopia is important in African history because it", "defended its independence against European colonisation", ["was the first European colony in Africa", "was ruled by Britain throughout", "attended the Berlin Conference as a colonial power"]),
      mc("The Maji Maji uprising of 1905-07 was against which colonial power?", "Germany", ["France", "Portugal", "Italy"]),
      mc("Many Maji Maji fighters believed that a special water would", "turn enemy bullets into water", ["make them able to fly", "cure all diseases for ever", "bring rain to their farms"]),
      mc("Which movement led the armed struggle against Portuguese rule in Mozambique?", "FRELIMO", ["UNITA", "SWAPO", "the ANC"]),
      ordered("Mozambique became independent in", ["1960", "1970", "1975", "1980"], "1975"),
    ],
  },
  {
    topic: "The French Revolution and Napoleon",
    keywords: ["french revolution", "france", "napoleon*", "bastille", "estates general", "louis xvi", "napoleonic", "international history", "regional and international history"],
    questions: [
      ordered("The French Revolution began in", ["1689", "1789", "1815", "1917"], "1789"),
      mc("Which event on 14 July 1789 became a symbol of the Revolution?", "The storming of the Bastille", ["The Battle of Waterloo", "The coronation of Napoleon", "The Treaty of Versailles"]),
      mc("Before the Revolution, French society was divided into", "three Estates: clergy, nobles and commoners", ["four races", "two political parties", "five trade unions"]),
      mc("A main cause of the French Revolution was", "heavy taxes on commoners and a financial crisis", ["a victory in a world war", "a shortage of kings", "too much food for everyone"]),
      mc("The slogan of the Revolution was", "Liberty, Equality, Fraternity", ["Unity, Peace, Progress", "God, King, Country", "Work, Bread, Land"]),
      mc("King Louis XVI was", "executed in 1793", ["crowned emperor in 1804", "exiled to St Helena", "killed at Waterloo"]),
      ordered("Napoleon Bonaparte crowned himself Emperor in", ["1789", "1799", "1804", "1815"], "1804"),
      mc("The Napoleonic Code was", "a set of laws that spread the idea of equality before the law", ["a military alliance with Britain", "a trade ban on Africa", "a peace treaty ending the First World War"]),
      mc("Napoleon's final defeat came at the Battle of", "Waterloo, in 1815", ["Adwa, in 1896", "Sarajevo, in 1914", "Berlin, in 1884"]),
    ],
  },
  {
    topic: "Nationalism in Europe",
    keywords: ["nationalism in europe", "european nationalism", "vienna", "congress system", "metternich", "bourbon*", "unification", "germany", "italy", "bismarck", "garibaldi", "cavour", "international history", "regional and international history"],
    questions: [
      mc("The Congress of Vienna met in 1814-15 to", "rebuild Europe after Napoleon's defeat", ["start the First World War", "create the United Nations", "divide Africa"]),
      mc("Which Austrian statesman dominated the Congress of Vienna?", "Metternich", ["Bismarck", "Cavour", "Garibaldi"]),
      mc("The Congress System aimed to", "keep peace and the old order through regular meetings of the great powers", ["spread revolution across Europe", "unite Africa", "end all monarchies"]),
      mc("The Restored Bourbon kings of France included", "Louis XVIII and Charles X", ["Napoleon I and Napoleon III", "Louis XIV and Louis XV", "Robespierre and Danton"]),
      mc("Which statesman led the unification of Germany under Prussia?", "Otto von Bismarck", ["Giuseppe Garibaldi", "Metternich", "Napoleon Bonaparte"]),
      ordered("Germany was united as an empire in", ["1815", "1848", "1871", "1914"], "1871"),
      mc("Giuseppe Garibaldi is remembered for leading the Red Shirts in the unification of", "Italy", ["Germany", "France", "Austria"]),
    ],
  },
  {
    topic: "The First World War and the League of Nations",
    keywords: ["first world war", "world war i", "world war 1", "wwi", "league of nations", "versailles", "peace settlement*", "paris peace", "sarajevo", "armistice", "international history", "regional and international history"],
    questions: [
      ordered("The First World War lasted from 1914 to", ["1916", "1917", "1918", "1919"], "1918"),
      mc("The assassination of Archduke Franz Ferdinand took place in", "Sarajevo, in 1914", ["Berlin, in 1884", "Paris, in 1789", "Vienna, in 1815"]),
      mc("Which two alliance groups faced each other before 1914?", "The Triple Entente and the Triple Alliance", ["NATO and the Warsaw Pact", "The League and the United Nations", "The AU and SADC"]),
      mc("Which of these was a long-term cause of the First World War?", "Rivalry over colonies, armies and alliances", ["The invention of the internet", "The Russian Revolution of 1917", "The end of the slave trade in 1807"]),
      mc("The Treaty of Versailles (1919) forced Germany to", "accept blame for the war, pay reparations and lose territory", ["keep its army and all its colonies", "receive payments from France", "take over Belgium"]),
      mc("Which part of the Versailles settlement said Germany was responsible for the war?", "The war guilt clause", ["The Monroe clause", "The Berlin clause", "The effective occupation clause"]),
      mc("The League of Nations was set up in 1920 to", "keep peace and settle disputes between countries", ["rule Africa", "collect taxes", "create colonies"]),
      mc("A weakness of the League of Nations was that", "it had no army of its own and the USA did not join", ["it had a large army of its own", "the USA was its leader", "it ruled all colonies directly"]),
      mc("Which event of 1935 showed the weakness of the League?", "Italy's invasion of Abyssinia (Ethiopia)", ["The Russian Revolution", "The fall of the Bastille", "The Berlin Conference"]),
      mc("Fighting in the First World War ended with an armistice on", "11 November 1918", ["28 June 1914", "1 September 1939", "18 April 1980"]),
    ],
  },
  {
    topic: "Fascism and the Second World War",
    keywords: ["fascis*", "second world war", "world war ii", "world war 2", "wwii", "hitler", "mussolini", "nazi*", "axis", "appeasement", "international history", "regional and international history"],
    questions: [
      mc("Which leader came to power in Italy after the March on Rome in 1922?", "Benito Mussolini", ["Adolf Hitler", "Joseph Stalin", "Winston Churchill"]),
      ordered("Adolf Hitler became Chancellor of Germany in", ["1919", "1923", "1933", "1939"], "1933"),
      mc("A main feature of fascism is", "a strong dictator, one party and extreme nationalism", ["free elections and many parties", "rule by elected councils only", "equal power for all classes"]),
      mc("The Second World War began in Europe in 1939 when Germany invaded", "Poland", ["Belgium", "Russia", "Austria"]),
      mc("The Axis powers were", "Germany, Italy and Japan", ["Britain, France and the USA", "Russia, China and India", "Zimbabwe, Zambia and Malawi"]),
      mc("The policy of giving in to Hitler's demands in the 1930s is called", "appeasement", ["isolationism", "imperialism", "apartheid"]),
      mc("Japan's attack on which US base in 1941 brought the USA into the war?", "Pearl Harbor", ["Waterloo", "Sarajevo", "Versailles"]),
      ordered("The Second World War ended in", ["1943", "1944", "1945", "1946"], "1945"),
    ],
  },
  {
    topic: "The communist revolutions",
    keywords: ["communis*", "russian revolution", "chinese revolution", "bolshevik*", "lenin", "mao", "stalin", "tsar*", "soviet*", "international history", "regional and international history"],
    questions: [
      mc("Which leader headed the Bolsheviks in the Russian Revolution of 1917?", "Vladimir Lenin", ["Tsar Nicholas II", "Mao Zedong", "Napoleon Bonaparte"]),
      mc("Which Russian ruler gave up the throne in March 1917?", "Tsar Nicholas II", ["Lenin", "Stalin", "Trotsky"]),
      ordered("Mao Zedong's Communists proclaimed the People's Republic of China in", ["1911", "1927", "1949", "1966"], "1949"),
      mc("The Long March of 1934-35 was", "a long retreat by Chinese Communists that strengthened Mao's leadership", ["a march to Berlin", "a peace march in Moscow", "a trade route across Africa"]),
      mc("Joseph Stalin's Five-Year Plans aimed to", "industrialise the Soviet Union quickly", ["return land to the tsar", "close all factories", "encourage foreign owners"]),
      mc("A revolution in 1911 ended which dynasty in China?", "The Qing (Manchu) dynasty", ["The Ming dynasty", "The Han dynasty", "The Tang dynasty"]),
    ],
  },
  {
    topic: "Regional and international organisations",
    keywords: ["united nations", "african union", "organisation of african unity", "oau", "sadc", "regional organisation*", "international organisation*", "integration", "international affairs", "international history", "regional and international history"],
    questions: [
      ordered("The United Nations was founded in", ["1919", "1939", "1945", "1963"], "1945"),
      mc("The main aim of the United Nations is", "to keep international peace and security", ["to rule colonies", "to collect Africa's taxes", "to sell weapons"]),
      ordered("The Organisation of African Unity (OAU) was formed in", ["1945", "1963", "1980", "2002"], "1963"),
      ordered("The OAU was replaced by the African Union (AU) in", ["1980", "1992", "2002", "2013"], "2002"),
      mc("SADC was set up to promote", "co-operation and economic development in Southern Africa", ["military rule in Europe", "trade only with Asia", "colonial rule"]),
      mc("The headquarters of SADC are in", "Gaborone, Botswana", ["Harare, Zimbabwe", "Lusaka, Zambia", "Pretoria, South Africa"]),
      mc("Regional integration means", "countries working together, for example on trade and development", ["countries going to war", "one country ruling another", "countries closing their borders"]),
      mc("The headquarters of the African Union are in", "Addis Ababa, Ethiopia", ["Harare, Zimbabwe", "Nairobi, Kenya", "Lagos, Nigeria"]),
    ],
  },
];

const GENERIC_WORDS = /\b(history|core|concepts?|mixed|all|general|revision|practice|paper|overview|full|random|everything|test|quick)\b/;

/** Topics whose keywords appear in the requested topic text; every topic for a broad request. */
export const matchHistoryTopics = (topic: string): CuratedTopic[] => matchTopics(HISTORY_TOPICS, topic, GENERIC_WORDS);

/**
 * Questions for a History paper, or null when the topic is not covered or the learner is on A-Level
 * (these are O-Level knowledge checks and would be below the level).
 */
export function historyBank(topic: string, difficulty?: string): CuratedSeed[] | null {
  if (levelForDifficulty(difficulty) === "alevel") return null;
  return buildBank(HISTORY_TOPICS, topic, GENERIC_WORDS);
}
