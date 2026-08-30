import type { ExamQuestion, GeneratedExam } from "@/lib/cortex/examGenerator";

type Seed = Omit<ExamQuestion, "id" | "topic" | "difficulty">;

const mcq = (question: string, options: string[], modelAnswer: string, marks = 1): Seed => ({ type: "multiple_choice", question, options, marks, modelAnswer, markingCriteria: "Award full credit only for the correct option." });
const short = (question: string, modelAnswer: string, marks = 2, markingCriteria = "Award credit for each correct point and valid explanation."): Seed => ({ type: "short_answer", question, marks, modelAnswer, markingCriteria });
const structured = (question: string, modelAnswer: string, marks = 4, markingCriteria = "Award marks for correct method and result; accept equivalent correct methods."): Seed => ({ type: "structured", question, marks, modelAnswer, markingCriteria });

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " "); }

/**
 * Emergency exam generation must still produce a markable paper when an AI
 * provider is unavailable. Banks are intentionally finite and topic-specific.
 * We never repeat a question just to satisfy the requested count.
 */
export function buildFallbackExam(subject: string, topic: string, difficulty: string, count: number): GeneratedExam {
  const level = difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const requestedTopic = topic.trim() || "core concepts";
  const bank = getBank(subject, requestedTopic);
  const safeCount = Math.max(1, Math.min(Math.round(Number(count) || 10), bank.length));
  const questions = bank.slice(0, safeCount).map((seed, index) => ({
    ...seed,
    id: `fallback_${Date.now()}_${index + 1}_${Math.random().toString(36).slice(2, 7)}`,
    topic: requestedTopic.slice(0, 255),
    difficulty: level,
  }));
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  return {
    subject,
    title: `${subject}${topic ? ` · ${topic}` : ""} Practice Paper`,
    questions,
    totalMarks,
    durationMinutes: Math.max(5, Math.round(totalMarks * 2.5)),
    difficulty: level,
    topics: [requestedTopic],
  };
}

function getBank(subject: string, topic: string): Seed[] {
  const s = subject.toLowerCase();
  const t = normalize(topic);

  if (s.includes("computer")) {
    if (t.includes("data") || t.includes("structure")) return [
      mcq("Which data structure follows FIFO order?", ["Stack", "Queue", "Tree", "Graph"], "Queue"),
      short("Explain the difference between a stack and a queue, including the order in which items are removed.", "A stack is LIFO, so the most recently added item is removed first. A queue is FIFO, so the earliest added item is removed first.", 3),
      structured("A stack contains [4, 7, 9]. Push 2, then 6, then perform one pop. State the value removed and the final stack from bottom to top.", "The value removed is 6. The final stack is [4, 7, 9, 2].", 3, "1 mark for 6; 2 marks for the final order."),
      mcq("Which traversal of a binary search tree produces ascending values?", ["Pre-order", "In-order", "Post-order", "Breadth-first"], "In-order"),
      short("State the purpose of a hash table and define a collision.", "A hash table stores key-value data using a hash function to determine an index. A collision occurs when different keys map to the same index.", 3),
      structured("A sorted array contains 128 values. A binary search halves the remaining range after each comparison. What is the maximum number of comparisons needed to identify a value or establish that it is absent?", "After 7 halvings one value remains, so at most 8 comparisons are needed when counting the final comparison: 128 → 64 → 32 → 16 → 8 → 4 → 2 → 1.", 4),
      short("Explain why a queue is useful when requests must be processed in arrival order.", "A queue preserves FIFO order, so the earliest request is processed first and later requests wait behind it.", 2),
      mcq("Which structure is most appropriate for representing hierarchical parent-child relationships?", ["Stack", "Queue", "Tree", "Hash table"], "Tree"),
      structured("A circular queue has capacity 5 and currently stores [A, B, C] with A at the front. Dequeue twice and enqueue D then E. State the logical contents from front to rear.", "After removing A and B, the queue contains C. Adding D and E gives C, D, E from front to rear.", 4),
      short("State one advantage and one limitation of using a linked list instead of a fixed-size array.", "A linked list can grow or shrink without moving the whole structure, but it uses extra memory for links and does not provide direct constant-time indexing.", 3),
    ];
    if (t.includes("program") || t.includes("algorithm")) return [
      mcq("What is the worst-case complexity of binary search on a sorted array?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], "O(log n)"),
      structured("An algorithm repeatedly compares adjacent values and swaps them when they are in the wrong order. Identify the algorithm and state its worst-case complexity.", "The algorithm is bubble sort. Its worst-case time complexity is O(n²).", 3, "2 marks for bubble sort; 1 for O(n²)."),
      short("Explain why repeatedly halving the remaining input gives O(log n) time.", "Each iteration reduces the problem by a constant factor, so only a logarithmic number of iterations is required.", 2),
      structured("A linear search is used on an unsorted list containing n items. State the best-case and worst-case numbers of comparisons.", "Best case: 1 comparison. Worst case: n comparisons.", 3, "1 mark for best case; 2 for worst case."),
      short("Give one advantage and one disadvantage of recursion compared with iteration.", "Recursion can express naturally recursive problems clearly. It uses call-stack memory and excessive recursion depth can cause stack overflow.", 3),
      structured("Trace the following algorithm for input 7: set total to 0; for i from 1 to input, if i is even add i to total; output total. Give the output and state how many loop iterations occur.", "The even values are 2, 4 and 6, so the output is 12. The loop executes 7 iterations.", 4),
      mcq("Which search method requires the data to be sorted before it can halve the search interval?", ["Linear search", "Binary search", "Depth-first search", "Hash lookup"], "Binary search"),
      short("State the difference between a syntax error and a logic error.", "A syntax error violates the programming language's grammar and prevents correct parsing/execution; a logic error allows the program to run but produces an incorrect result.", 3),
      structured("An algorithm contains one loop that runs n times and, inside it, a loop that runs n times. State the dominant time complexity and explain why.", "O(n²), because the inner loop executes n times for each of the n outer-loop iterations.", 3),
      short("Give two reasons for testing boundary values in a program.", "Boundary values often expose off-by-one errors and failures at minimum or maximum allowed inputs.", 2),
    ];
  }

  if (s.includes("physics")) {
    if (t.includes("deformation") || t.includes("elastic")) return [
      mcq("Which quantity is force divided by cross-sectional area?", ["Strain", "Stress", "Extension", "Young modulus"], "Stress"),
      structured("A wire of original length 2.00 m extends by 1.00 mm. Calculate its strain.", "strain = 0.00100/2.00 = 5.00 × 10⁻⁴.", 3),
      short("Define Young modulus and state its SI unit.", "Young modulus is tensile stress divided by tensile strain in the elastic region. Its SI unit is Pa.", 2),
      structured("A material has stress 1.2 × 10⁸ Pa and strain 6.0 × 10⁻⁴. Calculate its Young modulus.", "E = stress/strain = 2.0 × 10¹¹ Pa.", 3),
      short("Describe what happens when a material is loaded beyond its elastic limit.", "It undergoes permanent deformation and does not return completely to its original dimensions when unloaded.", 2),
      mcq("Which graph has stress on the vertical axis and strain on the horizontal axis?", ["Stress-strain graph", "Velocity-time graph", "Force-time graph", "Displacement-time graph"], "Stress-strain graph"),
      structured("A wire has cross-sectional area 2.0 × 10⁻⁶ m² and is subjected to a tensile force of 80 N. Calculate the stress.", "stress = F/A = 80/(2.0 × 10⁻⁶) = 4.0 × 10⁷ Pa.", 3),
      short("State the difference between elastic deformation and plastic deformation.", "Elastic deformation is reversible when the load is removed; plastic deformation is permanent.", 2),
      structured("A wire has Young modulus 2.0 × 10¹¹ Pa, length 1.5 m, area 3.0 × 10⁻⁶ m² and tensile force 120 N. Calculate its extension.", "Stress = 120/(3.0 × 10⁻⁶) = 4.0 × 10⁷ Pa. Strain = stress/E = 2.0 × 10⁻⁴. Extension = strain × length = 3.0 × 10⁻⁴ m = 0.30 mm.", 5),
      mcq("What happens to the extension of a wire, all else equal, if its original length is doubled?", ["It halves", "It doubles", "It becomes zero", "It is unchanged"], "It doubles"),
    ];
    if (t.includes("mechanic") || t.includes("motion")) return [
      mcq("A body changes velocity from 4 m s⁻¹ to 16 m s⁻¹ in 6 s. What is its acceleration?", ["1 m s⁻²", "2 m s⁻²", "3 m s⁻²", "4 m s⁻²"], "2 m s⁻²"),
      structured("A car travels at 12 m s⁻¹ and accelerates uniformly at 1.5 m s⁻² for 8.0 s. Calculate its final speed and displacement.", "v = 12 + 1.5(8) = 24 m s⁻¹. s = 12(8) + 0.5(1.5)(8²) = 144 m.", 5),
      short("State Newton's second law and give the SI unit of force.", "The resultant force equals the rate of change of momentum; for constant mass, F = ma. The SI unit is the newton (N).", 2),
      structured("A 3.0 kg object experiences a resultant force of 9.0 N. Calculate its acceleration and state its direction.", "a = F/m = 9.0/3.0 = 3.0 m s⁻², in the direction of the resultant force.", 3),
      short("Explain why the area under a velocity-time graph represents displacement.", "For constant velocity the area is vt, which equals displacement; for changing velocity the total area gives the integral of velocity with respect to time.", 2),
      mcq("A velocity-time graph has a constant positive gradient. What does this indicate?", ["Constant positive acceleration", "Zero velocity", "Constant negative acceleration", "Constant displacement"], "Constant positive acceleration"),
      structured("A 2.0 kg object starts from rest and accelerates uniformly at 3.0 m s⁻² for 5.0 s. Calculate its final speed and kinetic energy.", "v = at = 15 m s⁻¹. Kinetic energy = ½mv² = ½(2.0)(15²) = 225 J.", 5),
      short("Distinguish between mass and weight.", "Mass is the amount of matter and is measured in kilograms; weight is the gravitational force on a mass and is measured in newtons.", 3),
      structured("A 5.0 kg load is lifted vertically through 2.0 m. Take g = 9.81 m s⁻². Calculate the increase in gravitational potential energy.", "ΔE = mgh = 5.0 × 9.81 × 2.0 = 98.1 J.", 3),
      short("State one condition under which the SUVAT equations can be used.", "The acceleration must be constant (uniform).", 1),
    ];
  }

  if (s.includes("math")) {
    if (t.includes("trig")) return [
      mcq("What is the exact value of sin 30°?", ["0", "1/2", "√2/2", "√3/2"], "1/2"),
      structured("Solve 2 sin x = √3 for 0° ≤ x ≤ 360°.", "sin x = √3/2, so x = 60° or 120°.", 4),
      short("State the identity connecting sin²x and cos²x.", "sin²x + cos²x = 1.", 1),
      structured("Given tan θ = 3/4 and θ is acute, find sin θ and cos θ.", "Using a 3-4-5 triangle, sin θ = 3/5 and cos θ = 4/5.", 4),
      short("Explain why tan x is undefined when cos x = 0.", "tan x = sin x/cos x, so division by zero is undefined.", 2),
      mcq("Which identity is equivalent to tan θ?", ["sin θ/cos θ", "cos θ/sin θ", "1/sin θ", "1/cos θ"], "sin θ/cos θ"),
      structured("Solve cos x = -1/2 for 0° ≤ x ≤ 360°.", "Cosine is -1/2 in quadrants II and III, giving x = 120° and 240°.", 4),
      short("State the exact values of sin 45° and cos 45°.", "sin 45° = √2/2 and cos 45° = √2/2.", 2),
      structured("Show that (1 - cos²x)/sin x simplifies to sin x, for values where the expression is defined.", "1 - cos²x = sin²x, so sin²x/sin x = sin x, provided sin x ≠ 0.", 4),
      structured("Solve 2cos²x - 3cos x + 1 = 0 for 0° ≤ x ≤ 360°.", "Let c = cos x. (2c - 1)(c - 1) = 0, so c = 1/2 or 1. Hence x = 60°, 300°, or 0°.", 5),
    ];
    if (t.includes("calculus") || t.includes("differentiat")) return [
      mcq("If y = x³, what is dy/dx?", ["x²", "2x²", "3x²", "3x"], "3x²"),
      structured("Differentiate y = 4x³ - 5x² + 7x - 2.", "dy/dx = 12x² - 10x + 7.", 4),
      structured("Find the stationary point of y = x² - 6x + 5 and classify it.", "dy/dx = 2x - 6 = 0 gives x = 3; y = -4. Since d²y/dx² = 2 > 0, (3, -4) is a minimum.", 5),
      short("State what the gradient of a curve represents at a point.", "The instantaneous rate of change of the dependent variable with respect to the independent variable.", 2),
      mcq("What does a positive second derivative at a stationary point indicate?", ["A local maximum", "A local minimum", "No stationary point", "A vertical asymptote"], "A local minimum"),
      structured("Find ∫(6x² - 4x + 3) dx.", "2x³ - 2x² + 3x + C.", 4),
      short("State the relationship between differentiation and integration for a continuous function.", "They are inverse operations up to an additive constant in indefinite integration.", 2),
      structured("A particle has displacement s = t³ - 6t² + 9t metres. Find its velocity at t = 2 s.", "v = ds/dt = 3t² - 12t + 9. At t = 2, v = 12 - 24 + 9 = -3 m s⁻¹.", 4),
      mcq("At a stationary point of y = f(x), which quantity is zero?", ["f(x)", "f'(x)", "f''(x)", "x"], "f'(x)"),
      structured("The gradient of y = x² + ax is zero at x = 4. Find a.", "dy/dx = 2x + a. At x = 4, 8 + a = 0, so a = -8.", 3),
    ];
  }

  const topicLabel = topic.trim() || "the stated topic";
  return [
    short(`Define ${topicLabel} precisely and state one important property of it in ${subject}.`, `A precise definition of ${topicLabel} and one technically correct property.`, 3),
    structured(`A student is given a new ${subject} problem involving ${topicLabel}. State the relevant principle, apply it to the information given, and reach a justified conclusion.`, `A correct principle, logically valid application and a conclusion supported by the supplied information.`, 5),
    mcq(`Which approach is most reliable when answering a ${subject} question about ${topicLabel}?`, ["Identify the exact task and use relevant evidence", "Ignore the given information", "Guess immediately", "Use an unrelated rule"], "Identify the exact task and use relevant evidence"),
    short(`State two common errors that could occur when answering a question on ${topicLabel}.`, "Any two relevant errors, such as using the wrong definition, formula, unit, assumption or interpretation.", 2, "1 mark per valid error."),
    structured(`Describe one independent way to check an answer involving ${topicLabel}. Explain what the check would establish.`, "A valid independent check such as substitution, dimensional analysis, alternative calculation, limiting case or comparison with expected behaviour, with a correct explanation.", 4),
    mcq(`Which action best demonstrates understanding of ${topicLabel}?`, ["Apply the idea to supplied information", "Copy a definition without context", "Ignore units or conditions", "Use an unrelated formula"], "Apply the idea to supplied information"),
    short(`State one condition, assumption or limitation that should be considered when using ${topicLabel}.`, "A valid condition, assumption or limitation specific to the topic and the question context.", 2),
    structured(`Compare two valid approaches to a problem involving ${topicLabel}. State when each approach would be appropriate.`, "Two valid approaches with a correct explanation of the conditions under which each applies.", 4),
    short(`Explain how an examiner could distinguish a correct answer from an unsupported guess on ${topicLabel}.`, "A correct answer should show relevant reasoning, method, evidence or justification appropriate to the task rather than only an unsupported final statement.", 3),
    structured(`Design a short test or worked check for a claim about ${topicLabel}. State the input or evidence required and the result that would support the claim.`, "A test with a relevant input/evidence source and a clearly defined supporting result.", 4),
  ];
}
