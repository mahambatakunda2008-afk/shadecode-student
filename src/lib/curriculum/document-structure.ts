export type CurriculumDocumentBlockKind =
  | "page"
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "table_row"
  | "table_cell";

export interface CurriculumDocumentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CurriculumDocumentTextItem {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontName?: string;
}

export interface CurriculumDocumentCell {
  page: number;
  row: number;
  column: number;
  text: string;
  bounds?: CurriculumDocumentBounds;
}

export interface CurriculumDocumentBlock {
  id: string;
  page: number;
  kind: CurriculumDocumentBlockKind;
  text: string;
  level?: number;
  parentId?: string;
  bounds?: CurriculumDocumentBounds;
  cells?: CurriculumDocumentCell[];
  metadata?: Record<string, unknown>;
}

export interface StructuredCurriculumDocument {
  schemaVersion: "1";
  engine: "pdf-positioned-text" | "text-heuristic";
  pageCount: number;
  blocks: CurriculumDocumentBlock[];
  tables: Array<{
    id: string;
    page: number;
    rowCount: number;
    columnCount: number;
    blockId: string;
  }>;
}

export interface PositionedTextItem {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const HEADING_RE = /^(?:\d+(?:\.\d+){0,4}|[A-Z][.)])\s+.+/;
const LIST_RE = /^(?:[-•*]|\d+[.)]|[a-z][.)])\s+/i;

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function groupLines(items: PositionedTextItem[]): PositionedTextItem[][] {
  const lines: PositionedTextItem[][] = [];
  const tolerance = 3;

  for (const item of [...items].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x)) {
    const current = lines.find((line) => line[0]?.page === item.page && Math.abs((line[0]?.y ?? 0) - item.y) <= tolerance);
    if (current) current.push(item);
    else lines.push([item]);
  }

  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

function lineText(line: PositionedTextItem[]): string {
  return clean(line.map((item) => item.text).join(" "));
}

/**
 * Deterministic structure recovery from positioned PDF text.
 * It is intentionally board-agnostic. No syllabus assumptions live here.
 */
export function structurePositionedText(items: PositionedTextItem[]): StructuredCurriculumDocument {
  const lines = groupLines(items);
  const blocks: CurriculumDocumentBlock[] = [];
  const tables: StructuredCurriculumDocument["tables"] = [];
  let blockNumber = 0;
  let tableNumber = 0;

  const nextId = (prefix: string) => `${prefix}-${++blockNumber}`;
  const pages = new Set(items.map((item) => item.page));

  for (const page of [...pages].sort((a, b) => a - b)) {
    blocks.push({ id: nextId("page"), page, kind: "page", text: `Page ${page}`, metadata: { page } });
  }

  const pageLines = new Map<number, PositionedTextItem[][]>();
  for (const line of lines) {
    const page = line[0]?.page;
    if (!page) continue;
    const bucket = pageLines.get(page) ?? [];
    bucket.push(line);
    pageLines.set(page, bucket);
  }

  for (const [page, pageLineItems] of pageLines) {
    let currentTable: { id: string; rows: CurriculumDocumentCell[][]; blockId: string } | undefined;

    const flushTable = () => {
      if (!currentTable || currentTable.rows.length < 2) {
        currentTable = undefined;
        return;
      }
      const cells = currentTable.rows.flat();
      const block = blocks.find((candidate) => candidate.id === currentTable?.blockId);
      if (block) {
        block.cells = cells;
        block.text = currentTable.rows.map((row) => row.map((cell) => cell.text).join(" | ")).join("\n");
      }
      tables.push({
        id: currentTable.id,
        page,
        rowCount: currentTable.rows.length,
        columnCount: Math.max(...currentTable.rows.map((row) => row.length)),
        blockId: currentTable.blockId,
      });
      currentTable = undefined;
    };

    for (const line of pageLineItems) {
      const text = lineText(line);
      if (!text) continue;

      // Multiple well-separated x positions repeated across consecutive lines
      // are a useful generic table signal. We preserve the cells without trying
      // to guess what the columns mean.
      const xGaps = line.slice(1).reduce((count, item, index) => {
        const previous = line[index];
        return count + (item.x - (previous.x + previous.width) > 24 ? 1 : 0);
      }, 0);
      const looksTabular = xGaps >= 1 && line.length >= 2;

      if (looksTabular) {
        if (!currentTable) {
          const blockId = nextId("table");
          currentTable = { id: `table-${++tableNumber}`, rows: [], blockId };
          blocks.push({ id: blockId, page, kind: "table", text: "", metadata: { tableId: currentTable.id } });
        }
        const rowIndex = currentTable.rows.length;
        currentTable.rows.push(line.map((item, column) => ({
          page,
          row: rowIndex,
          column,
          text: clean(item.text),
          bounds: { x: item.x, y: item.y, width: item.width, height: item.height },
        })));
        continue;
      }

      flushTable();

      const first = line[0];
      const bounds: CurriculumDocumentBounds = {
        x: Math.min(...line.map((item) => item.x)),
        y: Math.min(...line.map((item) => item.y)),
        width: Math.max(...line.map((item) => item.x + item.width)) - Math.min(...line.map((item) => item.x)),
        height: Math.max(...line.map((item) => item.y + item.height)) - Math.min(...line.map((item) => item.y)),
      };

      const kind: CurriculumDocumentBlockKind = HEADING_RE.test(text)
        ? "heading"
        : LIST_RE.test(text)
          ? "list"
          : "paragraph";

      blocks.push({
        id: nextId(kind),
        page,
        kind,
        text,
        bounds,
        metadata: {
          source: "positioned-pdf-text",
          firstX: first?.x,
          fontSize: first?.height,
        },
      });
    }

    flushTable();
  }

  return {
    schemaVersion: "1",
    engine: "pdf-positioned-text",
    pageCount: pages.size,
    blocks,
    tables,
  };
}

export function structuredDocumentSummary(document: StructuredCurriculumDocument): {
  pages: number;
  blocks: number;
  headings: number;
  tables: number;
  tableRows: number;
} {
  return {
    pages: document.pageCount,
    blocks: document.blocks.length,
    headings: document.blocks.filter((block) => block.kind === "heading").length,
    tables: document.tables.length,
    tableRows: document.tables.reduce((sum, table) => sum + table.rowCount, 0),
  };
}
