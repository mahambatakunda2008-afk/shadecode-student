import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const draftPaths = [
  "docs/learning-assets/drafts/biology-9700-meiosis.v1.json",
  "docs/learning-assets/drafts/biology-9700-inheritance-genetic-crosses.v1.json",
  "docs/learning-assets/drafts/biology-9700-gene-control.v1.json",
];

describe("Cambridge Biology 9700 Topic 16 draft assets", () => {
  it("keeps every visual asset local, accessible and linked from its draft lesson", () => {
    for (const draftPath of draftPaths) {
      const absolutePath = join(process.cwd(), draftPath);
      const asset = JSON.parse(readFileSync(absolutePath, "utf8")) as {
        asset_key: string;
        curriculum: { syllabus_id: string; syllabus_version: string; expected_topic_key: string };
        review_status: string;
        content: {
          visual_assets?: Array<{ path: string; alt: string; caption: string }>;
          visual_tasks?: Array<{ image?: string; alt?: string }>;
          sources?: Array<{ title: string; url: string; use: string }>;
        };
      };

      expect(asset.asset_key).toMatch(/^biology-9700-/);
      expect(asset.curriculum.syllabus_id).toBe("cambridge-9700");
      expect(asset.curriculum.syllabus_version).toBe("2025-2027");
      expect(asset.curriculum.expected_topic_key).toBe("16");
      expect(asset.review_status).toBe("draft");
      expect(asset.content.sources?.length).toBeGreaterThan(0);

      for (const visual of asset.content.visual_assets ?? []) {
        expect(visual.alt.trim().length).toBeGreaterThan(10);
        expect(visual.caption.trim().length).toBeGreaterThan(10);
        expect(existsSync(join(process.cwd(), "public", visual.path.replace(/^\//, "")))).toBe(true);
      }

      for (const task of asset.content.visual_tasks ?? []) {
        if (task.image) {
          expect(task.alt?.trim().length).toBeGreaterThan(10);
          expect(existsSync(join(process.cwd(), "public", task.image.replace(/^\//, "")))).toBe(true);
        }
      }
    }
  });
  it("requires assessable practice and explicit success criteria in every Topic 16 draft", () => {
    for (const draftPath of draftPaths) {
      const asset = JSON.parse(readFileSync(join(process.cwd(), draftPath), "utf8")) as {
        content: {
          practice?: Array<{ question: string; answer: string; mark_points?: string[] }>;
          visual_tasks?: Array<{ instruction: string; expected_features?: string[] }>;
        };
      };

      expect(asset.content.practice?.length).toBeGreaterThanOrEqual(8);
      for (const question of asset.content.practice ?? []) {
        expect(question.question.trim().length).toBeGreaterThan(20);
        expect(question.answer.trim().length).toBeGreaterThan(20);
        expect(question.mark_points?.length).toBeGreaterThanOrEqual(2);
        for (const point of question.mark_points ?? []) {
          expect(point.trim().length).toBeGreaterThan(3);
        }
      }

      for (const task of asset.content.visual_tasks ?? []) {
        expect(task.instruction.trim().length).toBeGreaterThan(20);
        expect(task.expected_features?.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("covers every numbered Topic 16 syllabus outcome without publishing or inventing database mappings", () => {
    const expectedByFile: Record<string, string[]> = {
      "docs/learning-assets/drafts/biology-9700-meiosis.v1.json": [
        "16.1.1", "16.1.2", "16.1.3", "16.1.4", "16.1.5", "16.1.6", "16.1.7",
      ],
      "docs/learning-assets/drafts/biology-9700-inheritance-genetic-crosses.v1.json": [
        "16.2.1", "16.2.2", "16.2.3", "16.2.4", "16.2.5", "16.2.6", "16.2.7",
      ],
      "docs/learning-assets/drafts/biology-9700-gene-control.v1.json": [
        "16.3.1", "16.3.2", "16.3.3", "16.3.4",
      ],
    };

    for (const [draftPath, expectedCodes] of Object.entries(expectedByFile)) {
      const asset = JSON.parse(readFileSync(join(process.cwd(), draftPath), "utf8")) as {
        review_status: string;
        curriculum: {
          syllabus_outcome_codes?: string[];
          objective_mapping_status?: string;
        };
      };
      expect(asset.review_status).toBe("draft");
      expect(asset.curriculum.syllabus_outcome_codes).toEqual(expectedCodes);
      expect(asset.curriculum.objective_mapping_status).toBe("unmapped_to_database_objective_uuids");
    }
  });

  it("keeps the Topic 16 assessment map traceable to every draft syllabus outcome", () => {
    const map = readFileSync(
      join(process.cwd(), "docs/curriculum-maps/cambridge-9700-2025-2027-topic-16-assessment-map.md"),
      "utf8",
    );
    const expectedCodes = [
      ...Array.from({ length: 7 }, (_, index) => `16.1.${index + 1}`),
      ...Array.from({ length: 7 }, (_, index) => `16.2.${index + 1}`),
      ...Array.from({ length: 4 }, (_, index) => `16.3.${index + 1}`),
    ];

    for (const code of expectedCodes) {
      expect(map).toContain(`| ${code} |`);
    }
    expect(map).toContain("2025–2027");
    expect(map).toContain("Forward-version surveillance (checked 2026-11-01)");
    expect(map).toContain("a separate 2028–2030 curriculum record");
    expect(map).toContain("744622-2028-2030-syllabus.pdf");
    expect(map).toContain("Authentic, permission-cleared photomicrograph still required");
    expect(map).toContain("Do not invent UUIDs");
    expect(map).toContain("| 16.1.2 | Explain what is meant by homologous pairs of chromosomes.");
    expect(map).toContain("| 16.1.4 | Describe chromosome behaviour during meiosis and the associated behaviour");
    expect(map).toContain("| 16.1.6 | Explain how crossing over and random orientation (independent assortment)");
    expect(map).toContain("Expected ratios for different types of epistasis are not required knowledge.");
    expect(map).toContain("| 16.2.5 | Use the chi-squared test");
    expect(map).toContain("| 16.2.6 | Explain the relationship between the specified genes");
    expect(map).toContain("| 16.2.7 | Explain gibberellin");
    expect(map).toContain("| 16.3.2 | Explain genetic control of protein production in a prokaryote");
    expect(map).toContain("| 16.3.3 | State that transcription factors bind to DNA");
  });


  it("covers F1 and F2 generation terminology in the inheritance lesson", () => {
    const asset = JSON.parse(
      readFileSync(
        join(process.cwd(), "docs/learning-assets/drafts/biology-9700-inheritance-genetic-crosses.v1.json"),
        "utf8",
      ),
    ) as {
      content: {
        learning_objectives: string[];
        sections: Array<{ heading: string; body: string }>;
      };
    };

    expect(asset.content.learning_objectives[0]).toContain("F1");
    expect(asset.content.learning_objectives[0]).toContain("F2");
    const generations = asset.content.sections.find(
      (section) => section.heading === "Parental, F1 and F2 generations",
    );
    expect(generations?.body).toContain("first filial generation");
    expect(generations?.body).toContain("second filial generation");
  });

  it("does not ask learners to label lacI on a schematic that does not draw the regulatory gene", () => {
    const asset = JSON.parse(
      readFileSync(
        join(process.cwd(), "docs/learning-assets/drafts/biology-9700-gene-control.v1.json"),
        "utf8",
      ),
    ) as {
      content: {
        sections: Array<{ heading: string; body: string }>;
        visual_tasks: Array<{ type: string; instruction: string; expected_features: string[] }>;
      };
    };

    const components = asset.content.sections.find(
      (section) => section.heading === "The lac operon: components",
    );
    const diagramTask = asset.content.visual_tasks.find(
      (task) => task.type === "label_diagram",
    );
    expect(components?.body).toContain("lacI regulatory gene");
    expect(diagramTask?.instruction).toContain("In a separate key, identify lacI");
    expect(diagramTask?.instruction).toContain("not drawn as part of the operon");
    expect(diagramTask?.expected_features.join(" ")).toContain("regulatory gene encoding the repressor");
    const lactoseExplanation = asset.content.sections.find(
      (section) => section.heading === "The lac operon when lactose is present",
    );
    expect(lactoseExplanation?.body).toContain("more precise molecular inducer is allolactose");
    expect(lactoseExplanation?.body).toContain("follow the wording of the question");
  });

  it("connects the meiosis-II branch to all four haploid products", () => {
    const diagram = readFileSync(
      join(process.cwd(), "public/learning-assets/biology/9700/inheritance/meiosis-overview.svg"),
      "utf8",
    );

    expect(diagram).toContain(
      'M410 550 V590 H250 V630 M410 590 H470 V630 M790 550 V590 H730 V630 M790 590 H950 V630',
    );
    expect(diagram.match(/<circle cx="(?:250|470|730|950)" cy="680" r="42"/g)).toHaveLength(4);
  });


  it("keeps the original Topic 16 structured assessment pack review-gated and numerically traceable", () => {
    const pack = readFileSync(
      join(process.cwd(), "docs/learning-assets/drafts/biology-9700-topic-16-assessment-pack.v1.md"),
      "utf8",
    );

    for (const heading of [
      "## Question 1: Meiosis, chromosome behaviour and microscopy (10 marks)",
      "## Question 2: Linked genes and interpretation of offspring data (8 marks)",
      "## Question 3: Gene control and experimental evaluation (7 marks)",
      "## Question 4: Test-cross design and inference (5 marks)",
      "## Question 5: Epistasis and chi-squared interpretation (8 marks)",
    ]) {
      expect(pack).toContain(heading);
    }
    expect(pack).toContain("190 / 1000 × 100 = **19%**");
    expect(pack).toContain("percentage increase = 14 / 4 × 100 = **350%**");
    expect(pack).toContain("all offspring Pp and purple");
    expect(pack).toContain("Original practice questions");
    expect(pack).toContain("(84−90)²/90 + (36−30)²/30 + (40−40)²/40");
    expect(pack).toContain("χ² = 36/90 + 36/30 + 0 = **1.6**");
    expect(pack).toContain("This ratio is supplied as context; candidates are not expected to memorise epistasis ratios.");
    expect(pack).toContain("The 9:3:4 model is supplied in the question and is not a ratio candidates are expected to memorise.");
    expect(pack).toContain("Five original questions, 38 marks");
    expect(pack).toContain("Cambridge past-paper questions");
    expect(pack).toContain("Do not import or publish");
  });

  it("distinguishes homologous-chromosome separation from sister-chromatid separation in the stage diagram", () => {
    const diagram = readFileSync(
      join(process.cwd(), "public/learning-assets/biology/9700/inheritance/meiosis-stage-recognition.svg"),
      "utf8",
    );

    expect(diagram).toContain("Homologous pair at equator");
    expect(diagram).toContain("Homologues separate; centromeres intact");
    expect(diagram).toContain("Single replicated chromosome at equator");
    expect(diagram).toContain("Sister chromatids separate");
    expect(diagram).toContain("not to scale");
  });


  it("makes crossing over and independent assortment visually distinguishable", () => {
    const diagram = readFileSync(
      join(process.cwd(), "public/learning-assets/biology/9700/inheritance/crossing-over-independent-assortment.svg"),
      "utf8",
    );

    expect(diagram).toContain("non-sister chromatids exchange DNA");
    expect(diagram).toContain("Chiasma between");
    expect(diagram).toContain("two recombinant");
    expect(diagram).toContain("orients randomly");
    expect(diagram).toContain("two homologous pairs orient independently");
    expect(diagram).toContain("Orientation B: the second homologous pair is reversed");
    expect(diagram).toContain("maternal and paternal chromosomes");
    expect(diagram).toContain("not to scale");
  });

});
