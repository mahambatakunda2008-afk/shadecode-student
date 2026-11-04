/**
 * Classic wrong answers for the Form 1-4 Mathematics generators, computed from the same parameters as the question.
 * A student who types one gets a specific, kind hint instead of a bare "incorrect".
 */
type P = Record<string, number | string>;
type Entry = [value: number, id: string, hint: string];
const n = (value: number | string) => Number(value);
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const PI = 22 / 7;

export const JUNIOR_MISTAKES: Record<string, (p: P, exact: number) => Entry[]> = {
  "maths.jr.percentage-of": (p, exact) => [
    [n(p.pct) * n(p.amount), "forgot-divide-100", "A percentage is a fraction out of 100, so divide by 100: x% of N = x ÷ 100 × N."],
    [n(p.amount) - exact, "gave-what-is-left", "That is the amount left after taking the percentage away. The question asks for the percentage itself."],
    [n(p.amount) / n(p.pct), "divided-by-percent", "Multiply the amount by the percentage over 100. Do not divide the amount by the percentage."],
  ],
  "maths.jr.percentage-change": (p) => {
    const [oldValue, newValue] = [n(p.oldValue), n(p.newValue)];
    return [
      [Math.abs(newValue - oldValue), "gave-the-change", "That is the change in dollars. Divide it by the original price and multiply by 100 to get a percentage."],
      [(Math.abs(newValue - oldValue) / newValue) * 100, "divided-by-new", "Divide the change by the ORIGINAL price, not the new price."],
      [(newValue / oldValue) * 100, "gave-new-as-percent", "That is the new price as a percentage of the old one. Subtract 100 to find the percentage change."],
    ];
  },
  "maths.jr.simple-interest": (p, exact) => [
    [n(p.principal) * n(p.rate) * n(p.years), "forgot-divide-100", "The rate is a percentage, so divide by 100: I = P × R × T ÷ 100."],
    [n(p.principal) + exact, "gave-total-amount", "That is the total amount (money invested plus interest). The question asks for the interest only."],
    [(n(p.principal) * n(p.rate)) / 100, "forgot-the-years", "Multiply by the number of years as well. That is the interest for one year only."],
  ],
  "maths.jr.ratio-share": (p) => {
    const [a, b, total] = [n(p.a), n(p.b), n(p.total)];
    return [
      [(Math.min(a, b) * total) / (a + b), "gave-smaller-share", "That is the smaller share. The question asks for the larger one."],
      [total / (a + b), "gave-one-part", "That is the value of one part. Multiply it by the larger number in the ratio."],
      [total / 2, "split-equally", "The shares are not equal. Divide the total by the number of parts (a + b), not by 2."],
    ];
  },
  "maths.jr.direct-proportion": (p) => {
    const [n1, n2, price] = [n(p.n1), n(p.n2), n(p.unitCents) / 100];
    return [
      [n2 / n1, "gave-scale-factor", "n₂ ÷ n₁ only tells you how many times bigger the order is. Multiply the original cost by it."],
      [price, "gave-price-of-one", "That is the cost of one pencil. Multiply by the number of pencils you need."],
      [n2 * n1 * price, "multiplied-by-first-cost", "Find the price of ONE pencil first by dividing the cost by the number of pencils, then multiply."],
    ];
  },
  "maths.jr.linear-equation": (p, exact) => [
    [(n(p.d) + n(p.b)) / (n(p.a) - n(p.c)), "sign-slip-moving-a-number", "When a number moves to the other side of the equals sign its sign changes. Check the sign of the constant."],
    [(n(p.d) - n(p.b)) / (n(p.a) + n(p.c)), "added-the-x-terms", "Collect the x terms by subtracting (ax − cx), not by adding them."],
    [-exact, "sign-of-answer", "Check the sign of your answer by substituting it back into the equation."],
  ],
  "maths.jr.substitution": (p) => {
    const [a, b, x, y] = [n(p.a), n(p.b), n(p.x), n(p.y)];
    const entries: Entry[] = [
      [a * x + b * y, "forgot-to-square", "Remember the power: x² means x × x."],
      [a * x * x - b * y, "sign-slip-on-second-term", "Check the sign of the second term when you substitute y."],
      [(a * x) ** 2 + b * y, "squared-the-coefficient", "Only x is squared, not the coefficient: ax² means a × (x²)."],
    ];
    if (x < 0) entries.unshift([-a * x * x + b * y, "negative-squared", "A negative number squared is positive: (−3)² = 9, not −9."]);
    return entries;
  },
  "maths.jr.indices": (p) =>
    p.kind === "indices"
      ? [
          [n(p.base) ** (n(p.p) + n(p.q) + n(p.r)), "added-all-indices", "Dividing means SUBTRACTING the indices, not adding them."],
          [(n(p.base) * n(p.base)) ** (n(p.p) + n(p.q) - n(p.r)), "multiplied-the-bases", "Keep the base the same and only add or subtract the indices. Do not multiply the bases."],
        ]
      : [
          [(n(p.mantissaTenths) / 10) * n(p.exponent), "multiplied-by-the-power", "10ⁿ means multiply by 10 n times (move the decimal point n places), not multiply by n."],
          [n(p.mantissaTenths) / 10 / 10 ** n(p.exponent), "moved-the-wrong-way", "A positive power of 10 makes the number bigger, so move the decimal point to the right."],
        ],
  "maths.jr.pythagoras": (p) => {
    const [a, b, c] = [n(p.a), n(p.b), n(p.c)];
    return n(p.findHypotenuse) === 1
      ? [
          [a + b, "added-the-sides", "Square the sides first, add them, then take the square root: c² = a² + b²."],
          [a * a + b * b, "forgot-square-root", "That is c². Take the square root to find c."],
        ]
      : [
          [Math.sqrt(c * c + a * a), "added-the-squares", "The hypotenuse is the longest side. To find a shorter side, subtract: b² = c² − a²."],
          [c * c - a * a, "forgot-square-root", "That is b². Take the square root to find b."],
          [c - a, "subtracted-the-sides", "Square the sides first, subtract the squares, then take the square root."],
        ];
  },
  "maths.jr.area-perimeter": (p) => {
    const [a, b] = [n(p.a), n(p.b)];
    switch (p.kind) {
      case "rectangle":
        return [
          [2 * (a + b), "gave-perimeter", "That is the perimeter. Area is length × width."],
          [a + b, "added-the-sides", "Multiply the length by the width for area. Do not add them."],
        ];
      case "triangle":
        return [
          [a * b, "forgot-the-half", "Remember the ½: area of a triangle = ½ × base × height."],
          [a + b, "added-the-lengths", "Multiply base by height (then halve). Do not add them."],
        ];
      case "circle-area":
        return [
          [2 * PI * a, "used-circumference", "That is the circumference formula. The area of a circle is πr²."],
          [PI * (2 * a) ** 2, "used-diameter", "Use the radius, not the diameter, in πr²."],
          [PI * a, "forgot-to-square", "Remember to square the radius: area = πr²."],
        ];
      default:
        return [
          [PI * a * a, "used-area-formula", "That is the area formula. The circumference is 2πr."],
          [PI * a, "forgot-the-2", "Circumference is 2πr, so do not forget the 2."],
        ];
    }
  },
  "maths.jr.angles": (p) => {
    const [a, b] = [n(p.a), n(p.b)];
    if (p.kind === "sum")
      return [
        [a * 180, "forgot-n-minus-2", "Use (n − 2) × 180, not n × 180."],
        [360, "gave-exterior-total", "360° is the total of the EXTERIOR angles. For interior angles use (n − 2) × 180."],
      ];
    if (p.kind === "regular")
      return [
        [360 / a, "gave-exterior-angle", "That is the exterior angle. The interior angle is 180° minus the exterior angle."],
        [(a - 2) * 180, "gave-the-total", "That is the sum of ALL the interior angles. Divide by the number of sides to get one angle."],
      ];
    return [
      [180 - a, "forgot-second-angle", "Subtract BOTH known angles from 180°."],
      [a + b, "added-the-angles", "That is the total of the two known angles. Subtract it from 180° to find the third."],
    ];
  },
  "maths.jr.speed-distance-time": (p) => {
    const [speed, time, distance] = [n(p.speed), n(p.time), n(p.distance)];
    if (p.kind === "speed")
      return [
        [time / distance, "inverted-the-fraction", "Speed = distance ÷ time. Check which way round you divided."],
        [distance * time, "multiplied", "To find speed, divide the distance by the time."],
      ];
    if (p.kind === "time")
      return [
        [speed * distance, "multiplied-instead-of-dividing", "Time = distance ÷ speed."],
        [speed / distance, "inverted-the-fraction", "Time = distance ÷ speed. Check which way round you divided."],
      ];
    return [
      [speed / time, "divided-instead-of-multiplying", "Distance = speed × time."],
      [speed + time, "added", "Multiply speed by time to find the distance."],
    ];
  },
  "maths.jr.hcf-lcm": (p) => {
    const [a, b] = [n(p.a), n(p.b)];
    const g = gcd(a, b);
    return n(p.askHcf) === 1
      ? [
          [(a * b) / g, "gave-the-lcm", "That is the lowest common multiple. The HCF is the largest number that divides into both."],
          [a * b, "multiplied-the-numbers", "Multiplying the numbers does not give the HCF. Find the largest number that divides into both."],
        ]
      : [
          [g, "gave-the-hcf", "That is the highest common factor. The LCM is the smallest number that both numbers divide into."],
          [a * b, "multiplied-the-numbers", "Multiplying gives a common multiple, but not the LOWEST one. Divide out the common factor."],
        ];
  },
  "maths.jr.probability": (p) => {
    const [red, blue, green] = [n(p.red), n(p.blue), n(p.green)];
    const total = red + blue + green;
    return [
      [red / (blue + green), "compared-with-the-others", "Probability = favourable outcomes ÷ TOTAL outcomes, not ÷ the other outcomes."],
      [(blue + green) / total, "gave-not-red", "That is the probability of NOT getting red."],
      [red, "gave-the-count", "That is the number of red counters. Divide by the total number of counters."],
    ];
  },
  "maths.jr.nth-term": (p) => {
    const [first, diff, count] = [n(p.first), n(p.diff), n(p.n)];
    return [
      [first + count * diff, "off-by-one", "The nth term uses (n − 1) differences, not n: a + (n − 1)d."],
      [diff * count, "forgot-first-term", "Add the first term: nth term = a + (n − 1)d."],
      [first + (count - 2) * diff, "off-by-two", "Count the differences carefully: the nth term has (n − 1) of them."],
    ];
  },
  "maths.jr.fractions": (p) =>
    p.kind === "of"
      ? [
          [n(p.a) / n(p.q), "forgot-to-multiply", "After dividing by the denominator, multiply by the numerator."],
          [n(p.p) * n(p.a), "forgot-to-divide", "Divide by the denominator as well as multiplying by the numerator."],
        ]
      : [
          [(n(p.p) + n(p.r)) / (n(p.q) + n(p.s)), "added-tops-and-bottoms", "Fractions are not added by adding the numerators and the denominators. Use a common denominator."],
          [(n(p.p) / n(p.q)) * (n(p.r) / n(p.s)), "multiplied", "The question asks you to ADD the fractions, not multiply them."],
        ],
  "maths.jr.volume": (p) => {
    const [a, b, c] = [n(p.a), n(p.b), n(p.c)];
    return p.kind === "cuboid"
      ? [
          [2 * (a * b + b * c + a * c), "gave-surface-area", "That is the surface area. Volume = length × width × height."],
          [a + b + c, "added-the-lengths", "Multiply the three lengths. Do not add them."],
        ]
      : [
          [PI * a * a, "forgot-the-height", "Multiply by the height as well: V = πr²h."],
          [PI * a * b, "forgot-to-square-radius", "Remember to square the radius: V = πr²h."],
          [PI * (2 * a) ** 2 * b, "used-diameter", "Use the radius, not the diameter, in πr²h."],
        ];
  },
  "maths.jr.median-range": (p) => {
    const raw = String(p.data).split(",").map(Number);
    const sorted = [...raw].sort((x, y) => x - y);
    const mean = raw.reduce((sum, v) => sum + v, 0) / raw.length;
    return n(p.askMedian) === 1
      ? [
          [mean, "gave-the-mean", "That is the mean. The median is the middle value when the numbers are in order."],
          [raw[Math.floor(raw.length / 2)], "did-not-order-first", "Put the numbers in order first, then pick the middle value."],
        ]
      : [
          [sorted[sorted.length - 1], "gave-the-largest", "That is the largest value. The range is largest − smallest."],
          [sorted[sorted.length - 1] + sorted[0], "added-instead-of-subtracting", "Range = largest − smallest. Subtract, do not add."],
        ];
  },
};
