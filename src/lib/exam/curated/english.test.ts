import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam, hasCuratedBank } from "../fallbackExam";
import { isValidGeneratedPaper } from "../paperValidation";
import { builtInCapacity } from "../guaranteedExam";
import { ENGLISH_TOPICS, englishBank, matchEnglishTopics } from "./english";

const all = ENGLISH_TOPICS.flatMap((entry) => entry.questions.map((q) => ({ ...q, topic: entry.topic })));
const names = (text: string) => matchEnglishTopics(text).map((t) => t.topic);

describe("English curated bank integrity", () => {
  it("covers the language skills with a useful amount of content", () => {
    expect(ENGLISH_TOPICS.length).toBeGreaterThanOrEqual(12);
    expect(all.length).toBeGreaterThanOrEqual(120);
    for (const entry of ENGLISH_TOPICS) expect(entry.questions.length, entry.topic).toBeGreaterThanOrEqual(10);
  });
  it("every question has four distinct options and exactly one matching answer", () => {
    for (const q of all) {
      expect(q.options, q.question).toHaveLength(4);
      // Case-sensitive on purpose: the capital-letter questions differ only by case.
      expect(new Set(q.options).size, q.question).toBe(4);
      expect(q.options.filter((o) => o === q.answer), q.question).toHaveLength(1);
      expect(q.question.trim().length).toBeGreaterThanOrEqual(8);
    }
  });
  it("has no duplicate questions", () => {
    const texts = all.map((q) => q.question.toLowerCase());
    // Repeated stems such as "Choose the correct spelling." are fine when their options differ.
    const keys = all.map((q) => `${q.question.toLowerCase()}|${[...q.options].sort().join("/").toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(texts.length).toBe(keys.length);
  });
  it("does not always put the answer in the same position", () => {
    const counts = [0, 0, 0, 0];
    for (const q of all) counts[q.options.indexOf(q.answer)] += 1;
    for (const count of counts) expect(count / all.length).toBeGreaterThan(0.15);
  });
  it("is plain ASCII and never contains a dollar sign", () => {
    for (const q of all) {
      const text = `${q.question}${q.options.join("")}`;
      expect(text).toMatch(/^[\x20-\x7e]*$/);
      expect(text).not.toContain("$");
    }
  });
  it("uses British English throughout, as ZIMSEC does", () => {
    const american = /\b(color|colors|favorite|realize|organize|center|honor|neighbor|program|traveling|labor)\b/i;
    for (const q of all) expect(`${q.question} ${q.options.join(" ")}`, q.question).not.toMatch(american);
  });
  it("never asks a question whose answer depends on a contested style rule", () => {
    const risky = /\b(oxford comma|split infinitive|data (is|are)|team (is|are)|committee (is|are)|staff (is|are))\b/i;
    for (const q of all) expect(`${q.question} ${q.options.join(" ")}`, q.question).not.toMatch(risky);
  });
  it("states key facts correctly", () => {
    const answerTo = (start: string) => all.find((q) => q.question.startsWith(start))!.answer;
    expect(answerTo("Which closing goes with a formal letter that begins 'Dear Sir'")).toBe("Yours faithfully");
    expect(answerTo("Which closing goes with a letter that begins 'Dear Mrs Dube'")).toBe("Yours sincerely");
    expect(answerTo("What is the past participle of 'write'")).toBe("written");
    expect(answerTo("'Time is a thief.'")).toBe("metaphor");
    expect(answerTo("Which sentence is correct?")).toBe("The news is good.");
  });
});

describe("English topic matching", () => {
  it("maps single skills to their own topic", () => {
    expect(names("tenses")).toEqual(["Tenses and verb forms", "Parts of speech"].filter((n) => names("tenses").includes(n)));
    expect(names("tenses")).toContain("Tenses and verb forms");
    expect(names("punctuation")).toEqual(["Punctuation and capital letters"]);
    expect(names("spelling")).toEqual(["Spelling and commonly confused words"]);
    expect(names("concord")).toEqual(["Concord (subject and verb agreement)"]);
    expect(names("homophones")).toEqual(["Spelling and commonly confused words"]);
    expect(names("idioms")).toEqual(["Vocabulary, idioms and proverbs"]);
  });
  it("prefers specific phrases over shared words", () => {
    expect(names("figures of speech")).toEqual(["Figures of speech"]);
    expect(names("reported speech")).toEqual(["Voice, reported speech and conditionals"]);
    expect(names("vocabulary")).toEqual(["Vocabulary, idioms and proverbs"]);
    expect(names("vocabulary in context")).toEqual(["Vocabulary in context"]);
  });
  it("maps writing topics to register and essay skills", () => {
    expect(names("register")).toEqual(["Register and writing forms"]);
    expect(names("formal letters")).toEqual(["Register and writing forms"]);
    expect(names("essay")).toEqual(["Essay types and summary skills"]);
    expect(names("summary")).toEqual(["Essay types and summary skills"]);
    expect(names("comprehension")).toEqual(["Vocabulary in context"]);
  });
  it("treats grammar as the five grammar topics", () => {
    const grammar = names("grammar");
    expect(grammar).toEqual(expect.arrayContaining(["Parts of speech", "Tenses and verb forms", "Concord (subject and verb agreement)", "Sentences and paragraphs", "Voice, reported speech and conditionals"]));
    expect(grammar).not.toContain("Figures of speech");
  });
  it("treats the subject name and generic words as the whole syllabus, and is honest about the rest", () => {
    for (const text of ["", "English", "English Language", "core concepts", "general revision"]) expect(matchEnglishTopics(text), text).toHaveLength(ENGLISH_TOPICS.length);
    expect(englishBank("Macbeth act three")).toBeNull();
  });
});

describe("English is O-Level Language only", () => {
  it("is available for O-Level and when no level is given, but not for A-Level or University", () => {
    expect(hasCuratedBank("English", "figures of speech", "easy")).toBe(true);
    expect(hasCuratedBank("English", "figures of speech")).toBe(true);
    expect(hasCuratedBank("English", "figures of speech", "medium")).toBe(false);
    expect(hasCuratedBank("English", "figures of speech", "hard")).toBe(false);
  });
  it("is not served for English Literature, which needs set texts", () => {
    for (const subject of ["English Literature", "Literature in English", "English literature"]) expect(hasCuratedBank(subject, "poetry", "easy"), subject).toBe(false);
  });
});

describe("English papers", () => {
  it("builds valid papers of every offered size from a broad request", () => {
    for (const count of [5, 10, 15, 20]) {
      const exam = buildCuratedFallbackExam("English", "English", "easy", count)!;
      expect(exam.questions).toHaveLength(count);
      expect(isValidGeneratedPaper(exam.questions.map((q, i) => ({ ...q, id: i + 1 })), count)).toBe(true);
      for (const q of exam.questions) expect(q.options).toContain(q.modelAnswer);
    }
  });
  it("samples every skill in a 12-question broad paper", () => {
    const exam = buildCuratedFallbackExam("English", "English", "easy", 12)!;
    expect(new Set(exam.questions.map((q) => q.topic)).size).toBe(12);
  });
  it("reports how large a single-skill paper can be", () => {
    expect(builtInCapacity("English", "figures of speech", "easy")).toBe(10);
    expect(builtInCapacity("English", "", "easy")!).toBeGreaterThanOrEqual(120);
    expect(builtInCapacity("English", "figures of speech", "medium")).toBeNull();
    const exam = buildCuratedFallbackExam("English", "figures of speech", "easy", 20)!;
    expect(exam.questions).toHaveLength(10);
  });
});
