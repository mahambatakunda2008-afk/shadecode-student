import type { ExamQuestion, GeneratedExam } from "@/lib/cortex/examGenerator";

type Seed = Omit<ExamQuestion, "id" | "topic" | "difficulty">;
type Difficulty = ExamQuestion["difficulty"];

const mcq = (question: string, options: string[], modelAnswer: string, marks = 1): Seed => ({ type: "multiple_choice", question, options, marks, modelAnswer, markingCriteria: "Award full credit only for the correct option." });
const short = (question: string, modelAnswer: string, marks = 2): Seed => ({ type: "short_answer", question, marks, modelAnswer, markingCriteria: "Award credit for each correct point and valid explanation." });
const structured = (question: string, modelAnswer: string, marks = 4): Seed => ({ type: "structured", question, marks, modelAnswer, markingCriteria: "Award marks for correct method and result; accept equivalent correct methods." });

/** Emergency paper generator. It prefers a smaller genuinely distinct paper to repeated questions. */
export function buildFallbackExam(subject: string, topic: string, difficulty: string, count: number): GeneratedExam {
  const level: Difficulty = difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const requestedTopic = topic.trim() || "core concepts";
  const bank = getBank(subject, requestedTopic);
  const safeCount = Math.max(1, Math.min(Math.round(Number(count) || 10), bank.length));
  const questions: ExamQuestion[] = bank.slice(0, safeCount).map((seed, index) => ({
    ...seed,
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

  if (s.includes("physics") && (t.includes("deformation") || t.includes("elastic"))) return [
    mcq("Which quantity is force divided by cross-sectional area?", ["Strain", "Stress", "Extension", "Young modulus"], "Stress"),
    structured("A wire of original length 2.00 m extends by 1.00 mm. Calculate its strain.", "strain = 0.00100/2.00 = 5.00 × 10⁻⁴.", 3),
    short("Define Young modulus and state its SI unit.", "Young modulus is tensile stress divided by tensile strain in the elastic region. Its SI unit is Pa."),
    structured("A material has stress 1.2 × 10⁸ Pa and strain 6.0 × 10⁻⁴. Calculate its Young modulus.", "E = stress/strain = 2.0 × 10¹¹ Pa.", 3),
    short("Describe what happens when a material is loaded beyond its elastic limit.", "It undergoes permanent deformation and does not return completely to its original dimensions when unloaded."),
    mcq("Which graph has stress on the vertical axis and strain on the horizontal axis?", ["Stress-strain graph", "Velocity-time graph", "Force-time graph", "Displacement-time graph"], "Stress-strain graph"),
    structured("A wire has cross-sectional area 2.0 × 10⁻⁶ m² and is subjected to a tensile force of 80 N. Calculate the stress.", "stress = F/A = 80/(2.0 × 10⁻⁶) = 4.0 × 10⁷ Pa.", 3),
    short("State the difference between elastic deformation and plastic deformation.", "Elastic deformation is reversible when the load is removed; plastic deformation is permanent."),
    structured("A wire has Young modulus 2.0 × 10¹¹ Pa, length 1.5 m, area 3.0 × 10⁻⁶ m² and tensile force 120 N. Calculate its extension.", "Stress = 4.0 × 10⁷ Pa; strain = 2.0 × 10⁻⁴; extension = 3.0 × 10⁻⁴ m = 0.30 mm.", 5),
    mcq("What happens to the extension of a wire, all else equal, if its original length is doubled?", ["It halves", "It doubles", "It becomes zero", "It is unchanged"], "It doubles"),
  ];

  if (s.includes("physics") && (t.includes("mechanic") || t.includes("motion"))) return [
    mcq("A body changes velocity from 4 m s⁻¹ to 16 m s⁻¹ in 6 s. What is its acceleration?", ["1 m s⁻²", "2 m s⁻²", "3 m s⁻²", "4 m s⁻²"], "2 m s⁻²"),
    structured("A car travels at 12 m s⁻¹ and accelerates uniformly at 1.5 m s⁻² for 8.0 s. Calculate its final speed and displacement.", "v = 24 m s⁻¹ and s = 144 m.", 5),
    short("State Newton's second law and give the SI unit of force.", "The resultant force equals the rate of change of momentum; for constant mass F = ma. The SI unit is the newton."),
    structured("A 3.0 kg object experiences a resultant force of 9.0 N. Calculate its acceleration.", "a = F/m = 3.0 m s⁻², in the direction of the resultant force.", 3),
    short("Explain why the area under a velocity-time graph represents displacement.", "The area is velocity multiplied by time for constant velocity, and the total area gives displacement for changing velocity."),
    mcq("A velocity-time graph has a constant positive gradient. What does this indicate?", ["Constant positive acceleration", "Zero velocity", "Constant negative acceleration", "Constant displacement"], "Constant positive acceleration"),
    structured("A 2.0 kg object starts from rest and accelerates uniformly at 3.0 m s⁻² for 5.0 s. Calculate its final speed and kinetic energy.", "v = 15 m s⁻¹ and KE = 225 J.", 5),
    short("Distinguish between mass and weight.", "Mass is the amount of matter measured in kg; weight is the gravitational force measured in N."),
    structured("A 5.0 kg load is lifted vertically through 2.0 m. Take g = 9.81 m s⁻². Calculate the increase in gravitational potential energy.", "ΔE = mgh = 98.1 J.", 3),
    short("State one condition under which the SUVAT equations can be used.", "The acceleration must be constant (uniform).", 1),
  ];

  if (s.includes("math") && t.includes("trig")) return [
    mcq("What is the exact value of sin 30°?", ["0", "1/2", "√2/2", "√3/2"], "1/2"),
    structured("Solve 2 sin x = √3 for 0° ≤ x ≤ 360°.", "x = 60° or 120°.", 4),
    short("State the identity connecting sin²x and cos²x.", "sin²x + cos²x = 1.", 1),
    structured("Given tan θ = 3/4 and θ is acute, find sin θ and cos θ.", "Using a 3-4-5 triangle, sin θ = 3/5 and cos θ = 4/5.", 4),
    short("Explain why tan x is undefined when cos x = 0.", "tan x = sin x/cos x, so division by zero is undefined."),
    mcq("Which identity is equivalent to tan θ?", ["sin θ/cos θ", "cos θ/sin θ", "1/sin θ", "1/cos θ"], "sin θ/cos θ"),
    structured("Solve cos x = -1/2 for 0° ≤ x ≤ 360°.", "x = 120° or 240°.", 4),
    short("State the exact values of sin 45° and cos 45°.", "Both are √2/2."),
    structured("Show that (1 - cos²x)/sin x simplifies to sin x where the expression is defined.", "1 - cos²x = sin²x, so sin²x/sin x = sin x for sin x ≠ 0.", 4),
    structured("Solve 2cos²x - 3cos x + 1 = 0 for 0° ≤ x ≤ 360°.", "(2cos x - 1)(cos x - 1) = 0, giving x = 0°, 60°, 300°.", 5),
  ];

  if (s.includes("computer") && (t.includes("data") || t.includes("structure"))) return [
    mcq("Which data structure follows FIFO order?", ["Stack", "Queue", "Tree", "Graph"], "Queue"),
    short("Explain the difference between a stack and a queue.", "A stack is LIFO, while a queue is FIFO.", 2),
    structured("A stack contains [4, 7, 9]. Push 2, then 6, then perform one pop. State the value removed and the final stack from bottom to top.", "The value removed is 6. The final stack is [4, 7, 9, 2].", 3),
    mcq("Which traversal of a binary search tree produces ascending values?", ["Pre-order", "In-order", "Post-order", "Breadth-first"], "In-order"),
    short("State the purpose of a hash table and define a collision.", "A hash table maps keys to stored values using a hash function. A collision occurs when different keys map to the same index.", 3),
    structured("A sorted array contains 128 values. A binary search halves the remaining range after each comparison. State the order of the worst-case time complexity.", "O(log n), because the remaining search interval is repeatedly halved.", 2),
    short("Explain why a queue is useful when requests must be processed in arrival order.", "FIFO processing ensures the earliest request is handled first."),
    mcq("Which structure is most appropriate for hierarchical parent-child relationships?", ["Stack", "Queue", "Tree", "Hash table"], "Tree"),
    structured("A circular queue has capacity 5 and contains A, B and C with A at the front. Dequeue twice, then enqueue D and E. State the logical contents from front to rear.", "C, D, E.", 4),
    short("State one advantage and one limitation of a linked list compared with a fixed-size array.", "It can grow without moving the whole structure, but it uses extra memory for links and lacks direct constant-time indexing.", 3),
  ];

  const label = topic.trim() || "the stated topic";
  return [
    short(`Define ${label} precisely in the context of ${subject}.`, `A precise, subject-specific definition of ${label}.`, 2),
    structured(`Apply your knowledge of ${label} to the information in a new ${subject} scenario and justify your conclusion.`, `A relevant principle, correct application and justified conclusion.`, 5),
    mcq(`Which approach is most reliable when answering a ${subject} question about ${label}?`, ["Identify the exact task and use relevant evidence", "Ignore the given information", "Guess immediately", "Use an unrelated rule"], "Identify the exact task and use relevant evidence"),
    short(`State two common errors that could occur when answering a question on ${label}.`, "Any two relevant errors involving definitions, methods, units, assumptions or interpretation."),
    structured(`Describe one independent way to check an answer involving ${label}.`, "A valid check such as substitution, dimensional analysis, an alternative calculation or comparison with expected behaviour.", 3),
    mcq(`What should determine the method used for a ${label} question?`, ["The exact requirements and supplied information", "The longest formula available", "A random remembered method", "An unrelated example"], "The exact requirements and supplied information"),
    short(`State one condition, assumption or limitation relevant to ${label}.`, "A valid condition, assumption or limitation specific to the supplied topic and context."),
    structured(`Compare two valid approaches to a problem involving ${label} and state when each is appropriate.`, "Two valid approaches with a correct explanation of their appropriate conditions.", 4),
    short(`Explain what evidence would make a conclusion about ${label} convincing.`, "Relevant, sufficient evidence that directly supports the conclusion and is consistent with the question conditions.", 3),
    structured(`Design a short worked check for a claim about ${label}. State the input or evidence required and what result would support the claim.`, "A relevant test with a defined input/evidence source and a clearly defined supporting result.", 4),
  ];
}
