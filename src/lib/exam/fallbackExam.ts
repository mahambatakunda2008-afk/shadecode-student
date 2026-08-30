import type { ExamQuestion, GeneratedExam } from "@/lib/cortex/examGenerator";

type Seed = Omit<ExamQuestion, "id" | "topic" | "difficulty">;

const mcq = (question: string, options: string[], modelAnswer: string, marks = 1): Seed => ({ type: "multiple_choice", question, options, marks, modelAnswer, markingCriteria: "Award full credit only for the correct option." });
const short = (question: string, modelAnswer: string, marks = 2, markingCriteria = "Award credit for each correct point and valid explanation."): Seed => ({ type: "short_answer", question, marks, modelAnswer, markingCriteria });
const structured = (question: string, modelAnswer: string, marks = 4, markingCriteria = "Award marks for correct method and result; accept equivalent correct methods."): Seed => ({ type: "structured", question, marks, modelAnswer, markingCriteria });

export function buildFallbackExam(subject: string, topic: string, difficulty: string, count: number): GeneratedExam {
  const level = difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const requestedTopic = topic.trim() || "core concepts";
  const bank = getBank(subject, requestedTopic);
  const questions: ExamQuestion[] = Array.from({ length: count }, (_, index) => ({
    ...bank[index % bank.length],
    id: `fallback_${Date.now()}_${index + 1}_${Math.random().toString(36).slice(2, 7)}`,
    topic: requestedTopic.slice(0, 255),
    difficulty: level,
  }));
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  return { subject, title: `${subject}${topic ? ` · ${topic}` : ""} Practice Paper`, questions, totalMarks, durationMinutes: Math.max(5, Math.round(totalMarks * 2.5)), difficulty: level, topics: [requestedTopic] };
}

function getBank(subject: string, topic: string): Seed[] {
  const s = subject.toLowerCase();
  const t = topic.toLowerCase();

  if (s.includes("computer")) {
    if (t.includes("data") || t.includes("structure")) return [
      mcq("Which data structure follows FIFO order?", ["Stack", "Queue", "Tree", "Graph"], "Queue"),
      short("Explain the difference between a stack and a queue, including the order in which items are removed.", "A stack is LIFO, so the most recently added item is removed first. A queue is FIFO, so the earliest added item is removed first.", 3),
      structured("A stack contains [4, 7, 9]. Push 2, then 6, then perform one pop. State the value removed and the final stack from bottom to top.", "The value removed is 6. The final stack is [4, 7, 9, 2].", 3, "1 mark for 6; 2 marks for the final order."),
      mcq("Which traversal of a binary search tree produces ascending values?", ["Pre-order", "In-order", "Post-order", "Breadth-first"], "In-order"),
      short("State the purpose of a hash table and define a collision.", "A hash table stores key-value data using a hash function to determine an index. A collision occurs when different keys map to the same index.", 3),
    ];
    if (t.includes("program") || t.includes("algorithm")) return [
      mcq("What is the worst-case complexity of binary search on a sorted array?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], "O(log n)"),
      structured("An algorithm repeatedly compares adjacent values and swaps them when they are in the wrong order. Identify the algorithm and state its worst-case complexity.", "The algorithm is bubble sort. Its worst-case time complexity is O(n²).", 3, "2 marks for bubble sort; 1 for O(n²)."),
      short("Explain why repeatedly halving the remaining input gives O(log n) time.", "Each iteration reduces the problem by a constant factor, so only a logarithmic number of iterations is required.", 2),
      structured("A linear search is used on an unsorted list containing n items. State the best-case and worst-case numbers of comparisons.", "Best case: 1 comparison. Worst case: n comparisons.", 3, "1 mark for best case; 2 for worst case."),
      short("Give one advantage and one disadvantage of recursion compared with iteration.", "Recursion can express naturally recursive problems clearly. It uses call-stack memory and excessive recursion depth can cause stack overflow.", 3),
    ];
    return [
      short(`Define ${topic} precisely and give one concrete example of its use in computer science.`, `A precise definition of ${topic} followed by a technically correct computing example.`, 3),
      structured(`A program uses ${topic}. Describe a valid input, the main processing step and the expected output for one test case.`, `A valid input, processing step that genuinely uses ${topic}, and a corresponding expected output.`, 4),
      mcq(`Which is the best first step when solving a ${topic} problem?`, ["Identify the required output and given information", "Ignore constraints", "Guess an answer", "Skip testing"], "Identify the required output and given information"),
      short(`State two edge cases that should be tested for a program involving ${topic}.`, "Any two relevant cases such as empty input, invalid input, boundary values, maximum size or unavailable data.", 2, "1 mark per valid edge case."),
      structured(`Explain how you would test a feature involving ${topic}. Give one normal case and one boundary or invalid case, including expected behaviour.`, "A valid normal test and a valid boundary/invalid test, each with expected behaviour.", 4),
    ];
  }

  if (s.includes("physics")) {
    if (t.includes("mechanic") || t.includes("motion")) return [
      mcq("A body changes velocity from 4 m s⁻¹ to 16 m s⁻¹ in 6 s. What is its acceleration?", ["1 m s⁻²", "2 m s⁻²", "3 m s⁻²", "4 m s⁻²"], "2 m s⁻²"),
      structured("A car travels at 12 m s⁻¹ and accelerates uniformly at 1.5 m s⁻² for 8.0 s. Calculate its final speed and displacement.", "v = 12 + 1.5(8) = 24 m s⁻¹. s = 12(8) + 0.5(1.5)(8²) = 144 m.", 5),
      short("State Newton's second law and give the SI unit of force.", "The resultant force equals the rate of change of momentum; for constant mass, F = ma. The SI unit is the newton (N).", 2),
      structured("A 3.0 kg object experiences a resultant force of 9.0 N. Calculate its acceleration and state its direction.", "a = F/m = 9.0/3.0 = 3.0 m s⁻², in the direction of the resultant force.", 3),
      short("Explain why the area under a velocity-time graph represents displacement.", "For constant velocity the area is vt, which equals displacement; for changing velocity the total area gives the integral of velocity with respect to time.", 2),
    ];
    if (t.includes("electric") || t.includes("circuit")) return [
      mcq("A 12 V supply is connected across a 6.0 Ω resistor. What current flows?", ["0.5 A", "2.0 A", "6.0 A", "72 A"], "2.0 A"),
      structured("Two resistors of 4.0 Ω and 6.0 Ω are connected in series to a 20 V supply. Calculate the total resistance and current.", "R = 4.0 + 6.0 = 10 Ω. I = V/R = 20/10 = 2.0 A.", 4),
      short("Define potential difference in terms of energy transferred and charge.", "Potential difference is energy transferred per unit charge: V = W/Q.", 2),
      mcq("Which quantity is measured in coulombs?", ["Current", "Potential difference", "Charge", "Resistance"], "Charge"),
      structured("A device transfers 360 J when 30 C of charge passes through it. Calculate the potential difference.", "V = W/Q = 360/30 = 12 V.", 3),
    ];
    if (t.includes("deformation") || t.includes("elastic")) return [
      mcq("Which quantity is force divided by cross-sectional area?", ["Strain", "Stress", "Extension", "Young modulus"], "Stress"),
      structured("A wire of original length 2.00 m extends by 1.00 mm. Calculate its strain.", "strain = 0.00100/2.00 = 5.00 × 10⁻⁴.", 3),
      short("Define Young modulus and state its SI unit.", "Young modulus is tensile stress divided by tensile strain in the elastic region. Its SI unit is Pa.", 2),
      structured("A material has stress 1.2 × 10⁸ Pa and strain 6.0 × 10⁻⁴. Calculate its Young modulus.", "E = stress/strain = 2.0 × 10¹¹ Pa.", 3),
      short("Describe what happens when a material is loaded beyond its elastic limit.", "It undergoes permanent deformation and does not return completely to its original dimensions when unloaded.", 2),
    ];
  }

  if (s.includes("math")) {
    if (t.includes("trig")) return [
      mcq("What is the exact value of sin 30°?", ["0", "1/2", "√2/2", "√3/2"], "1/2"),
      structured("Solve 2 sin x = √3 for 0° ≤ x ≤ 360°.", "sin x = √3/2, so x = 60° or 120°.", 4),
      short("State the identity connecting sin²x and cos²x.", "sin²x + cos²x = 1.", 1),
      structured("Given tan θ = 3/4 and θ is acute, find sin θ and cos θ.", "Using a 3-4-5 triangle, sin θ = 3/5 and cos θ = 4/5.", 4),
      short("Explain why tan x is undefined when cos x = 0.", "tan x = sin x/cos x, so division by zero is undefined.", 2),
    ];
    if (t.includes("calculus") || t.includes("differentiat")) return [
      mcq("If y = x³, what is dy/dx?", ["x²", "2x²", "3x²", "3x"], "3x²"),
      structured("Differentiate y = 4x³ - 5x² + 7x - 2.", "dy/dx = 12x² - 10x + 7.", 4),
      structured("Find the stationary point of y = x² - 6x + 5 and classify it.", "dy/dx = 2x - 6 = 0 gives x = 3; y = -4. Since d²y/dx² = 2 > 0, (3, -4) is a minimum.", 5),
      short("State what the gradient of a curve represents at a point.", "The instantaneous rate of change of the dependent variable with respect to the independent variable.", 2),
      mcq("What does a positive second derivative at a stationary point indicate?", ["A local maximum", "A local minimum", "No stationary point", "A vertical asymptote"], "A local minimum"),
    ];
  }

  return [
    short(`Define ${topic} precisely and state one important property of it in ${subject}.`, `A precise definition of ${topic} and one technically correct property.`, 3),
    structured(`Apply your knowledge of ${topic} to a new scenario. State the relevant principle, show the main reasoning and give a conclusion.`, `A correct principle, logically valid reasoning and a conclusion supported by the scenario.`, 5),
    mcq(`Which approach is most reliable when answering a ${subject} question about ${topic}?`, ["Identify the exact task and use relevant evidence", "Ignore the given information", "Guess immediately", "Use an unrelated rule"], "Identify the exact task and use relevant evidence"),
    short(`State two common errors that could occur when answering a question on ${topic}.`, "Any two relevant errors, such as using the wrong definition, formula, unit, assumption or interpretation.", 2, "1 mark per valid error."),
    structured(`Describe one independent way to check an answer involving ${topic}. Explain what the check would establish.`, "A valid independent check such as substitution, dimensional analysis, alternative calculation, limiting case or comparison with expected behaviour, with a correct explanation.", 4),
  ];
}
