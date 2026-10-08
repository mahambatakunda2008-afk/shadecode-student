import { exactInteger } from "../numeric";
import type { QuestionGenerator } from "../types";

export const computingGenerators: QuestionGenerator[] = [
  {
    id: "cs.binary-to-denary",
    subject: "Computer Science",
    topic: "Data representation",
    keywords: ["binary", "denary", "decimal", "data", "representation", "number", "systems", "bits"],
    build(rng) {
      const value = rng.int(17, 255);
      const bits = value.toString(2).padStart(8, "0");
      return {
        question: `Convert the 8-bit binary number ${bits} to denary.`,
        numeric: exactInteger(value),
        working: ["Add the place values (128, 64, 32, 16, 8, 4, 2, 1) where the bit is 1", `${bits} = ${value}`],
        marks: 1,
        params: { bits, value },
      };
    },
  },
  {
    id: "cs.hex-to-denary",
    subject: "Computer Science",
    topic: "Data representation",
    keywords: ["hexadecimal", "hex", "denary", "decimal", "data", "representation", "number", "systems"],
    build(rng) {
      const value = rng.int(32, 255);
      const hex = value.toString(16).toUpperCase().padStart(2, "0");
      return {
        question: `Convert the hexadecimal number ${hex} to denary.`,
        numeric: exactInteger(value),
        working: [`${hex[0]} × 16 + ${hex[1]} (hex digits to denary)`, `${hex} = ${value}`],
        marks: 1,
        params: { hex, value },
      };
    },
  },
  {
    id: "cs.image-file-size",
    subject: "Computer Science",
    topic: "Data representation",
    keywords: ["image", "images", "bitmap", "file", "size", "colour", "depth", "resolution", "data"],
    build(rng) {
      const w = rng.int(4, 64) * 8, h = rng.int(4, 64) * 8, depth = rng.pick([8, 16, 24] as const);
      const bytes = (w * h * depth) / 8;
      return {
        question: `A bitmap image is ${w} pixels wide and ${h} pixels high with a colour depth of ${depth} bits. Calculate the file size in bytes, ignoring any metadata.`,
        numeric: { ...exactInteger(bytes), unit: "bytes" },
        working: ["size (bits) = width × height × colour depth", `= ${w} × ${h} × ${depth} = ${w * h * depth} bits`, `÷ 8 = ${bytes} bytes`],
        marks: 2,
        params: { w, h, depth },
      };
    },
  },
  {
    id: "cs.sound-file-size",
    subject: "Computer Science",
    topic: "Data representation",
    keywords: ["sound", "audio", "file", "size", "sample", "rate", "bit", "depth", "data"],
    build(rng) {
      const rate = rng.pick([8000, 16000, 44100] as const), seconds = rng.int(2, 30) * 8, depth = rng.pick([8, 16] as const);
      const bytes = (rate * seconds * depth) / 8;
      return {
        question: `A mono sound clip is sampled at ${rate} Hz with ${depth}-bit samples and lasts ${seconds} seconds. Calculate the file size in bytes.`,
        numeric: { ...exactInteger(bytes), unit: "bytes" },
        working: ["size (bits) = sample rate × duration × bit depth", `= ${rate} × ${seconds} × ${depth}`, `÷ 8 = ${bytes} bytes`],
        marks: 2,
        params: { rate, seconds, depth },
      };
    },
  },
];
