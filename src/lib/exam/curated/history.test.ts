import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam, hasCuratedBank } from "../fallbackExam";
import { isValidGeneratedPaper } from "../paperValidation";
import { HISTORY_TOPICS, historyBank, matchHistoryTopics } from "./history";

const all = HISTORY_TOPICS.flatMap((entry) => entry.questions.map((q) => ({ ...q, topic: entry.topic })));
const names = (text: string) => matchHistoryTopics(text).map((t) => t.topic);

describe("History curated bank integrity", () => {
  it("covers the syllabus themes with a useful amount of content", () => {
    expect(HISTORY_TOPICS.length).toBeGreaterThanOrEqual(15);
    expect(all.length).toBeGreaterThanOrEqual(120);
    for (const entry of HISTORY_TOPICS) expect(entry.questions.length, entry.topic).toBeGreaterThanOrEqual(6);
  });
  it("every question has four distinct options and exactly one matching answer", () => {
    for (const q of all) {
      expect(q.options, q.question).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.toLowerCase())).size, q.question).toBe(4);
      expect(q.options.filter((o) => o === q.answer), q.question).toHaveLength(1);
      expect(q.question.trim().length).toBeGreaterThanOrEqual(8);
    }
  });
  it("has no duplicate questions", () => {
    const texts = all.map((q) => q.question.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
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
  it("keeps date options in chronological order", () => {
    const dated = all.filter((q) => q.options.every((o) => /^\d{4}(-\d{2})?$/.test(o)));
    expect(dated.length).toBeGreaterThanOrEqual(15);
    for (const q of dated) {
      const years = q.options.map((o) => Number(o.slice(0, 4)));
      expect([...years].sort((a, b) => a - b), q.question).toEqual(years);
    }
  });
  it("states the key facts correctly", () => {
    const answerTo = (start: string) => all.find((q) => q.question.startsWith(start))!.answer;
    expect(answerTo("Zimbabwe became independent on")).toBe("18 April 1980");
    expect(answerTo("Ian Smith's Unilateral Declaration")).toBe("1965");
    expect(answerTo("The Pioneer Column entered Mashonaland in")).toBe("1890");
    expect(answerTo("The First Chimurenga / Umvukela took place in")).toBe("1896-97");
    expect(answerTo("The Lancaster House Conference was held in")).toBe("London, in 1979");
    expect(answerTo("The French Revolution began in")).toBe("1789");
    expect(answerTo("The Second World War ended in")).toBe("1945");
    expect(answerTo("The headquarters of SADC are in")).toBe("Gaborone, Botswana");
  });
});

describe("History topic matching", () => {
  it("separates the two Chimurengas but returns both for a bare request", () => {
    expect(names("First Chimurenga")).toEqual(["First Chimurenga / Umvukela"]);
    expect(names("Second Chimurenga")).toEqual(["African nationalism and the Second Chimurenga"]);
    expect(names("Chimurenga")).toHaveLength(2);
  });
  it("separates African nationalism from European nationalism", () => {
    expect(names("Nationalism in Europe")).toEqual(["Nationalism in Europe"]);
    expect(names("liberation struggle")).toEqual(["African nationalism and the Second Chimurenga"]);
  });
  it("tells the two world wars apart", () => {
    expect(names("world war 2")).toEqual(["Fascism and the Second World War"]);
    expect(names("World War II")).toEqual(["Fascism and the Second World War"]);
    expect(names("World War 1")).toEqual(["The First World War and the League of Nations"]);
    expect(names("league of nations")).toEqual(["The First World War and the League of Nations"]);
  });
  it("maps the two syllabus papers to their themes", () => {
    const zim = names("History of Zimbabwe");
    expect(zim).toEqual(expect.arrayContaining(["Pre-colonial societies and states", "First Chimurenga / Umvukela", "Colonial rule in Rhodesia", "Zimbabwe since independence"]));
    expect(zim).not.toContain("The French Revolution and Napoleon");
    const world = names("regional and international history");
    expect(world).toEqual(expect.arrayContaining(["The French Revolution and Napoleon", "Regional and international organisations"]));
    expect(world).not.toContain("Colonial rule in Rhodesia");
  });
  it("matches single themes by their own words", () => {
    expect(names("slave trade")).toEqual(["Early foreign contacts and the slave trade"]);
    expect(names("Great Zimbabwe")).toContain("Pre-colonial societies and states");
    expect(names("the Constitution")).toEqual(["Zimbabwe since independence"]);
    expect(names("French Revolution")).toEqual(["The French Revolution and Napoleon"]);
    expect(names("SADC")).toEqual(["Regional and international organisations"]);
  });
  it("treats the subject name and generic words as the whole syllabus, and is honest about the rest", () => {
    for (const text of ["", "History", "core concepts", "general revision"]) expect(matchHistoryTopics(text), text).toHaveLength(HISTORY_TOPICS.length);
    expect(historyBank("Photosynthesis and enzymes")).toBeNull();
  });
});

describe("History is O-Level only", () => {
  it("is available for O-Level and when no level is given, but not for A-Level or University", () => {
    expect(hasCuratedBank("History", "first chimurenga", "easy")).toBe(true);
    expect(hasCuratedBank("History", "first chimurenga")).toBe(true);
    expect(hasCuratedBank("History", "first chimurenga", "medium")).toBe(false);
    expect(hasCuratedBank("History", "first chimurenga", "hard")).toBe(false);
    expect(buildCuratedFallbackExam("History", "first chimurenga", "medium", 10)).toBeNull();
  });
});

describe("History papers", () => {
  it("builds valid papers of every offered size from a broad request", () => {
    for (const count of [5, 10, 15, 20]) {
      const exam = buildCuratedFallbackExam("History", "History", "easy", count)!;
      expect(exam.questions).toHaveLength(count);
      expect(isValidGeneratedPaper(exam.questions.map((q, i) => ({ ...q, id: i + 1 })), count)).toBe(true);
      for (const q of exam.questions) expect(q.options).toContain(q.modelAnswer);
    }
  });
  it("samples every theme in a 15-question broad paper", () => {
    const exam = buildCuratedFallbackExam("History", "History", "easy", 15)!;
    expect(new Set(exam.questions.map((q) => q.topic)).size).toBe(15);
  });
  it("keeps a single-theme paper on that theme, at the size that exists", () => {
    const exam = buildCuratedFallbackExam("History", "First Chimurenga", "easy", 20)!;
    expect(exam.questions.every((q) => q.topic === "First Chimurenga / Umvukela")).toBe(true);
    expect(exam.questions).toHaveLength(8);
  });
});
