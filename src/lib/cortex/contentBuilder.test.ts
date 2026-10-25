import { describe, expect, it } from "vitest";
import { buildLessonContent } from "./contentBuilder";
import { createExplanationTemplate, createQuizTemplate } from "./templates";

const generatedLesson = [
  "# Waves: A Study Lesson",
  "## Learning objectives",
  "Explain wave speed, frequency and wavelength and apply the relationship between them.",
  "## Core concepts",
  "A progressive wave transfers energy without net transfer of matter. Wave speed is related to frequency and wavelength by v = fλ.",
  "## Worked Examples",
  "### Example 1: Calculate wave speed",
  "A wave has frequency 5 Hz and wavelength 2 m. Using v = fλ, its speed is 10 m/s.",
  "### Example 2: Find wavelength",
  "A wave travels at 12 m/s with frequency 3 Hz. Rearranging λ = v/f gives 4 m.",
  "## Key Points",
  "- Wave speed equals frequency multiplied by wavelength.",
  "- Frequency is measured in hertz.",
  "- Wavelength is the distance between adjacent points in phase.",
  "## Practice",
  "Q1: A wave has frequency 4 Hz and wavelength 3 m. Calculate its speed.",
  "A: 12 m/s",
  "Explanation: Substitute into v = fλ, giving v = 4 × 3 = 12 m/s.",
].join("\n");

describe("buildLessonContent", () => {
  it("preserves generated examples, key points and explicitly answered practice items", async () => {
    const result = await buildLessonContent(generatedLesson, {
      template: createExplanationTemplate("Waves", "intermediate"),
      topic: "Waves",
      level: "intermediate",
      includeExamples: true,
      includePractice: true,
    });

    expect(result.success).toBe(true);
    expect(result.lesson?.content.explanation.length).toBeGreaterThan(0);
    expect(result.lesson?.content.examples).toHaveLength(2);
    expect(result.lesson?.content.examples[0].description).toContain("10 m/s");
    expect(result.lesson?.content.keyPoints).toContain("Wave speed equals frequency multiplied by wavelength.");
    expect(result.lesson?.content.practice).toHaveLength(1);
    expect(result.lesson?.content.practice[0].correctAnswer).toBe("12 m/s");
    expect(result.lesson?.content.practice[0].explanation).toContain("v = 4 × 3 = 12 m/s");
  });

  it("parses and validates an assessment-first multiple-choice quiz", async () => {
    const result = await buildLessonContent(
      [
        "# Waves quiz",
        "## Questions",
        "Q1: What is the relationship between wave speed, frequency and wavelength?",
        "A) v = f / lambda",
        "B) v = f lambda",
        "C) v = lambda / f",
        "Correct answer: B",
        "Q2: What is the SI unit of frequency?",
        "A) metre",
        "B) second",
        "C) hertz",
        "Answer: C",
      ].join("\n"),
      { template: createQuizTemplate("Waves", "beginner"), topic: "Waves", level: "beginner" },
    );
    expect(result.success).toBe(true);
    expect(result.lesson && "type" in result.lesson ? result.lesson.type : undefined).toBe("quiz");
    expect(result.lesson?.content.explanation).toHaveLength(0);
    expect(result.lesson?.assessment).toHaveLength(2);
    expect(result.lesson?.assessment?.[0].correctAnswer).toBe("v = f lambda");
    expect(result.lesson?.assessment?.[1].correctAnswer).toBe("hertz");
  });

  it("maps quiz answer letters to their labelled options, not array positions", async () => {
    const result = await buildLessonContent(
      [
        "# Frequency quiz",
        "## Questions",
        "Q1: What is the SI unit of frequency?",
        "A) metre",
        "C) hertz",
        "Answer: C",
      ].join("\n"),
      { template: createQuizTemplate("Frequency", "beginner"), topic: "Frequency", level: "beginner" },
    );

    expect(result.success).toBe(true);
    expect(result.lesson?.assessment?.[0].options).toEqual(["metre", "hertz"]);
    expect(result.lesson?.assessment?.[0].correctAnswer).toBe("hertz");
  });

  it("does not invent practice answers when a response only contains questions", async () => {
    const result = await buildLessonContent(
      "# Short quiz\n## Questions\nQ1: What is wave speed?",
      {
        template: createQuizTemplate("Waves", "beginner"),
        topic: "Waves",
        level: "beginner",
      },
    );

    expect(result.lesson?.content.practice).toHaveLength(0);
    expect(result.lesson?.content.explanation).toHaveLength(0);
    expect(result.success).toBe(false);
  });
});
