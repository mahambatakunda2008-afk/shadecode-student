import { describe, expect, it } from "vitest";
import { extractNumbers, markNumeric, roundDP, roundSF } from "./numeric";

describe("roundSF", () => {
  it("rounds and gives a half-unit tolerance", () => {
    expect(roundSF(12.3456, 3).value).toBe(12.3);
    expect(roundSF(12.3456, 3).tolerance).toBeCloseTo(0.05, 3);
    expect(roundSF(0.0012345, 2).value).toBe(0.0012);
    expect(roundSF(98765, 2).value).toBe(99000);
  });
  it("rounds to decimal places", () => {
    expect(roundDP(2.3456, 2)).toMatchObject({ value: 2.35 });
  });
});

describe("extractNumbers", () => {
  it("reads plain, signed, decimal and unicode-minus numbers", () => {
    expect(extractNumbers("x = −3")).toEqual([-3]);
    expect(extractNumbers("answer is 12.5")).toEqual([12.5]);
    expect(extractNumbers("3,5")).toEqual([3.5]);
    expect(extractNumbers("1,000")).toEqual([1000]);
  });
  it("reads scientific notation in common student forms", () => {
    expect(extractNumbers("3.0 x 10^8")).toEqual([3e8]);
    expect(extractNumbers("1.2×10⁻³")[0]).toBeCloseTo(1.2e-3);
    expect(extractNumbers("6e5")).toEqual([6e5]);
  });
  it("reads fractions", () => {
    expect(extractNumbers("1/4")).toEqual([0.25]);
  });
  it("ignores unit exponents", () => {
    expect(extractNumbers("12.5 m s-1")).toEqual([12.5]);
    expect(extractNumbers("9.81 m s^-2")).toEqual([9.81]);
    expect(extractNumbers("4 mol dm⁻³")).toEqual([4]);
  });
});

describe("markNumeric", () => {
  const spec = { exact: 12.346, tolerance: 0.05, unit: "m s^-1" };
  it("accepts any valid rounding and ignores working and units", () => {
    expect(markNumeric("12.3", spec).correct).toBe(true);
    expect(markNumeric("v = 4 x 3.0864 = 12.35 m s-1", spec).correct).toBe(true);
    expect(markNumeric("12.4", spec).correct).toBe(false);
  });
  it("rejects blank, non-numeric and number-spraying answers", () => {
    expect(markNumeric("", spec).correct).toBe(false);
    expect(markNumeric("I don't know", spec).correct).toBe(false);
    expect(markNumeric("1 2 3 4 5 6 7 8 9 12.3", spec).correct).toBe(false);
  });
  it("requires integers to be exact", () => {
    const integer = { exact: 7, tolerance: 1e-6 };
    expect(markNumeric("7", integer).correct).toBe(true);
    expect(markNumeric("7.1", integer).correct).toBe(false);
  });
});
