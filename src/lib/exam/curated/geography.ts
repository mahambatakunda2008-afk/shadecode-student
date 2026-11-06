/**
 * src/lib/exam/curated/geography.ts
 *
 * Hand-authored Geography multiple-choice questions for ZIMSEC / Cambridge O-Level (Forms 1-4).
 * Sections follow the structure of the ZIMSEC O-Level Geography syllabus (2248): basic techniques and mapwork,
 * weather and climate, landforms, biotic studies, natural resources, agriculture, industry, settlement and
 * population, and transport and trade. All wording is original. Paper 1 of the syllabus is multiple choice,
 * so these are marked exactly with no AI.
 *
 * O-Level only: the A-Level (Forms 5-6) Geography syllabus goes much deeper, so these are not served for it.
 * Authored from standard textbook facts. Intended for a teacher to review before the paper is described to
 * learners as "verified".
 */
import { levelForDifficulty } from "../engine";
import { buildBank, matchTopics, mc, ordered, type CuratedSeed, type CuratedTopic } from "./bank";

export const GEOGRAPHY_TOPICS: CuratedTopic[] = [
  {
    topic: "Map skills",
    keywords: ["map*", "scale", "grid", "contour*", "bearing*", "compass", "topograph*", "co-ordinate*", "coordinate*", "latitude", "longitude", "drainage"],
    questions: [
      mc("A map has a scale of 1:50 000. What ground distance does 1 cm on the map represent?", "500 metres", ["50 metres", "5 kilometres", "50 kilometres"]),
      mc("On a 1:50 000 map, two towns are 6 cm apart. What is the actual distance between them?", "3 kilometres", ["30 kilometres", "300 metres", "6 kilometres"]),
      mc("In a six-figure grid reference, which figures are written first?", "The eastings, read along the bottom of the map", ["The northings, read up the side of the map", "The latitude in degrees", "The bearing of the place"]),
      mc("On a topographic map, contour lines that are very close together show", "a steep slope", ["a gentle slope", "flat land", "a river channel"]),
      mc("Compared with a 1:50 000 map, a 1:25 000 map of the same area shows", "more detail, because it is a larger-scale map", ["less detail, because the scale is smaller", "the same detail over a bigger area", "only the physical features"]),
      mc("Which compass direction is directly opposite north-east?", "South-west", ["South-east", "North-west", "South"]),
      mc("A bearing of 090 degrees from a point means the direction is", "east", ["north", "south", "west"]),
      mc("On a 1:50 000 map, a grid square measures 2 cm by 2 cm. What area of ground does it cover?", "1 square kilometre", ["2 square kilometres", "4 square kilometres", "a quarter of a square kilometre"]),
      mc("Which drainage pattern looks like the branches of a tree?", "Dendritic", ["Radial", "Trellis", "Rectangular"]),
      mc("Lines of latitude run", "east to west and show distance north or south of the Equator", ["north to south and show distance east or west of Greenwich", "north to south and meet at the Equator", "diagonally across the globe"]),
      mc("What does the key (legend) on a map show?", "What each symbol on the map stands for", ["The height of every hill", "The date the map was drawn", "The names of all rivers only"]),
    ],
  },
  {
    topic: "Weather and climate",
    keywords: ["weather", "climat*", "rainfall", "rain", "air mass*", "front*", "cyclon*", "anticyclon*", "pressure", "itcz", "drought", "rain gauge", "thermometer", "barometer", "hygrometer", "forecast*", "humidity"],
    questions: [
      mc("Rain that forms when moist air is forced to rise over mountains is called", "relief (orographic) rainfall", ["convectional rainfall", "frontal rainfall", "radiation rainfall"]),
      mc("Which type of rainfall is typical of the Eastern Highlands of Zimbabwe?", "Relief (orographic) rainfall", ["Rainfall from a hot desert", "Snow from polar air", "Rain from sea mist only"]),
      mc("Which instrument is used to measure the amount of rainfall?", "A rain gauge", ["A barometer", "An anemometer", "A hygrometer"]),
      mc("A Six's thermometer is used to record", "the maximum and minimum temperatures", ["humidity and wind speed", "air pressure", "rainfall and sunshine"]),
      mc("A barometer measures", "air pressure", ["wind direction", "humidity", "cloud cover"]),
      mc("A wet and dry bulb thermometer (hygrometer) is used to find the", "humidity of the air", ["speed of the wind", "air pressure", "amount of rainfall"]),
      mc("Which statement describes an anticyclone?", "High pressure with generally clear, settled weather", ["Low pressure with stormy weather", "A line where warm and cold air meet", "A tropical storm with strong spiralling winds"]),
      mc("Convectional rainfall is most common in", "hot, humid equatorial areas where air rises daily", ["polar regions", "hot deserts all year", "mountain tops only"]),
      mc("The Inter-Tropical Convergence Zone (ITCZ) is the zone where", "winds from the two hemispheres meet and air rises", ["polar and tropical air never meet", "warm ocean currents meet the coast", "mountains block moist air"]),
      mc("Cloud seeding is an example of", "people trying to influence the weather to bring rain", ["a natural cause of drought", "an instrument used for forecasting", "a way of measuring cloud height"]),
      mc("Which weather hazard can affect south-eastern Africa in the summer months?", "Tropical cyclones", ["Blizzards", "Avalanches", "Glacier surges"]),
      mc("A climate graph usually shows", "average monthly temperature and rainfall", ["daily wind speed only", "the height of the land", "the position of air masses"]),
    ],
  },
  {
    topic: "Landforms and rocks",
    keywords: ["landform*", "plate*", "tecton*", "fold*", "fault*", "volcan*", "earthquake*", "rift", "weathering", "rock*", "kopje*", "dwala", "igneous", "crust", "earth movement*", "mountain*"],
    questions: [
      mc("Fold mountains form mainly where", "two plates collide and the crust is squeezed and buckled", ["a river deposits sediment", "wind wears away rock", "the sea floods the land"]),
      mc("An example of a rift valley in Africa is", "the East African Rift Valley", ["the Himalayas", "the Nile Delta", "the Atlas ranges"]),
      mc("The breakdown of rock where it lies, without being moved away, is called", "weathering", ["erosion", "deposition", "transportation"]),
      mc("Freeze-thaw weathering works best where", "temperatures rise and fall around freezing and water gets into cracks", ["it is hot and dry all year", "the rock is covered by thick forest", "rainfall is very low and the air is warm"]),
      mc("Exfoliation, where outer layers of rock peel off, is caused mainly by", "repeated heating by day and cooling at night", ["freezing water in cracks", "acid rain dissolving limestone", "plant roots growing in cracks"]),
      mc("Which landform in Zimbabwe is shaped by weathering and erosion of granite?", "A kopje (inselberg)", ["A barchan dune", "A delta", "A rift valley"]),
      mc("Earthquakes are most frequent", "along plate boundaries", ["in the middle of continents only", "in hot deserts", "along river valleys"]),
      mc("Which kind of rock forms when molten magma cools and hardens?", "Igneous", ["Sedimentary", "Metamorphic", "Alluvial"]),
      mc("The Great Dyke of Zimbabwe is best described as", "a long, narrow band of igneous rock rich in minerals", ["a large man-made dam", "a fold mountain range in the east", "a river flowing into Lake Kariba"]),
      mc("Volcanic activity can benefit people because it can provide", "fertile soils and geothermal energy", ["more desert land", "less rainfall", "protection from floods"]),
    ],
  },
  {
    topic: "Rivers",
    keywords: ["river*", "meander*", "waterfall*", "delta*", "flood plain*", "floodplain*", "valley*", "drainage", "tributar*", "hydrograph*", "dam*", "erosion", "watershed*", "kariba", "zambezi"],
    questions: [
      mc("A bend in a river, with erosion on the outside and deposition on the inside, is a", "meander", ["delta", "waterfall", "gorge"]),
      mc("Where does most downward (vertical) erosion happen along a river's course?", "In the upper course", ["On the floodplain", "At the river mouth", "In the delta"]),
      mc("A waterfall forms where", "a river flows over a band of hard rock above softer rock that wears away faster", ["a river enters the sea", "two rivers join", "a river floods its banks"]),
      mc("Victoria Falls is on which river?", "The Zambezi", ["The Limpopo", "The Save", "The Mazowe"]),
      mc("A delta forms when", "a river drops its load as it enters a lake or the sea", ["a river flows over hard rock", "a river speeds up in the mountains", "a river changes course in the desert"]),
      mc("What is a tributary?", "A smaller river that joins a larger river", ["The place where a river begins", "The place where a river meets the sea", "A bend in a river"]),
      mc("Lake Kariba was created by", "building the Kariba Dam across the Zambezi River", ["volcanic activity", "a meteorite impact", "erosion by glaciers"]),
      mc("A river hydrograph shows", "how the amount of water flowing in a river changes over time", ["the height of the land beside a river", "the temperature of the river water", "the age of the rocks in the valley"]),
      mc("Multipurpose river development usually aims to provide", "hydro-electric power, irrigation, flood control and water supply", ["only fish for food", "only a road across the river", "only a place for tourists"]),
      mc("The boundary between two river drainage basins is called a", "watershed", ["tributary", "confluence", "levee"]),
    ],
  },
  {
    topic: "Hot deserts and desertification",
    keywords: ["desert*", "dune*", "wadi*", "sahara", "kalahari", "sahel", "desertification", "wind"],
    questions: [
      mc("A crescent-shaped sand dune formed by wind blowing mainly from one direction is a", "barchan", ["wadi", "yardang", "playa"]),
      mc("Which desert is found in southern Africa?", "The Kalahari", ["The Sahara", "The Gobi", "The Thar"]),
      mc("A wadi is", "a dry river valley in a desert that floods after rain", ["a moving sand dune", "a salt lake", "a mountain peak"]),
      mc("A main cause of desertification in the Sahel is", "overgrazing, cutting down trees and drought", ["too much rainfall", "rising sea levels", "volcanic ash"]),
      mc("A hot desert is usually defined as an area with", "very low rainfall, under about 250 mm a year", ["rainfall above 1000 mm a year", "permanent snow cover", "cloud all year"]),
      mc("Deflation is", "the removal of loose material by wind", ["the dissolving of limestone", "the deposit of silt by rivers", "the freezing of water in rock"]),
      mc("Which measure helps to reduce desertification?", "Planting trees and controlling grazing", ["Clearing all vegetation", "Burning grassland every year", "Ploughing steep slopes"]),
      mc("Many hot deserts lie near 30 degrees north and south of the Equator because", "dry air sinks there from high-pressure belts and brings little rain", ["the sea is always colder there", "mountains stop all rain there", "the sun never shines there"]),
    ],
  },
  {
    topic: "Vegetation and ecosystems",
    keywords: ["vegetation", "ecosystem*", "savanna*", "savannah*", "rainforest*", "deforestation", "forest*", "biome*", "soil erosion"],
    questions: [
      mc("Which vegetation type covers much of Zimbabwe?", "Savanna (woodland and grassland)", ["Equatorial rainforest", "Tundra", "Mediterranean scrub"]),
      mc("Equatorial rainforests have", "high temperatures and heavy rainfall all year", ["cold winters with snow", "very low rainfall", "a long dry season only"]),
      mc("A main effect of deforestation in the tropics is", "soil erosion and loss of habitats", ["more fertile soils for ever", "lower carbon dioxide levels", "more wildlife species"]),
      mc("In an ecosystem, producers are", "green plants that make food by photosynthesis", ["animals that eat plants", "animals that eat other animals", "organisms that break down dead matter"]),
      mc("Savanna trees such as the acacia cope with dry seasons by", "having deep roots and small or thorny leaves", ["having shallow roots and huge leaves", "growing only in water", "losing their roots in winter"]),
      mc("A main cause of soil erosion in tropical savanna is", "overgrazing and clearing of vegetation", ["volcanic ash", "rising sea levels", "frost"]),
      mc("Which layer of a tropical rainforest receives the most sunlight?", "The emergent layer of the tallest trees", ["The forest floor", "The shrub layer", "The understorey"]),
    ],
  },
  {
    topic: "Natural resources and conservation",
    keywords: ["resource*", "renewable", "non-renewable", "conservation", "conserv*", "mineral*", "mining", "energy", "recycl*", "fossil"],
    questions: [
      mc("Which of these is a renewable resource?", "Solar energy", ["Coal", "Copper", "Natural gas"]),
      mc("Which of these is a non-renewable resource?", "Coal", ["Wind", "Sunshine", "Water in the water cycle"]),
      mc("Copper is an important mineral export of which African country?", "Zambia", ["Malawi", "Lesotho", "Rwanda"]),
      mc("Which African country is a major oil producer?", "Nigeria", ["Malawi", "Lesotho", "Rwanda"]),
      mc("Conserving resources means", "using them carefully so they last for future generations", ["using them as fast as possible", "exporting all of them", "ignoring how much is left"]),
      mc("A harmful effect of mining on the environment is", "pollution of water and damage to the land", ["a rise in soil fertility", "more forest cover", "cleaner rivers"]),
      mc("Which method helps to conserve soil on a slope?", "Contour ploughing", ["Overgrazing", "Cutting down all the trees", "Burning the grass every year"]),
      mc("Recycling helps the environment because it", "reduces waste and saves raw materials", ["uses more energy than making new goods", "creates more rubbish", "removes the need for any resources"]),
    ],
  },
  {
    topic: "Agriculture",
    keywords: ["farm*", "agricultur*", "crop*", "subsistence", "commercial", "plantation*", "irrigation", "ranching", "livestock", "dairy", "natural region*", "cattle", "maize"],
    questions: [
      mc("In the farm as a system, seeds and fertiliser are", "inputs", ["outputs", "processes", "waste products"]),
      mc("Ploughing, planting and harvesting are examples of farm", "processes", ["inputs", "outputs", "limits"]),
      mc("Subsistence farmers grow crops mainly", "to feed their own families", ["for export", "for factories only", "for tourists"]),
      mc("Which description fits plantation agriculture?", "Large estates growing one cash crop such as tea or sugar-cane", ["Small plots of maize for home use", "Moving with herds in search of grass", "Mixed farming on a family plot"]),
      mc("Nomadic herding involves", "moving with livestock to find water and pasture", ["growing crops on one fixed field", "keeping cattle in a barn all year", "growing crops under irrigation"]),
      mc("Irrigation is most useful in areas where rainfall is", "low or unreliable", ["very heavy all year", "always on time", "falling as snow"]),
      mc("Which Zimbabwean natural farming region has the highest rainfall?", "Region I, in the Eastern Highlands", ["Region III", "Region IV", "Region V"]),
      mc("Natural Region V in Zimbabwe is best suited to", "extensive cattle ranching and wildlife", ["intensive tea and coffee growing", "specialised forestry and fruit", "rain-fed tobacco on every farm"]),
      mc("Which of these is an economic factor that affects farming?", "Market prices", ["Soil type", "Rainfall", "Slope of the land"]),
    ],
  },
  {
    topic: "Industry and tourism",
    keywords: ["industr*", "factory", "factories", "manufactur*", "tourism", "tourist*", "services", "tertiary", "transnational", "secondary", "primary"],
    questions: [
      mc("Why is a sugar mill usually built near the cane fields?", "The cane is heavy and bulky and spoils quickly if carried far", ["Sugar cannot be sold in towns", "Cane grows only near ports", "Factories must be far from roads"]),
      mc("Which industry is market based?", "Bread making", ["Copper smelting", "Sugar-cane milling", "Iron ore mining"]),
      mc("Banking, insurance and tourism belong to which sector?", "The tertiary (service) sector", ["The primary sector", "The secondary sector", "None of them are economic activities"]),
      mc("A transnational corporation is a company that", "operates in several countries", ["is owned by a government only", "sells only in its home town", "has no factories or offices"]),
      mc("Victoria Falls is important for tourism in Zimbabwe mainly because", "it is a natural attraction that draws visitors and foreign currency", ["it is the capital city", "it is the largest mine", "it is the main airport"]),
      mc("Which of these is a secondary industry?", "Making clothes in a factory", ["Growing maize", "Fishing", "Mining gold"]),
      mc("Which of these is a primary activity?", "Mining gold", ["Banking", "Baking bread", "Making furniture"]),
      mc("Why might a factory be built near a port?", "To import raw materials and export goods easily", ["To avoid using any transport", "Because ports have no workers", "Because ports have no electricity"]),
      mc("Tourism can harm the environment by", "causing pollution and damage to habitats", ["always reducing waste", "making more jobs only", "stopping all erosion"]),
    ],
  },
  {
    topic: "Settlement and population",
    keywords: ["settlement*", "urban*", "rural", "population*", "migrat*", "census", "birth rate", "death rate", "growth point*", "cbd", "town*", "city", "cities", "disease*", "cholera", "malaria"],
    questions: [
      mc("A settlement pattern in which houses are spread far apart is called", "dispersed", ["nucleated", "linear", "planned grid"]),
      mc("Houses grouped closely around a central point such as a water source form a", "nucleated settlement", ["dispersed settlement", "isolated farm", "seasonal camp"]),
      mc("The Central Business District (CBD) is usually found", "at the centre of a town, where land values are highest", ["on the outer edge of the town", "only along the railway", "in the rural area"]),
      mc("Urbanisation is", "the increase in the share of people living in towns and cities", ["the movement of people to farms", "the building of new villages only", "a fall in the number of towns"]),
      mc("Which is a push factor that makes people leave rural areas?", "Drought and lack of jobs", ["Better schools in town", "Higher wages in town", "Modern hospitals in town"]),
      mc("Birth rate minus death rate gives the", "natural increase", ["migration rate", "dependency ratio", "life expectancy"]),
      mc("A population pyramid with a very wide base and a narrow top shows", "a high birth rate and a short life expectancy", ["a low birth rate and long life expectancy", "equal numbers in every age group", "a population with no children"]),
      mc("The dependency ratio compares", "the number of young and old dependants with the working-age population", ["the number of men with women", "urban people with rural people", "births with deaths"]),
      mc("Growth points were set up in Zimbabwe mainly to", "develop rural service centres and reduce movement to the big cities", ["close small towns", "stop all farming", "move people into the CBD"]),
      mc("Which disease is linked to unsafe drinking water?", "Cholera", ["Malaria", "Kwashiorkor", "Sleeping sickness"]),
      mc("Malaria is spread by", "the female Anopheles mosquito", ["the tsetse fly", "the housefly", "a water snail"]),
      mc("Kwashiorkor is caused mainly by", "a lack of protein in the diet", ["a virus in the water", "a mosquito bite", "polluted air"]),
    ],
  },
  {
    topic: "Transport, time and trade",
    keywords: ["transport*", "trade", "trading", "time zone*", "longitude", "date line", "greenwich", "sadc", "export*", "import*", "route*", "network*", "landlocked", "port*"],
    questions: [
      mc("The Prime (Greenwich) Meridian is at", "0 degrees longitude", ["90 degrees east", "23.5 degrees north", "180 degrees"]),
      mc("The Earth turns through 360 degrees in 24 hours, so every 15 degrees of longitude is", "1 hour of time", ["4 hours of time", "30 minutes of time", "24 hours of time"]),
      mc("Places east of Greenwich are", "ahead of Greenwich time", ["behind Greenwich time", "on the same time as Greenwich", "half a day behind Greenwich"]),
      ordered("When it is 12:00 noon at Greenwich, what is the time at 30 degrees East?", ["10:00", "12:30", "13:00", "14:00"], "14:00"),
      mc("The International Date Line roughly follows", "180 degrees longitude", ["0 degrees longitude", "the Equator", "the Tropic of Cancer"]),
      mc("SADC stands for", "Southern African Development Community", ["South African Defence Council", "Southern Africa Drought Commission", "Sub-Saharan African Development Club"]),
      mc("A landlocked country is one that", "has no coastline", ["is entirely an island", "has no rivers", "has no neighbours"]),
      mc("Which port in Mozambique is commonly used for Zimbabwe's imports and exports?", "Beira", ["Mombasa", "Lagos", "Dakar"]),
      mc("A trade deficit happens when", "imports are worth more than exports", ["exports are worth more than imports", "a country stops all trade", "a country has no ports"]),
      mc("An advantage of air transport is that it", "is the fastest way to move people and high-value goods", ["is the cheapest way to move heavy bulk goods", "needs no airports", "is never affected by weather"]),
      mc("A topological diagram of a transport network shows", "places as nodes and routes as links, not exact distances", ["the exact height of land", "the exact weather on each route", "the cost of each ticket"]),
    ],
  },
];

const GENERIC_WORDS = /\b(geography|core|concepts?|mixed|all|general|revision|practice|paper|overview|full|random|everything|test|quick)\b/;

/** Topics whose keywords appear in the requested topic text; every topic for a broad request. */
export const matchGeographyTopics = (topic: string): CuratedTopic[] => matchTopics(GEOGRAPHY_TOPICS, topic, GENERIC_WORDS);

/**
 * Questions for a Geography paper, or null when the topic is not covered or the learner is on A-Level
 * (these are O-Level questions and would be below the level).
 */
export function geographyBank(topic: string, difficulty?: string): CuratedSeed[] | null {
  if (levelForDifficulty(difficulty) === "alevel") return null;
  return buildBank(GEOGRAPHY_TOPICS, topic, GENERIC_WORDS);
}
