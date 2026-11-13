const DOCX_MAX_XML_BYTES = 12 * 1024 * 1024;
const DOCX_MAX_TEXT_CHARS = 1_500_000;

function findEndOfCentralDirectory(view: DataView): number {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("DOCX ZIP directory was not found.");
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser does not support local DOCX decompression.");
  }
  const stream = new Blob([bytes.slice().buffer as ArrayBuffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw" as CompressionFormat),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

/** Converts WordprocessingML body XML to readable text without treating it as a rubric. */
export function docxXmlToText(xml: string): string {
  const body = xml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/i)?.[1] ?? xml;
  const paragraphs = body.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi) ?? [];
  const output = paragraphs.map(paragraph => {
    const pieces: string[] = [];
    const tokens = paragraph.match(/<w:(?:t|tab|br|cr)\b[^>]*(?:\/>|>[\s\S]*?<\/w:t>)/gi) ?? [];
    for (const token of tokens) {
      if (/^<w:tab\b/i.test(token)) pieces.push("\t");
      else if (/^<w:(?:br|cr)\b/i.test(token)) pieces.push(" ");
      else pieces.push(decodeXmlEntities(token.replace(/^<w:t\b[^>]*>/i, "").replace(/<\/w:t>$/i, "")));
    }
    return pieces.join("").replace(/[\t ]+/g, " ").trim();
  }).filter(Boolean);
  return output.join("\n").slice(0, DOCX_MAX_TEXT_CHARS);
}

export async function extractDocxText(file: Blob): Promise<{ text: string; engine: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  let cursor = directoryOffset;
  let documentXml: Uint8Array | null = null;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("DOCX ZIP directory entry is invalid.");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === "word/document.xml") {
      if (compressedSize > DOCX_MAX_XML_BYTES || uncompressedSize > DOCX_MAX_XML_BYTES) throw new Error("DOCX document XML exceeds the local extraction safety limit.");
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("DOCX document entry is invalid.");
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      if (dataStart + compressedSize > bytes.byteLength) throw new Error("DOCX document entry exceeds the file boundary.");
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      if (method === 0) documentXml = compressed;
      else if (method === 8) documentXml = await inflateRaw(compressed);
      else throw new Error("DOCX uses an unsupported ZIP compression method.");
      break;
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  if (!documentXml) throw new Error("DOCX does not contain word/document.xml.");
  if (documentXml.byteLength > DOCX_MAX_XML_BYTES) throw new Error("DOCX document XML exceeds the local extraction safety limit.");
  const text = docxXmlToText(new TextDecoder("utf-8", { fatal: false }).decode(documentXml));
  if (!text) throw new Error("No readable paragraph text was found in this DOCX.");
  return { text, engine: "shadecode-docx-wordprocessingml-v1" };
}
