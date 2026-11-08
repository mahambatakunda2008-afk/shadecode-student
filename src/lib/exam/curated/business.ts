/**
 * src/lib/exam/curated/business.ts
 *
 * Hand-authored Business Studies / Commerce / Business Enterprise Skills knowledge checks for O-Level (Forms 1-4).
 * Topics are the ones these Form 1-4 subjects share (and that the Ministry's Business Studies syllabus builds on at
 * Forms 5-6): business activity and enterprise, production, forms of ownership, marketing, trade and distribution,
 * banking and insurance, transport and communication, finance and costs, people in business, government and business,
 * international trade, and the business environment, ethics and ICT.
 *
 * Commerce papers are part multiple choice, but Business Studies and Commerce structured questions and essays still need
 * a teacher or AI to mark. All wording is original and money is written as "dollars" (never a dollar sign).
 * O-Level only: not served for A-Level or for Business Management. Authored from standard textbook facts. Intended
 * for a teacher to review before being described as "verified".
 */
import { levelForDifficulty } from "../engine";
import { buildBank, matchTopics, mc, ordered, type CuratedSeed, type CuratedTopic } from "./bank";

export const BUSINESS_TOPICS: CuratedTopic[] = [
  {
    topic: "Business activity and enterprise",
    keywords: ["business activity", "enterprise", "entrepreneur*", "needs and wants", "goods and services", "factors of production", "opportunity cost", "informal sector", "sme*", "small business*", "consumer goods", "capital goods"],
    questions: [
      mc("A need is", "something a person must have to survive", ["something a person would like to have", "an item that is always expensive", "a product sold by a wholesaler"]),
      mc("Which of these is a service?", "A hairdresser cutting hair", ["A bag of maize meal", "A pair of shoes", "A bicycle"]),
      mc("Which of these is a consumer good?", "A loaf of bread", ["A tractor in a factory", "A printing press", "A delivery lorry"]),
      mc("A capital good is", "a good used to produce other goods", ["a good bought only by the rich", "a good that is eaten", "a good bought for fun"]),
      mc("An entrepreneur is a person who", "organises resources and takes risks to start and run a business", ["only works for a government department", "only lends money to banks", "only buys goods to use at home"]),
      mc("Which is a quality of a successful entrepreneur?", "Willingness to take calculated risks", ["Fear of any change", "Refusing all advice", "Avoiding planning"]),
      mc("The reward for taking risks in a business is", "profit", ["wages", "rent", "interest"]),
      mc("Opportunity cost is", "the next best alternative given up when a choice is made", ["the price of an item", "the cost of borrowing money", "the money spent on advertising"]),
      mc("Which is a feature of the informal sector?", "Small, often unregistered businesses such as street vending", ["Large registered multinational firms", "Government departments", "Companies listed on the stock exchange"]),
      mc("The four factors of production are land, labour, capital and", "enterprise", ["profit", "trade", "money"]),
      mc("Wages are the payment for which factor of production?", "Labour", ["Land", "Capital", "Enterprise"]),
    ],
  },
  {
    topic: "Production and value addition",
    keywords: ["production", "value addition", "beneficiation", "division of labour", "specialisation", "primary production", "secondary production", "tertiary production", "job production", "batch production", "flow production", "mass production"],
    questions: [
      mc("Farming and mining belong to which stage of production?", "Primary", ["Secondary", "Tertiary", "Final"]),
      mc("Turning cotton into clothing is", "secondary production", ["primary production", "tertiary production", "distribution only"]),
      mc("Banking, transport and teaching are", "tertiary production", ["primary production", "secondary production", "extractive production"]),
      mc("Value addition means", "making a product more valuable by processing it further", ["selling it at a lower price", "exporting raw materials unchanged", "storing it for longer"]),
      mc("Beneficiation of minerals means", "processing minerals locally before they are exported", ["digging minerals faster", "exporting raw ore", "stopping all mining"]),
      mc("Division of labour means", "each worker does a particular task in the production process", ["one worker does every task", "all workers get equal pay", "machines replace all workers"]),
      mc("Job production is used to make", "one-off items made to a customer's order, such as a wedding dress", ["thousands of identical cans on a line", "identical bricks on a continuous line", "bottled water in huge numbers"]),
      mc("Flow (mass) production suits", "large quantities of identical products, such as bottled drinks", ["a single hand-made piece of furniture", "a one-off bridge design", "a tailor-made suit"]),
      mc("Batch production means", "making a set number of identical items at a time", ["making one item at a time to order", "making items without any plan", "making only services"]),
      mc("An advantage of division of labour is that", "workers become faster and more skilled at their task", ["every worker can do every job", "work never becomes boring", "nobody needs any training"]),
      mc("A disadvantage of division of labour is that", "work can become boring and repetitive", ["output always falls", "workers are paid nothing", "no tools are needed"]),
    ],
  },
  {
    topic: "Forms of business ownership",
    keywords: ["ownership", "sole trader*", "partnership*", "limited company", "limited companies", "public company", "private company", "co-operative*", "cooperative*", "parastatal*", "public corporation*", "franchis*", "shareholder*", "liability", "forms of business"],
    questions: [
      mc("A business owned and run by one person is a", "sole trader", ["partnership", "co-operative", "public company"]),
      mc("A major disadvantage of being a sole trader is", "unlimited liability", ["limited liability", "shares sold to the public", "having many owners"]),
      mc("Unlimited liability means the owner", "can lose personal belongings to pay the business debts", ["pays no debts", "cannot lose more than the money invested", "is protected by shareholders"]),
      mc("A partnership is owned by", "two or more people who share profits and responsibility", ["one person only", "thousands of shareholders", "the government only"]),
      mc("A deed of partnership is", "a written agreement setting out how the partners will run the business", ["a tax receipt", "a bank loan", "a licence to import goods"]),
      mc("Shareholders in a limited company have", "limited liability", ["unlimited liability", "no right to any profit", "no ownership"]),
      mc("A public limited company can", "sell shares to the public on a stock exchange", ["never sell shares", "only have one owner", "only trade with the government"]),
      mc("A private limited company", "cannot sell shares to the general public", ["must be listed on the stock exchange", "has unlimited liability", "is always owned by the state"]),
      mc("A co-operative is", "owned and run by its members for their mutual benefit", ["owned by one person", "owned by the government", "owned by foreign banks"]),
      mc("A parastatal (public corporation) is", "owned by the government to provide goods or services", ["owned by one family", "owned by shareholders on a stock exchange", "owned by its customers only"]),
      mc("Franchising is when a business", "pays to use another firm's name and methods", ["sells shares", "borrows money from a bank", "imports goods"]),
      mc("Dividends are", "shares of profit paid to shareholders", ["wages paid to workers", "taxes paid to the state", "loans paid to banks"]),
    ],
  },
  {
    topic: "Marketing",
    keywords: ["marketing", "marketing mix", "market research", "segmentation", "target market*", "branding", "advertis*", "promotion*", "pricing", "product life cycle", "niche"],
    questions: [
      mc("The four Ps of the marketing mix are product, price, place and", "promotion", ["profit", "production", "packaging"]),
      mc("Market research is", "collecting information about customers and the market", ["making products", "paying taxes", "hiring workers"]),
      mc("Information collected first-hand through questionnaires is", "primary research", ["secondary research", "desk research", "government data"]),
      mc("Information taken from existing reports, such as national statistics, is", "secondary research", ["primary research", "a survey", "a questionnaire"]),
      mc("Market segmentation means", "dividing a market into groups of customers with similar needs", ["selling to everyone in the same way", "cutting prices", "reducing production"]),
      mc("A target market is", "the group of customers a business aims to sell to", ["a place where goods are made", "the cheapest market", "a government office"]),
      mc("Which of these is a method of promotion?", "Advertising", ["Wages", "Rent", "Insurance"]),
      mc("A brand is", "a name, symbol or design that identifies a product", ["a type of tax", "a form of transport", "a bank account"]),
      mc("Penetration pricing means", "setting a low price at first to win customers", ["setting a very high price at first", "never changing the price", "copying a competitor exactly"]),
      mc("Price skimming means", "charging a high price at first for a new product", ["charging the lowest price", "giving the product away", "fixing a price for years"]),
      mc("Which stage of the product life cycle comes first?", "Introduction", ["Maturity", "Decline", "Growth"]),
      mc("Niche marketing aims at", "a small, specialised part of the market", ["the whole market", "only foreign customers", "only government buyers"]),
    ],
  },
  {
    topic: "Trade and distribution",
    keywords: ["trade", "wholesal*", "retail*", "chain of distribution", "distribution", "supermarket*", "barter", "e-commerce", "cross-border", "tuck shop*"],
    questions: [
      mc("A wholesaler", "buys in bulk from producers and sells smaller quantities to retailers", ["sells only to the public", "makes the goods", "provides banking services"]),
      mc("A retailer", "sells goods to the final consumer", ["buys only from consumers", "produces raw materials", "lends money"]),
      mc("A usual chain of distribution is", "producer, wholesaler, retailer, consumer", ["consumer, retailer, producer", "retailer, producer, wholesaler", "wholesaler, consumer, producer"]),
      mc("A service wholesalers give to producers is", "buying in bulk and storing the goods", ["making the goods", "setting tax rates", "printing money"]),
      mc("A service retailers give to consumers is", "selling in small quantities close to where people live", ["selling only in huge bulk", "manufacturing goods", "setting the exchange rate"]),
      mc("When a producer sells directly to consumers, the wholesaler is", "left out of the chain", ["paid twice", "made the owner", "made a consumer"]),
      mc("Which is an advantage of shopping at a supermarket?", "Many goods are available under one roof", ["Goods are always the cheapest anywhere", "Goods are never packaged", "There is nothing to pay"]),
      mc("Online shopping is part of", "e-commerce", ["barter", "wholesale trade", "franchising"]),
      mc("Barter is", "exchanging goods for goods without using money", ["buying with a bank card", "selling on a stock exchange", "borrowing from a bank"]),
      mc("A cross-border trader is someone who", "buys goods in another country and sells them back home", ["works only for the government", "makes goods in a factory", "only repairs vehicles"]),
      mc("A tuck shop is an example of", "a small retailer", ["a wholesaler", "a bank", "a parastatal"]),
    ],
  },
  {
    topic: "Banking, money and insurance",
    keywords: ["bank*", "money", "insurance", "insure*", "premium*", "overdraft*", "loan*", "interest", "stock exchange", "zse", "mobile money", "ecocash", "credit"],
    questions: [
      mc("Which of these is a function of money?", "A medium of exchange", ["A type of tax", "A form of insurance", "A kind of loan"]),
      mc("Money works as a store of value because", "it keeps its worth so it can be spent later", ["it can be eaten", "it must be spent at once", "it never changes in value"]),
      mc("The central bank of Zimbabwe is the", "Reserve Bank of Zimbabwe", ["Zimbabwe Revenue Authority", "Zimbabwe Stock Exchange", "a commercial building society"]),
      mc("A commercial bank", "accepts deposits and lends money to customers", ["prints the country's money", "collects taxes", "regulates all insurance"]),
      mc("An overdraft is", "an arrangement to spend more than is in the account", ["a type of savings account", "a tax refund", "a share in a company"]),
      mc("Interest on a loan is", "the price paid for borrowing money", ["a tax on imports", "a fine for late work", "a reward for workers"]),
      mc("Mobile money services such as EcoCash let people", "send and receive money using a mobile phone", ["print banknotes", "collect taxes", "list shares"]),
      mc("Insurance works because", "many people pay small premiums so that the few who suffer a loss can be paid", ["the government pays every loss", "banks print money for claims", "customers pay only after a loss"]),
      mc("A premium is", "the payment made for insurance", ["a discount from a shop", "a bank loan", "a share dividend"]),
      mc("Insurable interest means", "the person insured must stand to lose if the loss happens", ["anyone can insure anything", "insurance is free", "only banks can be insured"]),
      mc("The Zimbabwe Stock Exchange is where", "shares in public companies are bought and sold", ["banknotes are printed", "taxes are paid", "goods are made"]),
      mc("A credit sale is when", "goods are supplied now and paid for later", ["goods are paid for before they are ordered", "goods are swapped for goods", "goods are given away"]),
    ],
  },
  {
    topic: "Transport and communication",
    keywords: ["transport*", "communication*", "ict", "email", "railway*", "air transport", "road transport", "pipeline*", "telephone*"],
    questions: [
      mc("Which transport is best for heavy bulk goods over long distances on land?", "Rail", ["Air freight of small packages", "Walking", "A motorbike taxi"]),
      mc("An advantage of air transport is", "speed over long distances", ["it is the cheapest for heavy goods", "it needs no airports", "it is never delayed"]),
      mc("An advantage of road transport is", "door-to-door delivery", ["it is the fastest way across oceans", "it needs no roads", "it never causes pollution"]),
      mc("Pipelines are best for moving", "liquids and gases such as fuel", ["fresh flowers", "passengers", "machinery parts"]),
      mc("Which is a form of written communication?", "Email", ["A telephone call", "A face-to-face talk", "A radio interview"]),
      mc("A benefit of email in business is", "fast, low-cost delivery with a written record", ["it needs no internet", "it is always secret", "it can never be misread"]),
      mc("A disadvantage of oral communication is that", "there is no permanent record", ["it needs paper", "it cannot be fast", "it is never personal"]),
      mc("A barrier to communication is", "noise or language differences", ["a clear message", "a quiet room", "a common language"]),
      mc("ICT stands for", "information and communication technology", ["internal company transfer", "information and customer training", "international customs trade"]),
      mc("A benefit of keeping records on a computer is", "fast storage and retrieval of information", ["records can never be lost", "no electricity is needed", "no skills are needed"]),
    ],
  },
  {
    topic: "Business finance and costs",
    keywords: ["finance", "costs", "cost*", "revenue", "profit*", "break-even", "break even", "cash flow", "budget*", "sources of finance", "microfinance"],
    questions: [
      mc("Which is an internal source of finance?", "Retained profit", ["A bank loan", "An overdraft", "Issuing new shares"]),
      mc("Which is a short-term source of finance?", "An overdraft", ["Selling shares", "A mortgage", "A long-term loan"]),
      mc("Fixed costs are costs that", "stay the same however much is produced", ["rise with every unit produced", "fall as sales rise", "occur only once a year"]),
      mc("Which is a variable cost?", "Raw materials", ["Rent", "An insurance premium", "A manager's salary"]),
      mc("Total revenue is calculated as", "price multiplied by quantity sold", ["price minus cost", "cost plus tax", "quantity minus price"]),
      mc("Profit is", "total revenue minus total costs", ["total revenue plus total costs", "total costs minus tax", "selling price minus quantity"]),
      mc("The break-even point is where", "total revenue equals total costs", ["profit is at its highest", "fixed costs are zero", "sales are at their lowest"]),
      ordered("A business sells 200 items at 5 dollars each. Its total revenue is", ["200 dollars", "500 dollars", "1000 dollars", "1500 dollars"], "1000 dollars"),
      ordered("Revenue of 1000 dollars and total costs of 700 dollars give a profit of", ["200 dollars", "300 dollars", "700 dollars", "1700 dollars"], "300 dollars"),
      mc("Cash flow refers to", "the money moving into and out of a business", ["the profit made in a year", "the value of its buildings", "the number of its workers"]),
      mc("A microfinance loan is typically", "a small loan to small businesses and low-income people", ["a huge loan to big companies", "a government tax", "an insurance payment"]),
      mc("A budget is", "a plan of expected income and spending", ["a record of past sales only", "a tax return", "a bank statement"]),
    ],
  },
  {
    topic: "People in business",
    keywords: ["human resource*", "employ*", "recruit*", "training", "trade union*", "motivation", "wages", "salary", "commission", "job description", "dismissal", "labour relations", "staff"],
    questions: [
      mc("A job description", "lists the duties of a job", ["lists the qualities of the ideal person", "shows the company's profit", "sets the price of goods"]),
      mc("A person specification", "lists the skills and qualities needed for the job", ["lists the duties of a job only", "shows the wage rates", "gives the company's address"]),
      mc("Induction training is for", "new employees to learn about the business", ["retiring workers", "customers", "shareholders"]),
      mc("On-the-job training takes place", "at the workplace while doing the job", ["only at a college", "only in the evening", "only online abroad"]),
      mc("A trade union", "represents workers and negotiates for better pay and conditions", ["owns the company", "sets share prices", "lends money to firms"]),
      mc("Which is a financial motivator?", "A bonus", ["A friendly greeting", "A job title", "A pleasant office"]),
      mc("Which is a non-financial motivator?", "Recognition and praise", ["Overtime pay", "Commission", "A bonus"]),
      mc("Commission is", "pay based on the value of sales made", ["pay for not working", "a loan to staff", "a tax on workers"]),
      mc("Which is a reason for a business to train its staff?", "To improve skills and productivity", ["To reduce all wages", "To avoid hiring anyone", "To close the business"]),
      mc("Dismissal means", "being told to leave a job because of misconduct or poor performance", ["being promoted", "taking a holiday", "joining a union"]),
    ],
  },
  {
    topic: "Government and business",
    keywords: ["government", "tax*", "vat", "customs duty", "subsid*", "zimra", "licen*", "consumer protection", "regulation*", "public services"],
    questions: [
      mc("ZIMRA is the", "Zimbabwe Revenue Authority, which collects taxes", ["a trade union", "a commercial bank", "a transport company"]),
      mc("Value-added tax (VAT) is charged on", "goods and services that people buy", ["workers' wages only", "imports only", "company shares"]),
      mc("Customs duty is charged on", "goods brought into a country", ["wages", "shares", "land only"]),
      mc("A subsidy is", "money given by the government to lower the cost of producing something", ["a tax paid by a business", "a fine", "a loan from a bank"]),
      mc("Why does a government protect consumers by law?", "To stop unsafe goods and unfair practices", ["To raise all prices", "To stop all trade", "To close small shops"]),
      mc("An example of pollution control by a government is", "requiring factories to treat their waste", ["allowing waste to be dumped", "ending all production", "raising wages"]),
      mc("Income tax is paid on", "earnings from work or profits", ["every purchase made", "goods imported", "land only"]),
      mc("Why do governments tax businesses?", "To raise money to provide public services", ["To make all businesses fail", "To print money", "To stop wages"]),
      mc("A business licence is", "official permission to run a business", ["a bank loan", "a type of advertisement", "a share certificate"]),
      mc("A government can help the informal sector through", "training and small loans", ["banning all trading", "closing all markets", "stopping all training"]),
    ],
  },
  {
    topic: "International trade",
    keywords: ["international trade", "foreign trade", "import*", "export*", "tariff*", "quota*", "balance of trade", "exchange rate*", "sadc", "landlocked", "free trade", "trade barrier*"],
    questions: [
      mc("Goods bought from other countries are", "imports", ["exports", "re-exports only", "subsidies"]),
      mc("Goods sold to other countries are", "exports", ["imports", "quotas", "tariffs"]),
      mc("Visible trade means", "trade in goods, such as maize or tobacco", ["trade in services such as banking", "trade in shares", "trade in debts"]),
      mc("An example of an invisible export is", "tourism services sold to foreign visitors", ["tobacco leaf", "minerals", "cotton lint"]),
      mc("A tariff is", "a tax on imported goods", ["a limit on exports", "a subsidy", "a loan"]),
      mc("A quota is", "a limit on the quantity of a good that can be imported", ["a tax on exports", "a free trade zone", "a kind of subsidy"]),
      mc("The balance of trade is", "the difference between the value of a country's exports and imports of goods", ["the total of a country's taxes", "the number of ports", "a country's population"]),
      mc("Why do countries trade with one another?", "No country can produce everything it needs", ["All countries have identical resources", "Trade is always illegal", "Countries want to avoid trade"]),
      mc("A free trade area such as SADC", "reduces trade barriers between member countries", ["bans trade between members", "raises tariffs among members", "closes all borders"]),
      mc("The exchange rate is", "the price of one currency in terms of another", ["the tax on imports", "a type of bank loan", "the cost of transport"]),
      mc("A landlocked country such as Zimbabwe depends on ports in neighbouring countries such as", "Beira and Durban", ["Mombasa and Lagos", "Dakar and Tunis", "Cairo and Algiers"]),
      mc("Which of these earns Zimbabwe foreign currency as an export?", "Tobacco", ["Imported cars", "Imported fuel", "Imported rice"]),
    ],
  },
  {
    topic: "Business environment, ethics and ICT",
    keywords: ["business environment", "ethic*", "social responsibility", "stakeholder*", "business plan*", "swot", "sustainab*", "consumer rights", "social media", "internet"],
    questions: [
      mc("Stakeholders are", "people or groups affected by or interested in a business", ["only the owners", "only the managers", "only the banks"]),
      mc("Which is an example of a business acting with social responsibility?", "Treating its waste so rivers are not polluted", ["Dumping waste in rivers", "Ignoring safety rules", "Hiding faults in its goods"]),
      mc("A business plan is", "a document setting out a business idea, its market, costs and expected profit", ["a list of customers' complaints", "a bank statement", "a tax return"]),
      mc("Which is usually included in a business plan?", "Expected income and costs", ["The owner's favourite colour", "Staff birthdays only", "Competitors' passwords"]),
      mc("A SWOT analysis looks at a business's", "strengths, weaknesses, opportunities and threats", ["sales, wages, output and tax", "suppliers, workers, owners and taxes", "stocks, wages, orders and targets"]),
      mc("Which is a benefit of using social media to market a business?", "Reaching many customers at low cost", ["It needs no effort at all", "It guarantees every sale", "It needs no content"]),
      mc("Which behaviour is unethical in business?", "Misleading customers about a product", ["Giving honest advice", "Paying staff on time", "Keeping promises"]),
      mc("Customers have the right to", "safe products and accurate information", ["free goods", "refuse every price", "demand any discount"]),
      mc("Sustainable business practice means", "meeting today's needs without harming the future", ["using up all resources quickly", "ignoring waste", "ignoring workers"]),
      mc("Which is a threat in a SWOT analysis?", "A new competitor entering the market", ["A skilled workforce", "A loyal customer base", "A strong brand"]),
      mc("The internet allows a small business to", "sell to customers in other places", ["avoid all competition", "ignore its customers", "stop paying tax"]),
    ],
  },
];

const GENERIC_WORDS = /\b(business|commerce|studies|core|concepts?|mixed|all|general|revision|practice|paper|overview|full|random|everything|test|quick)\b/;

/** Topics whose keywords appear in the requested topic text; every topic for a broad request. */
export const matchBusinessTopics = (topic: string): CuratedTopic[] => matchTopics(BUSINESS_TOPICS, topic, GENERIC_WORDS);

/**
 * Questions for a Business / Commerce paper, or null when the topic is not covered or the learner is on A-Level
 * (these are O-Level knowledge checks and would be below the level).
 */
export function businessBank(topic: string, difficulty?: string): CuratedSeed[] | null {
  if (levelForDifficulty(difficulty) === "alevel") return null;
  return buildBank(BUSINESS_TOPICS, topic, GENERIC_WORDS);
}
