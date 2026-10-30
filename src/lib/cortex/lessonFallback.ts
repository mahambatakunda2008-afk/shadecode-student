import type { LessonQualityBlock } from "./lessonQuality";
import { PHYSICS_KINEMATICS_STARTER } from "./curatedContent/physics-kinematics";
import { PHYSICS_ACCELERATED_MOTION_STARTER } from "./curatedContent/physics-accelerated-motion";
import { PHYSICS_MOMENTUM_STARTER } from "./curatedContent/physics-momentum";
import { PHYSICS_PRACTICAL_MEASUREMENT_STARTER } from "./curatedContent/physics-practical-measurement";
import { PURE_MATHEMATICS_ALGEBRA_STARTER } from "./curatedContent/pure-mathematics-algebra";
import { PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER } from "./curatedContent/pure-mathematics-logs-exponentials";
import { PURE_MATHEMATICS_DIFFERENTIATION_STARTER } from "./curatedContent/pure-mathematics-differentiation";
import { PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER } from "./curatedContent/pure-mathematics-sequences-series";
import { PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER } from "./curatedContent/pure-mathematics-trigonometric-equations";
import { THEORY_EXCLUSIONS, THEORY_LESSONS } from "./theoryLessons";

type FallbackLesson = { title: string; blocks: LessonQualityBlock[] };

/**
 * Last-resort, hand-authored lessons used only when every AI provider in the
 * chain fails (a real, observed event -- see production logs for Gemini
 * 503/429 and provider-chain-exhausted errors). This is deliberately a small,
 * curated set of high-traffic foundational topics, not a general offline
 * lesson generator: writing genuine teaching content for every syllabus topic
 * by hand isn't something to fake coverage of. Keyed by normalized
 * "subject|topic" so it's cheap to keep adding entries over time without
 * restructuring callers.
 */
const FALLBACK_LESSONS: Record<string, FallbackLesson> = {
  "mathematics|coordinate geometry": {
    title: "Coordinate geometry: gradients, distances, midpoints, and straight-line equations",
    blocks: [
      { type: "objective", title: "What you will learn", content: "By the end, you should be able to calculate a gradient, distance and midpoint from two coordinates, find the equation of a straight line, and use parallel and perpendicular gradient rules. Each method starts by identifying the coordinates carefully." },
      { type: "prior", title: "Read coordinates accurately", content: "A point is written as (x, y): move along the x-axis first, then the y-axis. For points A(1, -4) and B(5, 8), x₁ = 1, y₁ = -4, x₂ = 5 and y₂ = 8. Keep each x-coordinate paired with its own y-coordinate throughout the calculation." },
      { type: "definition", title: "Gradient measures steepness", content: "The gradient is the change in y divided by the corresponding change in x. It is positive when the line rises from left to right, negative when it falls, zero for a horizontal line, and undefined for a vertical line." },
      { type: "diagram", title: "Visualise gradient as rise over run", content: "coordinate-plane" },
      { type: "formula", title: "Gradient formula", content: "For two points (x₁, y₁) and (x₂, y₂), use $m = \\frac{y_2-y_1}{x_2-x_1}$. Subtract in the same order in the numerator and denominator. If x₂ = x₁, the denominator is zero and the line is vertical, so its gradient is undefined." },
      { type: "example", title: "Worked example 1: calculate a gradient", content: "Given: A(1, -4) and B(5, 8). Method: $m = \\frac{y_2-y_1}{x_2-x_1}$. Step 1: Find the change in y: $8-(-4)=12$. Step 2: Find the change in x: $5-1=4$. Step 3: Divide: $m=\\frac{12}{4}=3$. Answer: the gradient is 3. The line rises 3 units for each 1 unit moved to the right." },
      { type: "checkpoint", title: "Check the signs", content: "Find the gradient through P(2, 5) and Q(6, -3). Write the change in y and the change in x separately before dividing. Keep your answer hidden until you have calculated both differences." },
      { type: "concept", title: "Distance between two points", content: "The horizontal separation is $x_2-x_1$ and the vertical separation is $y_2-y_1$. These form the perpendicular sides of a right-angled triangle, so Pythagoras gives the straight-line distance between the points." },
      { type: "formula", title: "Distance formula", content: "The distance between $(x_1,y_1)$ and $(x_2,y_2)$ is $d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$. Square both coordinate differences before adding them, so negative differences do not make the distance negative." },
      { type: "example", title: "Worked example 2: find a distance", content: "Given: A(1, 2) and B(4, 6). Step 1: The differences are $4-1=3$ and $6-2=4$. Step 2: Use the distance formula: $d=\\sqrt{3^2+4^2}$. Step 3: $d=\\sqrt{9+16}=\\sqrt{25}=5$. Answer: AB = 5 units." },
      { type: "concept", title: "Midpoint of a line segment", content: "The midpoint lies halfway between the endpoints. Average the two x-coordinates to obtain its x-coordinate, and average the two y-coordinates to obtain its y-coordinate. Do not average an x-coordinate with a y-coordinate." },
      { type: "example", title: "Worked example 3: find the midpoint", content: "Given: A(-2, 3) and B(6, 7). The midpoint is $M=(\\frac{x_1+x_2}{2},\\frac{y_1+y_2}{2})$. Its x-coordinate is $\\frac{-2+6}{2}=2$ and its y-coordinate is $\\frac{3+7}{2}=5$. Answer: M(2, 5). This point is halfway along the segment in both coordinate directions." },
      { type: "concept", title: "Equation of a straight line", content: "The form $y=mx+c$ uses gradient m and y-intercept c. If you know a point and the gradient, substitute the point's x and y values to find c. The form $y-y_1=m(x-x_1)$ is useful when a point and gradient are already known." },
      { type: "example", title: "Worked example 4: find a line equation", content: "Find the equation of the line with gradient 2 passing through (3, 7). Start with $y=mx+c$, so $7=2(3)+c$. Therefore $7=6+c$ and $c=1$. Answer: $y=2x+1$. Check by substituting (3, 7): the right-hand side is $2(3)+1=7$, as required." },
      { type: "concept", title: "Parallel and perpendicular lines", content: "Distinct parallel non-vertical lines have equal gradients. For two non-vertical perpendicular lines, the product of their gradients is -1, so if one gradient is m, the other is $-\\frac{1}{m}$. A horizontal line is perpendicular to a vertical line; the vertical line's gradient is undefined." },
      { type: "misconception", title: "Common mistakes", content: "Do not reverse only one subtraction in the gradient formula. For example, using $y_1-y_2$ in the numerator requires $x_1-x_2$ in the denominator too. Do not confuse the midpoint formula with the distance formula, and remember that a vertical line has no defined gradient." },
      { type: "practice", title: "Practice set with answers", content: "1. Find the gradient through A(3, 6) and B(7, 2). Working: $m=\\frac{2-6}{7-3}=\\frac{-4}{4}=-1$. Answer: -1. 2. Find the distance between P(0, 1) and Q(6, 9). Working: $d=\\sqrt{6^2+8^2}=\\sqrt{100}=10$. Answer: 10 units. 3. Find the midpoint of A(-5, 4) and B(1, 10). Working: $M=(\\frac{-5+1}{2},\\frac{4+10}{2})=(-2,7)$. Answer: (-2, 7). 4. Find the equation with gradient 3 through (2, 5). Working: $5=3(2)+c$, so $c=-1$. Answer: $y=3x-1$." },
      { type: "exam", title: "Exam-style question with full working", content: "A line passes through A(-1, 2) and B(3, 10). (a) Find its gradient. $m=\\frac{10-2}{3-(-1)}=\\frac{8}{4}=2$. (b) Find its equation using $y=mx+c$. Substitute A(-1, 2): $2=2(-1)+c$, so $c=4$. The equation is $y=2x+4$. (c) Find the midpoint of AB: $M=(\\frac{-1+3}{2},\\frac{2+10}{2})=(1,6)$. Check: when x=1, the line gives y=2(1)+4=6, so the midpoint lies on the line." },
      { type: "summary", title: "The method to remember", content: "Gradient: divide change in y by change in x. Distance: use Pythagoras on the coordinate differences. Midpoint: average the x-values and average the y-values. Straight-line equation: use $y=mx+c$ or $y-y_1=m(x-x_1)$. For every question, label coordinates carefully and substitute the result back to check it." },
    ],
  },
  "mathematics|numerical solution of equations": {
    title: "Numerical solution of equations: locate, narrow, and estimate roots",
    blocks: [
      { type: "objective", title: "What you will learn", content: "By the end, you should be able to explain what a numerical root is, locate a root using a sign change, narrow an interval by bisection, and use iteration carefully to obtain an approximate solution. Numerical answers are estimates, so state the method and appropriate accuracy." },
      { type: "prior", title: "The meaning of a root", content: "A root of f(x) = 0 is a value of x that makes the function equal to zero. Graphically, it is an x-coordinate where y = f(x) meets or touches the x-axis. Some equations cannot be rearranged into a convenient exact solution, so numerical methods approximate the root." },
      { type: "diagram", title: "Bracket a root using a sign change", content: "root-bracket" },
      { type: "concept", title: "Why numerical methods work", content: "Instead of finding an exact algebraic expression, a numerical method produces a sequence of increasingly useful estimates. You must keep track of the interval or iteration rule, avoid premature rounding, and check the final estimate in the original equation." },
      { type: "example", title: "Worked example: locate a root by sign change", content: "Find an interval containing a root of f(x) = x³ − x − 2. At x = 1, f(1) = 1 − 1 − 2 = −2. At x = 2, f(2) = 8 − 2 − 2 = 4. The function changes sign between 1 and 2, so continuity guarantees at least one root in (1, 2). A sign change is evidence of a crossing, but it does not find the root by itself." },
      { type: "checkpoint", title: "Try the sign test", content: "For f(x) = x² − 5, calculate f(2) and f(3). Do the signs differ? What does that tell you about a root between those values? Write both function values before deciding." },
      { type: "concept", title: "Bisection: halve the interval", content: "Once you have an interval [a, b] with opposite signs at its ends, calculate the midpoint m = (a + b)/2. Evaluate f(m). Keep the half whose endpoints have opposite signs, then repeat. Each step halves the interval width, so after n steps its width is (b − a)/2ⁿ, provided the sign-change condition continues to hold." },
      { type: "example", title: "Worked example: one bisection step", content: "For f(x) = x³ − x − 2, the root lies between 1 and 2. The midpoint is m = (1 + 2)/2 = 1.5. Then f(1.5) = 3.375 − 1.5 − 2 = −0.125. Since f(1.5) is negative and f(2) is positive, the root is in (1.5, 2). The new interval has width 0.5 instead of 1." },
      { type: "definition", title: "Linear interpolation (regula falsi idea)", content: "If f(a) and f(b) have opposite signs, a straight line between (a, f(a)) and (b, f(b)) crosses the x-axis at an estimate x ≈ [a f(b) − b f(a)]/[f(b) − f(a)]. This uses the secant line rather than the midpoint. It can give a better estimate in some cases, but you must still check the function value and maintain a reliable bracket when the chosen method requires one." },
      { type: "concept", title: "Iteration from a rearranged equation", content: "An equation f(x) = 0 can sometimes be rearranged into x = g(x). Choose a starting value x₀, then calculate x₁ = g(x₀), x₂ = g(x₁), and continue. The values may converge towards a solution, but not every rearrangement does: estimates can diverge or oscillate. A successful iteration should settle to stable values and satisfy the original equation approximately." },
      { type: "example", title: "Worked example: fixed-point iteration", content: "To solve x² + x − 2 = 0, one possible rearrangement is x = 2 − x². Starting at x₀ = 1 gives x₁ = 1, so this particular start is already fixed. But this example also warns you to check the method: the equation has another root at −2, and this rearrangement is not guaranteed to find every root. The choice of rearrangement and starting value matters." },
      { type: "misconception", title: "Common mistakes", content: "A sign change across an interval guarantees a root only when the function is continuous there; it can miss a root where the graph just touches the axis. Do not confuse an approximate numerical root with an exact solution. Do not round every intermediate value, and do not assume every iteration formula converges. Always substitute the final estimate into the original equation." },
      { type: "exam", title: "A reliable exam method", content: "Show the function values at the interval endpoints and state why their signs locate a root. For bisection, show the midpoint, its function value, and the interval retained. For an iteration question, write the rearranged formula, the starting value, and enough successive values to demonstrate the process. Give the final answer to the requested accuracy and check it in the original equation." },
      { type: "practice", title: "Practice ladder", content: "1. For f(x) = x³ − 4, show that a root lies between 1 and 2. 2. Perform one bisection step on that interval and decide which half contains the root. 3. Explain why a sign change can miss a root where a curve touches the x-axis. 4. Given xₙ₊₁ = (3 + xₙ)^(1/2) and a stated starting value, calculate the next two iterates using full calculator precision, then inspect whether the values are settling. 5. Substitute a numerical estimate into the original equation and report the residual f(x)." },
      { type: "summary", title: "The essential strategy", content: "Numerical solution means estimating a root when an exact algebraic method is inconvenient. A sign change locates a bracket, bisection repeatedly halves that bracket, interpolation estimates a crossing from a secant line, and fixed-point iteration repeatedly applies x = g(x). Show your working, keep enough precision, check convergence, and verify the final estimate in the original equation. Follow the exact numerical method required by your course or question." },
    ],
  },
  "mathematics|integration by substitution": {
    "title": "Integration by substitution: reverse the chain rule",
    "blocks": [
      {
        "type": "objective",
        "title": "Learning targets",
        "content": "By the end, you should be able to recognise a composite function with an inner derivative, choose a substitution, change the differential correctly, and return to the original variable."
      },
      {
        "type": "prior",
        "title": "The chain rule in reverse",
        "content": "If y = F(u) and u = g(x), differentiation gives dy/dx = F'(u)g'(x). Substitution reverses this pattern: when an integrand contains a function of g(x) multiplied by g'(x), set u = g(x) so the integral becomes simpler."
      },
      {
        "type": "concept",
        "title": "Choose the inner function",
        "content": "Look for a bracket, a repeated expression, or a function whose derivative also appears in the integrand. Let u equal that inner expression, calculate du/dx, and rearrange to obtain du. Then replace every matching x-expression and dx factor consistently."
      },
      {
        "type": "formula",
        "title": "The substitution pattern",
        "content": "If u = g(x), then du = g'(x) dx. Therefore ∫ f(g(x))g'(x) dx = ∫ f(u) du. This is a pattern, not permission to replace only part of the integrand: the differential must change with the variable."
      },
      {
        "type": "example",
        "title": "Worked example: a linear inner function",
        "content": "Evaluate ∫ 2x(x² + 1)^4 dx. Let u = x² + 1, so du = 2x dx. The integral becomes ∫u^4 du = u^5/5 + C. Substitute back: (x² + 1)^5/5 + C. Differentiating gives 2x(x² + 1)^4, confirming the result."
      },
      {
        "type": "checkpoint",
        "title": "Choose a substitution",
        "content": "For ∫ 3x²(x³ + 4)^5 dx, identify a useful u and write du. Do not integrate yet. Check whether the factor multiplying the bracket is exactly the derivative of the inner expression."
      },
      {
        "type": "example",
        "title": "Worked example: exponential function",
        "content": "Evaluate ∫ e^(3x) dx. Let u = 3x, so du = 3 dx and dx = du/3. Then the integral is (1/3)∫e^u du = e^u/3 + C = e^(3x)/3 + C. The factor one third appears because the inner derivative is 3."
      },
      {
        "type": "concept",
        "title": "Definite integrals: change the limits",
        "content": "For a definite integral, if you change from x to u, also transform both limits using u = g(x). Then integrate in u and use the new limits. Alternatively, integrate and substitute back into x before applying the original limits, but never mix x-limits with a u-integral."
      },
      {
        "type": "example",
        "title": "Worked example: definite substitution",
        "content": "Evaluate ∫ from x=0 to x=1 of 2x(x² + 1)^2 dx. Set u = x² + 1, du = 2x dx. The limits become u=1 and u=2. The integral is ∫ from 1 to 2 of u² du = [u³/3] from 1 to 2 = (8 - 1)/3 = 7/3."
      },
      {
        "type": "misconception",
        "title": "Common mistakes",
        "content": "Do not forget a constant factor when du is not exactly the remaining factor. Do not leave an x inside an integral after changing to u unless you explicitly rewrite it in u. For definite integrals, change the limits or substitute back before using the original limits."
      },
      {
        "type": "exam",
        "title": "Exam method",
        "content": "Write u = ..., then calculate du clearly. Rewrite the entire integral in the new variable, integrate, and substitute back if the integral is indefinite. For a definite integral, show the transformed limits and evaluate carefully. Differentiate an indefinite answer to check it."
      },
      {
        "type": "practice",
        "title": "Practice ladder",
        "content": "1. Evaluate ∫ 6x(3x² + 2)^4 dx. 2. Evaluate ∫ x e^(x²) dx. 3. Evaluate ∫ from 0 to 1 of 2x(x² + 3)^2 dx. 4. Explain why ∫e^(5x) dx contains a factor of one fifth. For each, identify the inner function and its differential before integrating."
      },
      {
        "type": "summary",
        "title": "The essential strategy",
        "content": "Substitution reverses the chain rule. Choose an inner function whose derivative is present, convert the differential, rewrite the whole integrand, integrate, and return to x or transform the definite limits. The final derivative should reproduce the original integrand."
      }
    ]
  },
  "mathematics|integration by parts": {
    "title": "Integration by parts: turn a product into a simpler integral",
    "blocks": [
      {
        "type": "objective",
        "title": "Learning targets",
        "content": "By the end, you should be able to apply integration by parts to products, choose u and dv sensibly, repeat the method when needed, and use the original integral to check whether the result is reasonable."
      },
      {
        "type": "prior",
        "title": "Where the formula comes from",
        "content": "The product rule says d(uv)/dx = u(dv/dx) + v(du/dx). Rearranging and integrating gives the integration-by-parts formula. It is useful when differentiating one factor simplifies it and integrating the other factor is straightforward."
      },
      {
        "type": "formula",
        "title": "The formula",
        "content": "For an indefinite integral, ∫u dv = uv - ∫v du + C. Choose u as the factor to differentiate and dv as the factor to integrate. Then calculate du and v before substituting into the formula."
      },
      {
        "type": "concept",
        "title": "Choosing u and dv",
        "content": "A useful choice makes the remaining integral simpler than the original. In products involving a polynomial and an exponential or trigonometric function, differentiating the polynomial often reduces its power. With logarithmic functions, differentiating the logarithm may remove it from the integrand."
      },
      {
        "type": "example",
        "title": "Worked example: x e^x",
        "content": "Evaluate ∫x e^x dx. Choose u=x and dv=e^x dx, so du=dx and v=e^x. Apply the formula: ∫x e^x dx = x e^x - ∫e^x dx = x e^x - e^x + C = e^x(x - 1) + C. Differentiating confirms the product x e^x."
      },
      {
        "type": "checkpoint",
        "title": "Pick u and dv",
        "content": "For ∫x cos x dx, which factor would you differentiate and which would you integrate? Write u, dv, du, and v first. Choose the option that leaves a simpler integral after applying the formula."
      },
      {
        "type": "example",
        "title": "Worked example: x sin x",
        "content": "Evaluate ∫x sin x dx. Let u=x and dv=sin x dx. Then du=dx and v=-cos x. The result is -x cos x - ∫(-cos x) dx = -x cos x + sin x + C. Differentiate: -cos x + x sin x + cos x = x sin x."
      },
      {
        "type": "concept",
        "title": "When to repeat the method",
        "content": "If the new integral still contains a product that can be simplified by parts, apply the formula again. For polynomial factors, repeated differentiation eventually reaches zero. Keep the signs and boundary terms organised at each step."
      },
      {
        "type": "example",
        "title": "Worked example: a logarithm",
        "content": "For ∫ln x dx with x>0, write it as ∫ln x · 1 dx. Choose u=ln x and dv=dx, so du=1/x dx and v=x. Then the integral is x ln x - ∫x(1/x) dx = x ln x - x + C."
      },
      {
        "type": "misconception",
        "title": "Common mistakes",
        "content": "The formula contains a minus sign: uv - ∫v du. A frequent error is forgetting that the integral of sin x is -cos x. Another is choosing u and dv without checking whether the remaining integral is simpler. Always include +C for an indefinite integral."
      },
      {
        "type": "exam",
        "title": "Exam method",
        "content": "State u and dv, then show du and v. Substitute into uv - ∫v du with brackets where necessary. Simplify the remaining integral and include the constant. For a definite integral, evaluate the boundary term uv at both limits and apply the limits to the remaining integral."
      },
      {
        "type": "practice",
        "title": "Practice ladder",
        "content": "1. Evaluate ∫x e^x dx. 2. Evaluate ∫x cos x dx. 3. Evaluate ∫ln x dx for x>0. 4. Explain why choosing u=x is useful in ∫x sin x dx. Differentiate each indefinite answer to verify it."
      },
      {
        "type": "summary",
        "title": "The essential strategy",
        "content": "Integration by parts is the reverse of the product rule: ∫u dv = uv - ∫v du. Choose the factor whose derivative simplifies the expression, integrate the other factor, apply the minus sign carefully, and check the result by differentiation."
      }
    ]
  },
  "mathematics|trigonometric integration": {
    "title": "Trigonometric integration: choose identities, transform, and integrate",
    "blocks": [
      {
        "type": "objective",
        "title": "Learning targets",
        "content": "By the end, you should be able to integrate basic trigonometric functions, use identities to simplify powers and products, and check an antiderivative by differentiating it. Keep track of constants and the interval restrictions on any identity you use."
      },
      {
        "type": "prior",
        "title": "The essential derivatives",
        "content": "You need these derivative facts: d(sin x)/dx = cos x, d(cos x)/dx = -sin x, d(tan x)/dx = sec²x. Integration reverses differentiation, so ∫cos x dx = sin x + C, ∫sin x dx = -cos x + C, and ∫sec²x dx = tan x + C."
      },
      {
        "type": "concept",
        "title": "Start with the simplest form",
        "content": "Before choosing a technique, inspect the integrand. A single sine, cosine, or sec² term usually uses a standard result. If powers or products appear, look for an identity that turns the expression into a sum of terms you can integrate separately."
      },
      {
        "type": "formula",
        "title": "Standard results",
        "content": "For angles measured in radians: ∫sin x dx = -cos x + C; ∫cos x dx = sin x + C; ∫sec²x dx = tan x + C; ∫cosec²x dx = -cot x + C. Also ∫tan x dx = -ln|cos x| + C, equivalently ln|sec x| + C where defined. The constant C is required for an indefinite integral."
      },
      {
        "type": "example",
        "title": "Worked example: integrate a simple combination",
        "content": "Evaluate ∫(3 cos x - 2 sin x) dx. Integrate each term separately: 3∫cos x dx - 2∫sin x dx = 3 sin x + 2 cos x + C. Check by differentiating: 3 cos x - 2 sin x, which matches the original integrand."
      },
      {
        "type": "checkpoint",
        "title": "Try a standard integral",
        "content": "Without looking back, evaluate ∫(4 sin x + cos x) dx. Write the antiderivative of each term and include one constant of integration. Then differentiate your answer to check both signs."
      },
      {
        "type": "concept",
        "title": "Use identities for squared terms",
        "content": "The Pythagorean identity sin²x + cos²x = 1 is useful, but for integrating a square it is often better to use the double-angle forms: sin²x = (1 - cos 2x)/2 and cos²x = (1 + cos 2x)/2. These convert squared functions into a constant plus a cosine term."
      },
      {
        "type": "example",
        "title": "Worked example: integrate sin squared",
        "content": "Evaluate ∫sin²x dx. Replace sin²x with (1 - cos 2x)/2. Then integrate: ∫(1/2 - cos 2x/2) dx = x/2 - (1/2)(sin 2x/2) + C = x/2 - sin 2x/4 + C. Differentiate the result to recover sin²x using the double-angle identity."
      },
      {
        "type": "example",
        "title": "Worked example: integrate cos squared",
        "content": "Evaluate ∫cos²x dx. Use cos²x = (1 + cos 2x)/2. Therefore ∫cos²x dx = ∫(1/2 + cos 2x/2) dx = x/2 + sin 2x/4 + C. The factor of 1/2 inside the angle matters: ∫cos 2x dx = sin 2x/2."
      },
      {
        "type": "concept",
        "title": "Products: simplify before integrating",
        "content": "For products such as sin x cos x, a double-angle identity can make the integral immediate: sin 2x = 2 sin x cos x, so sin x cos x = sin 2x/2. For more complicated products or mixed powers, decide whether a substitution or an identity gives the simplest integrand. Do not expand blindly."
      },
      {
        "type": "example",
        "title": "Worked example: a product",
        "content": "Evaluate ∫sin x cos x dx. Since sin 2x = 2 sin x cos x, rewrite the integrand as (1/2)sin 2x. Its integral is (1/2)(-cos 2x/2) + C = -cos 2x/4 + C. An equivalent answer is sin²x/2 + C, because the two expressions differ only by a constant."
      },
      {
        "type": "misconception",
        "title": "Common errors",
        "content": "Do not forget the chain factor: ∫cos 2x dx is sin 2x/2, not sin 2x. Do not integrate sin x as +cos x; its antiderivative is -cos x. Include +C for an indefinite integral. When using ln results, preserve absolute-value bars where the expression may be negative."
      },
      {
        "type": "exam",
        "title": "A dependable exam method",
        "content": "First identify whether the integrand is a standard function, a power, or a product. State the identity you use, simplify fully, then integrate term by term. Keep brackets and coefficients visible when the angle is 2x or another multiple of x. Finish with +C and, when possible, differentiate your answer as a check."
      },
      {
        "type": "practice",
        "title": "Practice ladder",
        "content": "1. Evaluate ∫(2 cos x - 5 sin x) dx. 2. Evaluate ∫cos²x dx using a double-angle identity. 3. Evaluate ∫sin x cos x dx using sin 2x = 2 sin x cos x. 4. Explain why ∫cos 3x dx = sin 3x/3 + C. 5. Differentiate x/2 - sin 2x/4 and show that it equals sin²x."
      },
      {
        "type": "summary",
        "title": "The core strategy",
        "content": "Basic trigonometric integrals follow directly from derivative facts. For squared sine and cosine, use double-angle identities; for products, look for a product-to-double-angle transformation or a useful substitution. Track the coefficient introduced by the chain rule in reverse, include +C, and verify by differentiating."
      }
    ]
  },
  "mathematics|trigonometric identities": {
    title: "Trigonometric identities: transform, prove, simplify",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to use fundamental trigonometric identities to transform expressions, prove an identity by working on one side, and choose an efficient identity when simplifying." },
      { type: "prior", title: "Before you start", content: "You need to know that tan θ = sin θ / cos θ and that sin²θ means (sin θ)². The identities below hold for every angle for which the expressions are defined." },
      { type: "definition", title: "What is an identity?", content: "A trigonometric identity is an equation that is true for every allowed value of the angle. This differs from an ordinary equation, where you usually find particular values that make the statement true." },
      { type: "diagram", title: "Unit circle connects sine and cosine", content: "unit-circle" },
      { type: "formula", title: "The core identities", content: "Pythagorean identities: sin²θ + cos²θ = 1; 1 + tan²θ = sec²θ; 1 + cot²θ = csc²θ. Reciprocal relationships: secθ = 1/cosθ, cscθ = 1/sinθ, cotθ = 1/tanθ. Quotient relationships: tanθ = sinθ/cosθ and cotθ = cosθ/sinθ. These let you replace one form with another without changing its value." },
      { type: "concept", title: "Think in transformations", content: "Do not treat identities as a list to deploy randomly. Inspect the expression and ask what form would make the next step simpler. A numerator such as 1 − sin²θ suggests cos²θ. A term 1 + tan²θ suggests sec²θ. In a proof, transform one side until it becomes exactly the other side." },
      { type: "example", title: "Worked proof: one side only", content: "Prove that (1 − sin²θ) / cosθ = cosθ.\nStep 1: Start with the left side, (1 − sin²θ) / cosθ.\nStep 2: Use sin²θ + cos²θ = 1, so 1 − sin²θ = cos²θ.\nStep 3: Substitute: (1 − sin²θ)/cosθ becomes cos²θ/cosθ.\nStep 4: Simplify cos²θ/cosθ = cosθ, provided the original denominator is defined.\nOnly the left side was transformed, so every step preserves equality." },
      { type: "checkpoint", title: "Pause and choose", content: "Pause before reading further. How would you simplify 1 + tan²θ? Which identity gives the shortest route? Write the next line yourself before checking your notes." },
      { type: "example", title: "Worked simplification: spot the structure", content: "Simplify (1 − cos²θ) / sinθ.\nStep 1: Look at the numerator, 1 − cos²θ.\nStep 2: Match it to the rearranged Pythagorean identity: 1 − cos²θ = sin²θ.\nStep 3: Substitute: the expression becomes sin²θ/sinθ.\nStep 4: Cancel one factor of sinθ (valid when sinθ is non-zero) to get sinθ.\nThe important step was choosing the identity from the structure instead of expanding blindly." },
      { type: "misconception", title: "Common traps", content: "Do not change both sides of an identity proof at the same time, because that can hide an invalid step. Do not cancel terms across addition: (sin²θ + cos²θ)/sinθ is not sinθ + cosθ. Also check denominator restrictions before cancelling a factor." },
      { type: "application", title: "Use it yourself", content: "Task: simplify (sec²θ − 1) / tanθ without a calculator. Success criteria: identify the matching identity, show each transformation, simplify to one basic trigonometric ratio, and state any restriction created by a denominator. Do not expand randomly." },
      { type: "exam", title: "Exam transfer", content: "For an identity-proof question, write a clear chain of equivalent expressions and state the identity used when it matters. For example, if asked to prove an expression involving tanθ and cotθ equals sec²θ, decide whether reciprocal relationships or rewriting in sin and cos gives the cleaner route. Treat an invented practice question as practice, not as an official past-paper question." },
      { type: "practice", title: "Progressive practice", content: "1. Simplify 1 − sin²θ. Answer guidance: identify the Pythagorean identity.\n2. Simplify (1 − cos²θ)/sinθ. Answer guidance: replace the numerator first, then cancel carefully.\n3. Prove that (tanθ + cotθ)/tanθ = sec²θ. Answer guidance: rewrite cotθ as 1/tanθ, then simplify.\n4. Prove that (sec²θ − 1)/tanθ = tanθ. Answer guidance: use the identity connecting tan²θ and sec²θ, then check the domain." },
      { type: "summary", title: "Master the strategy", content: "You should now be able to recognise the Pythagorean identities, use reciprocal and quotient relationships, select an identity from the structure of an expression, prove an identity by transforming one side, and avoid illegal cancellation. The strategic question is: what form will make the next step simpler?" },
    ],
  },
  "computer science|binary number systems": {
    title: "Binary number systems: counting, converting, and why computers use them",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to convert between binary and denary, explain why computers use binary internally, and add two binary numbers by hand." },
      { type: "prior", title: "Before you start", content: "You need to know what a denary (base 10) place value system is: each column is worth ten times the column to its right (units, tens, hundreds)." },
      { type: "concept", title: "Why base 2?", content: "A computer's basic circuits are transistors, which are most reliably built as two-state switches: off or on. Representing off as 0 and on as 1 makes binary (base 2) the natural counting system for hardware, even though it takes more digits than denary to write the same number." },
      { type: "definition", title: "Place value in binary", content: "In binary, each column is worth twice the column to its right: 128, 64, 32, 16, 8, 4, 2, 1 (reading left to right for an 8-bit number), instead of denary's 100s, 10s, 1s." },
      { type: "diagram", title: "Binary place values for an 8-bit number", content: "binary-place-values" },
      { type: "example", title: "Worked conversion: binary to denary", content: "Convert 1011 0110 to denary.\nStep 1: Write the place values above each bit: 128 64 32 16 8 4 2 1.\nStep 2: Mark which columns have a 1: 128, 32, 16, 4, and 2.\nStep 3: Add those place values: 128 + 32 + 16 + 4 + 2 = 182.\nSo 1011 0110 in binary equals 182 in denary." },
      { type: "example", title: "Worked conversion: denary to binary", content: "Convert 91 to binary.\nStep 1: Find the largest place value that fits: 64 fits (91 − 64 = 27).\nStep 2: 32 does not fit into 27, so that column is 0.\nStep 3: 16 fits (27 − 16 = 11); 8 fits (11 − 8 = 3).\nStep 4: 4 does not fit into 3, so 0; 2 fits (3 − 2 = 1); 1 fits (1 − 1 = 0).\nReading the columns used gives 0101 1011, so 91 = 0101 1011 as an 8-bit number." },
      { type: "checkpoint", title: "Pause and check", content: "Before continuing: what is 0000 1111 in denary? Work it out using the place-value method above, then check your answer sums to 15." },
      { type: "formula", title: "Binary addition", content: "Binary addition follows the same column-by-column method as denary addition, but carries at 2 instead of 10: 0+0=0, 0+1=1, 1+1=10 (write 0, carry 1), 1+1+1(carry)=11 (write 1, carry 1)." },
      { type: "example", title: "Worked example: binary addition", content: "Add 0110 1011 and 0001 0110. Working right to left: 1+0=1; 1+1=10, write 0 carry 1; 0+1+1(carry)=10, write 0 carry 1; 1+0+1(carry)=10, write 0 carry 1; 0+1+1(carry)=10, write 0 carry 1; 1+0+1(carry)=10, write 0 carry 1; 1+0+1(carry)=10, write 0 carry 1; 0+0+1(carry)=1. Result: 1000 0001, and there's a leftover carry, so on an 8-bit system this would be flagged as an overflow." },
      { type: "misconception", title: "Common traps", content: "Don't assume more bits always means a bigger number without checking the actual bit pattern — 0111 1111 (127) is smaller than 1000 0000 (128) even though it has more 1s. Also remember that 8-bit binary addition can overflow (produce a carry beyond the last column), which is a real limitation, not an error in your method." },
      { type: "exam", title: "Exam transfer", content: "Show your place-value working explicitly when converting — most mark schemes award marks for correct method even if the final digit is wrong. For addition questions, line up the columns carefully and mark every carry so an examiner can follow your working." },
      { type: "practice", title: "Progressive practice", content: "1. Convert 0101 0101 to denary. Answer guidance: sum the place values under each 1.\n2. Convert 200 to 8-bit binary. Answer guidance: work from the largest place value (128) downward.\n3. Add 0011 1100 and 0000 1111 in binary. Answer guidance: work column by column from the right, tracking carries.\n4. Explain why an 8-bit register cannot store 300 in binary. Answer guidance: state the maximum value 8 bits can represent." },
      { type: "summary", title: "Master the strategy", content: "You should now be able to convert between binary and denary using place values, add binary numbers with correct carrying, and explain why computer hardware uses base 2 rather than base 10." },
    ],
  },
  "physics|newtons laws of motion": {
    title: "Newton's laws of motion: inertia, force, and reaction",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to state Newton's three laws, apply F = ma to calculate force, mass or acceleration, and identify action-reaction pairs." },
      { type: "prior", title: "Before you start", content: "You need to know that velocity is speed in a given direction, and that acceleration is the rate of change of velocity." },
      { type: "concept", title: "First law: inertia", content: "An object stays at rest, or keeps moving at constant velocity in a straight line, unless a resultant (unbalanced) force acts on it. This tendency to resist a change in motion is called inertia, and it's larger for objects with more mass." },
      { type: "formula", title: "Second law: F = ma", content: "The resultant force on an object equals its mass multiplied by its acceleration: F = ma, where F is in newtons (N), m is in kilograms (kg), and a is in metres per second squared (m/s²). Rearranged: a = F/m, or m = F/a." },
      { type: "example", title: "Worked example: finding acceleration", content: "A resultant force of 40 N acts on a 8 kg trolley. Find its acceleration.\nStep 1: Start with F = ma.\nStep 2: Rearrange to a = F/m.\nStep 3: Substitute values: a = 40/8.\nStep 4: Calculate: a = 5 m/s².\nThe trolley accelerates at 5 m/s² in the direction of the resultant force." },
      { type: "checkpoint", title: "Pause and check", content: "Before continuing: a 2 kg object accelerates at 3 m/s². What resultant force is acting on it? Work it out using F = ma, then check your answer is 6 N." },
      { type: "concept", title: "Third law: action and reaction", content: "When object A exerts a force on object B, object B exerts an equal and opposite force on object A, at the same instant. These two forces act on different objects, so they never cancel each other out." },
      { type: "example", title: "Worked example: identifying pairs", content: "A book rests on a table.\nStep 1: Identify force one: the book pushes down on the table (weight, due to gravity pulling the book down).\nStep 2: Identify force two: the table pushes up on the book (normal contact force) with equal magnitude.\nStep 3: Check they act on different objects: book-on-table and table-on-book.\nThese two forces are a genuine Newton's-third-law pair because they act on different objects and are the same type of interaction reversed." },
      { type: "misconception", title: "Common traps", content: "A very common error is pairing an object's weight with the normal contact force acting on the SAME object — these are not a Newton's-third-law pair because they act on the same object, not on two different interacting objects, even though they happen to be equal in size when the object isn't accelerating vertically. Also, resultant force means the overall unbalanced force after combining all forces, not any single applied force." },
      { type: "exam", title: "Exam transfer", content: "When asked to identify an action-reaction pair, always name both objects involved and check the forces act on different objects. When calculating with F = ma, state your rearranged formula before substituting numbers, and always include correct units in your final answer." },
      { type: "practice", title: "Progressive practice", content: "1. Calculate the force needed to accelerate a 1200 kg car at 2.5 m/s². Answer guidance: apply F = ma directly.\n2. A resultant force of 15 N gives an object an acceleration of 3 m/s². Find its mass. Answer guidance: rearrange F = ma to m = F/a.\n3. Explain, using Newton's third law, what happens when a swimmer pushes against a pool wall. Answer guidance: name both objects and both forces.\n4. A rocket expels gas downward to accelerate upward. Explain this using Newton's third law. Answer guidance: identify the action force on the gas and the reaction force on the rocket." },
      { type: "diagram", title: "Newton third-law force pairs", content: "force-pairs" },
      { type: "summary", title: "Master the strategy", content: "You should now be able to state all three of Newton's laws, use F = ma to solve for any one of force, mass or acceleration, and correctly identify genuine action-reaction pairs by checking they act on two different objects." },
    ],
  },
  "physics|waves": {
    title: "Waves: describing, measuring, and explaining wave motion",
    blocks: [
      { type: "objective", title: "Your target", content: "By the end, you should be able to define a wave, distinguish transverse and longitudinal waves, use v = fλ, interpret wave diagrams, and explain reflection, refraction, diffraction and superposition at AS level." },
      { type: "prior", title: "Before you start", content: "A vibration is an oscillation about an equilibrium position. A medium is the material through which a mechanical wave travels. Keep the source of a wave separate from the particles of the medium: particles usually oscillate locally while energy is transferred through the medium." },
      { type: "definition", title: "What a wave transfers", content: "A wave is a travelling disturbance that transfers energy from one place to another without the overall transfer of matter. In a mechanical wave, particles of the medium oscillate about equilibrium as the disturbance passes." },
      { type: "concept", title: "Transverse and longitudinal waves", content: "In a transverse wave, oscillations are perpendicular to the direction of energy transfer. In a longitudinal wave, oscillations are parallel to the direction of energy transfer, producing compressions and rarefactions. Sound in air is longitudinal; electromagnetic waves are transverse." },
      { type: "definition", title: "Amplitude, wavelength, period and frequency", content: "Amplitude is the maximum displacement from equilibrium. Wavelength λ is the distance between adjacent points in phase, such as crest to crest. Period T is the time for one complete oscillation. Frequency f is the number of oscillations per second, measured in hertz (Hz), and f = 1/T." },
      { type: "diagram", title: "Wave amplitude and wavelength", content: "wave-shape" },
      { type: "formula", title: "The wave equation", content: "Wave speed = frequency × wavelength, so v = fλ. Use v in m s⁻¹, f in Hz (s⁻¹), and λ in metres. The equation follows because one wavelength passes a fixed point during each period: v = λ/T = fλ." },
      { type: "example", title: "Worked example: finding wave speed", content: "A wave has frequency 25 Hz and wavelength 0.80 m. Step 1: Write v = fλ. Step 2: Substitute v = 25 × 0.80. Step 3: Calculate v = 20 m s⁻¹. Check the units: Hz × m = s⁻¹ × m = m s⁻¹." },
      { type: "checkpoint", title: "Try it before moving on", content: "A wave travels at 12 m s⁻¹ and has frequency 6.0 Hz. Calculate its wavelength. Write the equation, rearrange it for λ, substitute the values and include the unit." },
      { type: "concept", title: "Phase and points in phase", content: "Two points are in phase when they have the same displacement from equilibrium and are moving in the same direction. Adjacent points in phase are separated by one wavelength. Points half a wavelength apart are in antiphase: their displacements are opposite at the same instant." },
      { type: "example", title: "Worked example: period and frequency", content: "A source makes 18 complete oscillations in 6.0 s. Frequency is oscillations divided by time: f = 18/6.0 = 3.0 Hz. The period is T = 1/f = 1/3.0 = 0.33 s to two significant figures." },
      { type: "concept", title: "Reflection, refraction and diffraction", content: "Reflection is a wave changing direction at a boundary and returning into its original medium. Refraction occurs when wave speed changes on entering a different region; frequency remains fixed by the source, so wavelength changes. Diffraction is the spreading of waves around an obstacle or through a gap. It is most noticeable when the gap width is similar to the wavelength." },
      { type: "concept", title: "Superposition and interference", content: "When waves overlap, the resultant displacement is the algebraic sum of their individual displacements. Constructive interference occurs when displacements reinforce; destructive interference occurs when they oppose. For sustained clear interference, the sources should be coherent, meaning they have the same frequency and a constant phase difference." },
      { type: "misconception", title: "Common mistakes", content: "Do not confuse amplitude with wavelength: amplitude is a displacement, while wavelength is a distance along the wave. Do not claim that frequency changes during refraction; the source fixes the frequency. A larger amplitude does not automatically mean a higher frequency. When using v = fλ, convert wavelength to metres before substituting." },
      { type: "exam", title: "How to earn the marks", content: "For a calculation, state v = fλ, rearrange before substituting, show working and include units. For a diagram, label amplitude from the equilibrium line and wavelength between matching points in phase. For diffraction, explicitly relate the amount of spreading to the gap size compared with wavelength. For refraction, state which quantity changes and which stays constant." },
      { type: "practice", title: "Progressive practice", content: "1. A wave has wavelength 0.40 m and frequency 15 Hz. Calculate its speed. 2. A source completes 50 oscillations in 10 s. Find its frequency and period. 3. Explain why wavelength changes when a wave enters a region where its speed decreases but its frequency stays constant. 4. Explain why diffraction is more pronounced when a gap is about the same width as the wavelength. 5. Two coherent waves meet in phase. Describe the resultant displacement at a point where both have equal positive displacement." },
      { type: "checkpoint", title: "Check the units", content: "A wave has wavelength 2.5 cm and frequency 400 Hz. Convert the wavelength into metres before using v = fλ. What speed do you obtain, and why would using 2.5 directly give the wrong answer?" },
      { type: "example", title: "Worked example: wavelength after a speed change", content: "A wave of frequency 5.0 Hz travels at 10 m s⁻¹ in one region and 6.0 m s⁻¹ in another. In the first region λ = v/f = 10/5.0 = 2.0 m. In the second region λ = 6.0/5.0 = 1.2 m. The frequency remains 5.0 Hz because the source has not changed, while the wavelength decreases with the speed." },
      { type: "checkpoint", title: "Predict the diffraction", content: "Two gaps are used with the same wave: one is much wider than the wavelength, and the other is about one wavelength wide. Through which gap should spreading be more noticeable? Explain your prediction using the gap width compared with wavelength." },
      { type: "synthesis", title: "Connect the ideas", content: "Wave behaviour can be understood by tracking three things: the source frequency, the medium-dependent speed, and the geometry of the wavefront and obstacle. The equation v = fλ links speed, frequency and wavelength; refraction changes speed and wavelength together while frequency stays fixed. Diffraction depends on wavelength compared with gap size, and interference depends on adding displacements at the same point." },
      { type: "summary", title: "What to retain", content: "A wave transfers energy without overall transfer of matter. Identify transverse or longitudinal motion from the direction of oscillation. Use f = 1/T and v = fλ with consistent SI units. Reflection changes direction, refraction follows a speed change, diffraction produces spreading, and superposition adds displacements." }
    ]
  }
};

const SUBJECT_ALIASES: Record<string, string> = {
  math: "mathematics",
  maths: "mathematics",
  "computer science": "computer science",
  "cs": "computer science",
  ict: "computer science",
  physics: "physics",
};

// Book-informed pilot lessons are original authored content, kept separate from AI output.
// They remain marked as drafts in the curriculum documentation until syllabus mapping
// and independent review are complete. Runtime availability is not a verification claim.
const BOOK_INFORMED_PILOTS: Record<string, FallbackLesson> = {
  "physics|kinematics": PHYSICS_KINEMATICS_STARTER,
  "physics|accelerated motion": PHYSICS_ACCELERATED_MOTION_STARTER,
  "physics|momentum": PHYSICS_MOMENTUM_STARTER,
  "physics|impulse": PHYSICS_MOMENTUM_STARTER,
  "physics|practical measurement": PHYSICS_PRACTICAL_MEASUREMENT_STARTER,
  "physics|measurement and uncertainty": PHYSICS_PRACTICAL_MEASUREMENT_STARTER,
  "physics|practical skills": PHYSICS_PRACTICAL_MEASUREMENT_STARTER,
  "mathematics|algebra": PURE_MATHEMATICS_ALGEBRA_STARTER,
  "mathematics|logarithms and exponential functions": PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER,
  "mathematics|logarithms": PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER,
  "mathematics|exponential functions": PURE_MATHEMATICS_LOGS_EXPONENTIALS_STARTER,
  "mathematics|differentiation": PURE_MATHEMATICS_DIFFERENTIATION_STARTER,
  "mathematics|sequences and series": PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER,
  "mathematics|sequences": PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER,
  "mathematics|series": PURE_MATHEMATICS_SEQUENCES_SERIES_STARTER,
  "mathematics|trigonometric equations": PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER,
  "mathematics|trig equations": PURE_MATHEMATICS_TRIGONOMETRIC_EQUATIONS_STARTER,
};

// Specific curated entries win over broad legacy theory entries with overlapping names.
const ALL_FALLBACK_LESSONS: Record<string, FallbackLesson> = {
  ...FALLBACK_LESSONS,
  ...THEORY_LESSONS,
  ...BOOK_INFORMED_PILOTS,
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ");
}

function normalizeSubject(value: string): string {
  const cleaned = normalize(value)
    .replace(/\b(970[0-9]|961[0-9]|9[0-9]{3})\b/g, " ")
    .replace(/\b(as|a level|a-level|a-levels|level|cambridge|international|igcse|o level|o-level|gcse)\b/g, " ")
    .replace(/[()[\]_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(physics|phys|physical science)\b/.test(cleaned)) return "physics";
  if (/^(math|maths|mathematics|pure mathematics)\b/.test(cleaned)) return "mathematics";
  if (/^(computer science|computing|comp sci|cs|ict)\b/.test(cleaned)) return "computer science";
  if (/^(chemistry|chem)\b/.test(cleaned)) return "chemistry";
  if (/^(biology|bio)\b/.test(cleaned)) return "biology";
  return SUBJECT_ALIASES[cleaned] ?? cleaned;
}

function normalizeTopic(value: string): string {
  return normalize(value)
    .replace(/\b(topic|chapter|unit|notes|lesson|please teach me|teach me|explain)\b/g, " ")
    .replace(/[,:;.!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDeterministicLessonFallback(subject: string, topic: string): FallbackLesson | null {
  const normalizedSubject = normalizeSubject(subject);
  const normalizedTopic = normalizeTopic(topic);
  const exact = ALL_FALLBACK_LESSONS[`${normalizedSubject}|${normalizedTopic}`];
  if (exact) return exact;

  // Match a curated topic when the learner adds a natural-language request,
  // syllabus code, or exam phrasing around the topic. Never broaden the
  // subject match: a Physics lesson must not leak into another subject.
  const candidates = Object.entries(ALL_FALLBACK_LESSONS)
    .map(([key, lesson]) => {
      const separator = key.indexOf("|");
      return { key, lesson, knownSubject: key.slice(0, separator), knownTopic: key.slice(separator + 1) };
    })
    .filter(candidate => candidate.knownSubject === normalizedSubject)
    // Prefer the most specific topic when a request contains multiple curated labels.
    .sort((a, b) => b.knownTopic.length - a.knownTopic.length);

  const matches = candidates.filter(({ key, knownTopic }) => {
    const topicMatches =
      normalizedTopic === knownTopic ||
      normalizedTopic.startsWith(`${knownTopic} `) ||
      normalizedTopic.endsWith(` ${knownTopic}`) ||
      normalizedTopic.includes(` ${knownTopic} `);
    // A specialised neighbour ("binary search tree", "dative covalent bonding") shares words with a key but is
    // not what the lesson teaches: exclude it before considering candidate matches.
    return topicMatches && !THEORY_EXCLUSIONS[key]?.test(normalizedTopic);
  });

  // Short aliases (for example "sequences" and "series") can point to the same
  // authored lesson. Treat those as one match, but never choose arbitrarily
  // when a request genuinely names two different lessons.
  const distinctLessons = new Map<string, FallbackLesson>();
  for (const { lesson } of matches) {
    distinctLessons.set(lesson.title, lesson);
  }
  if (distinctLessons.size !== 1) return null;
  return distinctLessons.values().next().value ?? null;
}
