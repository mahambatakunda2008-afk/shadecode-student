import type { ExamQuestion, GeneratedExam } from "@/lib/cortex/examGenerator";

/**
 * Deterministic last-resort papers. These are deliberately real, markable
 * questions, not "AI-style" filler. They are used only when every AI
 * provider is unavailable or returns an unsafe/invalid paper.
 */
export function buildFallbackExam(
  subject: string,
  topic: string,
  difficulty: string,
  count: number,
): GeneratedExam {
  const level = difficulty === "hard" ? "hard" : difficulty === "easy" ? "easy" : "medium";
  const requestedTopic = topic.trim() || "core concepts";
  const bank = subjectQuestions(subject, requestedTopic, level);
  const questions: ExamQuestion[] = [];

  for (let i = 0; i < count; i += 1) {
    const q = bank[i % bank.length];
    questions.push({
      ...q,
      id: `fallback_${Date.now()}_${i + 1}_${Math.random().toString(36).slice(2, 7)}`,
      topic: requestedTopic.slice(0, 255),
      difficulty: level,
    });
  }

  return {
    subject,
    title: `${subject} ${topic ? `${topic} ` : ""}Practice Paper`,
    questions,
    totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    durationMinutes: Math.max(5, Math.round(questions.reduce((sum, q) => sum + q.marks, 0) * 2.5)),
    difficulty: level,
    topics: [requestedTopic],
  };
}

type Seed = Omit<ExamQuestion, "id" | "topic" | "difficulty">;

function mcq(question: string, options: string[], marks: number, modelAnswer: string, markingCriteria = "Select the correct option."): Seed {
  return { type: "multiple_choice", question, options, marks, modelAnswer, markingCriteria };
}
function short(question: string, marks: number, modelAnswer: string, markingCriteria = "Award marks for the stated correct points and valid reasoning."): Seed {
  return { type: "short_answer", question, marks, modelAnswer, markingCriteria };
}
function structured(question: string, marks: number, modelAnswer: string, markingCriteria = "Award credit for each valid step; accept equivalent correct methods."): Seed {
  return { type: "structured", question, marks, modelAnswer, markingCriteria };
}

function subjectQuestions(subject: string, topic: string, level: "easy" | "medium" | "hard"): Seed[] {
  const s = subject.toLowerCase();
  const t = topic.toLowerCase();

  if (s.includes("computer")) {
    if (t.includes("data type") || t.includes("structure")) return [
      mcq("Which data structure follows the FIFO principle?", ["Stack", "Queue", "Tree", "Graph"], 1, "Queue"),
      short("Explain one difference between a static array and a dynamic array, and give one situation in which a dynamic array is useful.", 3, "A static array has a fixed size allocated for it, whereas a dynamic array can grow or shrink during execution. A dynamic array is useful when the required number of elements is not known in advance.", "1 mark for fixed size, 1 for dynamic sizing, 1 for a valid use case."),
      structured("A stack initially contains [4, 7, 9]. The values 2 and 6 are then pushed, followed by one pop operation. State the value removed and the final stack from bottom to top.", 3, "The pop removes 6. Final stack: [4, 7, 9, 2].", "1 mark for identifying 6, 2 for the correct final order."),
      mcq("Which traversal of a binary search tree visits the values in ascending order?", ["Pre-order", "In-order", "Post-order", "Breadth-first"], 1, "In-order"),
      short("State the purpose of a hash table and explain what a collision means.", 3, "A hash table stores key-value data using a hash function to calculate an index. A collision occurs when different keys produce the same index.", "1 mark for purpose, 1 for hashing/indexing, 1 for collision definition."),
    ];
    if (t.includes("program") || t.includes("algorithm")) return [
      mcq("What is the worst-case time complexity of binary search on a sorted array?", ["O(1)", "O(log n)", "O(n)", "O(n²)"], 1, "O(log n)"),
      structured("An algorithm repeatedly compares adjacent elements and swaps them when they are in the wrong order. Identify the algorithm and state its worst-case time complexity.", 3, "Bubble sort; worst-case time complexity is O(n²).", "2 marks for Bubble sort, 1 for O(n²)."),
      short("Explain why a loop that repeatedly halves the size of its input is commonly O(log n).", 2, "Each iteration reduces the remaining input by a constant factor, so only about log₂(n) iterations are needed to reach a constant-sized problem.", "1 mark for repeated constant-factor reduction, 1 for logarithmic iteration count."),
      structured("A program uses a linear search to find a value in an unsorted list of n items. State the best-case and worst-case number of comparisons.", 3, "Best case: 1 comparison. Worst case: n comparisons.", "1 mark for best case and 2 for worst case."),
      short("State one advantage and one disadvantage of recursion compared with iteration.", 3, "Advantage: recursion can express naturally recursive problems clearly. Disadvantage: recursive calls use stack memory and excessive depth can cause stack overflow.", "1 mark for a valid advantage, 1 for a valid disadvantage, 1 for accurate explanation."),
    ];
    return [
      short(`For the topic '${topic}', define the central concept precisely and give one concrete computing example in which it is used.`, 3, `A precise definition of ${topic} together with a valid computing example.`, "1 mark for a precise definition, 2 for a relevant and correctly explained example."),
      structured(`A software system uses ${topic}. Describe one input, one processing step and one output that could form a complete, testable example.`, 4, "A valid input, an appropriate processing step involving the requested topic, and a corresponding output.", "1 mark input, 2 processing, 1 output."),
      mcq(`Which approach is most appropriate when analysing ${topic} in a computer science system?`, ["Identify inputs, operations and outputs", "Ignore edge cases", "Use undefined variables", "Avoid testing"], 1, "Identify inputs, operations and outputs"),
      short(`State two failure cases that should be tested in a program involving ${topic}.`, 2, "Any two valid edge/error cases relevant to the topic, such as invalid input, empty input, boundary values, or unavailable data.", "1 mark per valid failure case."),
      structured(`Explain how you would test a program feature based on ${topic}. Include one normal case and one boundary or invalid case.`, 4, "A valid normal test with expected output and a valid boundary/invalid test with expected behaviour.", "2 marks for normal test and expected result, 2 for boundary/invalid test and expected result."),
    ];
  }

  if (s.includes("physics")) {
    if (t.includes("mechanic") || t.includes("motion")) return [
      mcq("A body accelerates uniformly from 4 m s⁻¹ to 16 m s⁻¹ in 6 s. What is its acceleration?", ["1 m s⁻²", "2 m s⁻²", "3 m s⁻²", "4 m s⁻²"], 1, "2 m s⁻²"),
      structured("A car travels at 12 m s⁻¹ and accelerates uniformly at 1.5 m s⁻² for 8.0 s. Calculate its final speed and distance travelled during the 8.0 s.", 5, "v = 24 m s⁻¹. s = ut + ½at² = 12(8) + 0.5(1.5)(64) = 144 m.", "2 marks for final speed, 3 for correct distance method and answer."),
      short("State Newton's second law and identify the SI unit of force.", 2, "The resultant force on an object equals the rate of change of its momentum; for constant mass, F = ma. The SI unit is the newton (N).", "1 mark for law, 1 for unit."),
      structured("A 3.0 kg object is acted on by a resultant horizontal force of 9.0 N. Calculate its acceleration and state the direction of acceleration.", 3, "a = F/m = 9.0/3.0 = 3.0 m s⁻², in the direction of the resultant force.", "2 marks for calculation, 1 for direction."),
      short("Explain why the area under a velocity-time graph represents displacement.", 2, "For constant velocity the area is vt, which equals displacement; for changing velocity, summing the small areas gives the integral of velocity with respect to time.", "1 mark for area = vt, 1 for extension to changing velocity."),
    ];
    if (t.includes("electric") || t.includes("circuit")) return [
      mcq("A 12 V supply is connected across a 6.0 Ω resistor. What current flows?", ["0.5 A", "2.0 A", "6.0 A", "72 A"], 1, "2.0 A"),
      structured("Two resistors of 4.0 Ω and 6.0 Ω are connected in series to a 20 V supply. Calculate the total resistance and current.", 4, "R = 10 Ω; I = V/R = 2.0 A.", "2 marks resistance, 2 marks current."),
      short("Define potential difference in terms of energy and charge.", 2, "Potential difference is the energy transferred per unit charge, V = W/Q.", "1 mark for energy transferred, 1 for per unit charge or equation."),
      mcq("Which quantity is measured in coulombs?", ["Current", "Potential difference", "Charge", "Resistance"], 1, "Charge"),
      structured("A device transfers 360 J of energy when 30 C of charge passes through it. Calculate the potential difference across the device.", 3, "V = W/Q = 360/30 = 12 V.", "1 mark equation, 1 substitution, 1 answer with unit."),
    ];
    if (t.includes("deformation") || t.includes("elastic")) return [
      mcq("Which quantity is defined as force divided by cross-sectional area?", ["Strain", "Stress", "Young modulus", "Extension"], 1, "Stress"),
      structured("A wire of original length 2.00 m extends by 1.00 mm. Calculate its strain.", 3, "strain = extension/original length = 0.00100/2.00 = 5.00 × 10⁻⁴.", "1 mark formula, 1 substitution, 1 correct dimensionless answer."),
      short("Define Young modulus and state its unit.", 2, "Young modulus is tensile stress divided by tensile strain in the elastic region. Its SI unit is pascal (Pa).", "1 mark definition, 1 for unit."),
      structured("A wire has stress 1.2 × 10⁸ Pa and strain 6.0 × 10⁻⁴. Calculate its Young modulus.", 3, "E = stress/strain = (1.2 × 10⁸)/(6.0 × 10⁻⁴) = 2.0 × 10¹¹ Pa.", "1 mark formula, 1 calculation, 1 unit."),
      short("Describe what happens to a material once it is loaded beyond its elastic limit.", 2, "It no longer returns completely to its original dimensions when the load is removed; permanent deformation remains.", "2 marks for permanent deformation and loss of full recovery."),
    ];
    return [
      short(`For '${topic}', state the relevant physical quantity or law and give its SI unit where applicable.`, 3, `A correct definition/law for ${topic} and the appropriate SI unit where one applies.`, "1 mark for the law/quantity, 1 for definition, 1 for unit."),
      structured(`A measurement related to '${topic}' changes from 20 units to 32 units in 4.0 s. Calculate its average rate of change and state the unit.`, 3, "Average rate of change = (32 - 20)/4.0 = 3.0 units s⁻¹, with the corresponding compound unit.", "1 mark change, 1 division, 1 unit."),
      mcq(`Which statement is essential when reporting a measured result for ${topic}?`, ["Include an appropriate unit", "Remove all units", "Give more significant figures than measured", "Ignore uncertainty"], 1, "Include an appropriate unit"),
      short(`State one experimental limitation that could affect a measurement involving ${topic} and explain how it could affect the result.`, 3, "Any valid limitation with a direction or mechanism for its effect on the measurement.", "1 mark limitation, 2 marks for a clear effect."),
      structured(`Describe a method for investigating a relationship involving '${topic}'. Identify the independent variable, dependent variable and one control variable.`, 5, "A valid controlled experiment with correctly identified independent, dependent and control variables.", "2 marks method, 1 independent, 1 dependent, 1 control."),
    ];
  }

  if (s.includes("math")) {
    if (t.includes("trig")) return [
      mcq("What is the exact value of sin 30°?", ["0", "1/2", "√2/2", "√3/2"], 1, "1/2"),
      structured("Solve 2 sin x = √3 for 0° ≤ x ≤ 360°.", 4, "sin x = √3/2, so x = 60° or 120°.", "1 mark rearrangement, 2 for principal solutions, 1 for both answers in range."),
      short("State the identity connecting sin²x and cos²x.", 1, "sin²x + cos²x = 1."),
      structured("Given tan θ = 3/4 and θ is acute, find sin θ and cos θ.", 4, "Using a 3-4-5 triangle: sin θ = 3/5 and cos θ = 4/5.", "2 marks construction/relationship, 1 each for values."),
      short("Explain why tan x is undefined when cos x = 0.", 2, "tan x = sin x/cos x, so division by zero is undefined when cos x = 0.", "1 mark identity, 1 for undefined division."),
    ];
    if (t.includes("calculus") || t.includes("differentiat")) return [
      mcq("If y = x³, what is dy/dx?", ["x²", "2x²", "3x²", "3x"], 1, "3x²"),
      structured("Differentiate y = 4x³ - 5x² + 7x - 2.", 4, "dy/dx = 12x² - 10x + 7.", "1 mark per correct term up to 4."),
      structured("Find the stationary points of y = x² - 6x + 5 and determine whether each is a maximum or minimum.", 5, "dy/dx = 2x - 6 = 0 gives x = 3; y = -4. Since d²y/dx² = 2 > 0, (3, -4) is a minimum.", "2 marks derivative/solution, 1 coordinate, 2 classification/reasoning."),
      short("State what the gradient of a curve represents at a point.", 2, "The instantaneous rate of change of the dependent variable with respect to the independent variable at that point.", "2 marks for instantaneous rate of change."),
      mcq("What does a positive second derivative at a stationary point indicate?", ["A local maximum", "A local minimum", "No stationary point", "An inflection point necessarily"], 1, "A local minimum"),
    ];
    return [
      structured(`For '${topic}', form an equation using the given values 3, 5 and 8 and solve it for the unknown x.`, 4, "One valid equation consistent with the stated mathematical relationship, followed by a correct solution for x.", "2 marks for a valid setup, 2 for correct solution."),
      mcq(`Which step is safest when solving a numerical problem involving ${topic}?`, ["Check the result against the original conditions", "Ignore restrictions", "Round every intermediate value immediately", "Remove units from all working"], 1, "Check the result against the original conditions"),
      short(`State one condition or restriction that should be checked when solving a problem in ${topic}.`, 2, "A valid domain, denominator, square-root, logarithm or other restriction appropriate to the topic.", "2 marks for a relevant restriction and explanation."),
      structured(`A quantity increases from 18 to 30 over an interval of 6. Calculate its average rate of change and interpret the result.`, 3, "(30 - 18)/6 = 2 units per interval; the quantity increases by an average of 2 units per unit interval.", "1 calculation, 2 interpretation."),
      short(`Explain why an answer to a ${topic} problem should be checked for consistency with the original question.`, 2, "Algebraic or numerical manipulation can introduce extraneous or invalid results; checking confirms the answer satisfies the original conditions.", "1 mark for invalid/extraneous possibility, 1 for substitution/checking."),
    ];
  }

  if (level === "hard") return [
    structured(`Analyse the following problem in '${topic}'. State the governing principle, make one justified assumption, and derive a solution method before giving the final result.`, 6, `A correct governing principle for ${topic}, a justified assumption, a logically complete method and a valid final result.`, "Award up to 2 marks principle, 1 assumption, 2 method, 1 result."),
    short(`Evaluate one limitation of applying a standard model to a real-world problem involving '${topic}'.`, 4, "A valid limitation plus an explanation of why the model may deviate from reality.", "2 marks limitation, 2 explanation."),
    mcq(`Which response gives the strongest evidence when evaluating a claim about ${topic}?`, ["A relevant measured/calculated result with reasoning", "An unsupported opinion", "A copied definition", "An unrelated example"], 1, "A relevant measured/calculated result with reasoning"),
    structured(`Design a short investigation into '${topic}'. Identify the variable changed, the quantity measured, two controls and one source of uncertainty.`, 6, "A coherent investigation with correctly identified variables, controls and uncertainty.", "1 variable changed, 1 measured, 2 controls, 2 uncertainty/method marks."),
    short(`Compare two valid approaches to a problem in '${topic}' and state when each would be preferable.`, 4, "Two relevant approaches with a technically correct comparison and context for choosing each.", "2 marks approaches, 2 marks comparison/choice."),
  ];

  return [
    short(`Define '${topic}' precisely and give one concrete example of its use in ${subject}.`, 3, `A precise definition of ${topic} and one relevant, correctly explained example in ${subject}.`, "1 mark definition, 2 example."),
    structured(`Apply your knowledge of '${topic}' to a new scenario. State the relevant principle, show the main reasoning steps and give a justified conclusion.`, 5, `A correct principle, coherent reasoning and a conclusion that follows from the scenario.",`, "1 mark principle, 3 reasoning, 1 conclusion."),
    mcq(`Which is the most reliable first step when answering a ${subject} question on ${topic}?`, ["Identify exactly what the question asks for", "Guess the final answer", "Ignore given data", "Use an unrelated formula"], 1, "Identify exactly what the question asks for"),
    short(`State two common errors a student could make when answering a question on '${topic}'.`, 2, "Any two topic-relevant errors, such as using the wrong definition, formula, unit, assumption or interpretation.", "1 mark per valid error."),
    structured(`Explain how you would verify an answer obtained for '${topic}'. Include one independent check.`, 4, "A valid verification method such as substitution, dimensional check, alternative calculation, limiting case or comparison with expected behaviour.", "2 marks method, 2 correct independent check."),
  ];
}
