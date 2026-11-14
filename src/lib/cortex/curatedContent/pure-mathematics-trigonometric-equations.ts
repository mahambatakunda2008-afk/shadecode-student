import type { LessonQualityBlock } from "../lessonQuality";

/**
 * Original Pure Mathematics trigonometric equations starter.
 * Draft only: exact syllabus-year mapping and independent review remain due.
 */
export const PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER: {
  title: string;
  blocks: LessonQualityBlock[];
} = {
  title: "Trigonometric equations: solve within a stated interval",
  blocks: [
    { type: "objective", title: "Learning objectives", content: "By the end, you should be able to solve basic sine, cosine and tangent equations over a stated interval, use symmetry and periodicity to find all solutions, and check that every answer lies in the required range." },
    { type: "prior", title: "Before you start", content: "Know the unit circle or the standard angles, and distinguish degrees from radians. Unless a question says otherwise, use the angle unit shown in the question throughout. A trigonometric equation usually has several solutions because the functions repeat." },
    { type: "concept", title: "Solve the reference equation first", content: "For sin x = k, cos x = k or tan x = k, first find the reference angle using the inverse trigonometric function or exact standard-angle values. Then use the sign of the function in each quadrant and its period to find every solution in the requested interval." },
    { type: "formula", title: "Signs and periods", content: "In degrees, sine is positive in quadrants I and II, cosine is positive in quadrants I and IV, and tangent is positive in quadrants I and III. The periods are 360° for sine and cosine and 180° for tangent. In radians, the corresponding periods are 2π, 2π and π." },
    { type: "diagram", title: "Draw a unit-circle sign guide", content: "Learner-drawn prompt: sketch coordinate axes through a circle centred at the origin. Mark 0°, 90°, 180°, 270° and 360°. Label the signs of sine (y-coordinate), cosine (x-coordinate) and tangent (y/x) in each quadrant. This sketch helps identify the second solution rather than relying on inverse sine alone." },
    { type: "example", title: "Worked example: solve sin x = 1/2", content: "Solve for 0° ≤ x < 360°. The reference angle is 30° because sin 30° = 1/2. Sine is positive in quadrants I and II, so x = 30° or x = 180° − 30° = 150°. Both lie in the interval, and there are no other solutions in one full turn." },
    { type: "checkpoint", title: "Predict the quadrants", content: "Without calculating the reference angle, identify the quadrants where cos x = −1/2 can hold. Then calculate the reference angle and list the solutions for 0° ≤ x < 360°. Check your answer against the sign of cosine in each quadrant." },
    { type: "example", title: "Worked example: solve cos x = −√3/2", content: "For 0° ≤ x < 360°, the reference angle is 30° because cos 30° = √3/2. Cosine is negative in quadrants II and III, so x = 180° − 30° = 150° and x = 180° + 30° = 210°. Both answers have negative cosine, as required." },
    { type: "example", title: "Worked example: solve tan x = 1", content: "For 0° ≤ x < 360°, tan 45° = 1. Tangent is positive in quadrants I and III, and its period is 180°, so x = 45° and x = 45° + 180° = 225°. Do not add 360° as the next distinct solution inside this interval." },
    { type: "concept", title: "Equations with a multiple angle", content: "For an equation such as sin 2x = 1/2, solve for the angle 2x first, using the interval that follows from multiplying the original interval by 2. Then divide each resulting angle by 2 and retain only values of x in the original interval. Do not divide before finding all solutions for the multiple angle." },
    { type: "example", title: "Worked example: solve sin 2x = 1/2", content: "For 0° ≤ x < 180°, we have 0° ≤ 2x < 360°. From the sine example, 2x = 30° or 150°. Dividing each by 2 gives x = 15° or 75°. Both satisfy the original interval. The transformed interval is essential for finding all answers." },
    { type: "concept", title: "Rearrange before using inverse functions", content: "If the equation is 2 cos x + 1 = 0, rearrange to cos x = −1/2 before using inverse trigonometric functions. If an equation contains a factor such as sin x(2 cos x − 1) = 0, use the zero-product rule and solve each factor separately, then combine and remove duplicate solutions." },
    { type: "misconception", title: "Common mistakes", content: "Inverse sine or cosine normally returns one principal value, not every solution in the interval. Check the signs by quadrant, use the correct period, preserve the interval endpoints exactly as stated, and do not mix degrees and radians. When an angle is doubled, transform the interval before solving." },
    { type: "practice", title: "Practice ladder with answers", content: "1. Solve sin x = √2/2 for 0° ≤ x < 360°. Answer: 45°, 135°. 2. Solve cos x = 1/2 over the same interval. Answer: 60°, 300°. 3. Solve tan x = −1 for 0° ≤ x < 360°. Answer: 135°, 315°. 4. Solve sin 2x = √3/2 for 0° ≤ x < 180°. First 2x = 60°, 120°, so x = 30°, 60°. 5. Explain why solving sin x = 1/2 with only x = sin⁻¹(1/2) is incomplete over a full turn." },
    { type: "exam", title: "Exam method", content: "Write the reference angle, state the relevant quadrants, and list every solution in the interval. For multiple-angle equations, write the transformed interval explicitly, solve for the full angle, then divide back and check the original range. Keep exact angles when the question allows them, and state whether your answers are in degrees or radians." },
    { type: "summary", title: "The strategy to retain", content: "Rearrange to isolate one trigonometric function, find its reference angle, use quadrant signs and periodicity to generate all solutions, then check the stated interval. For sin nx, cos nx or tan nx, transform the interval for nx before solving. An inverse trigonometric function gives a starting point, not automatically the complete solution set." },
  ],
};
