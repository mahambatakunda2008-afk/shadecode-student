// Computes WCAG contrast for the design-token pairs the UI relies on, in light and dark themes.
// Run: node scripts/audit-contrast.mjs   (exits 1 if any required pair fails)
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(selector + ' {');
  if (start < 0) throw new Error('missing block ' + selector);
  let depth = 0, i = css.indexOf('{', start);
  const from = i;
  for (; i < css.length; i++) { if (css[i] === '{') depth++; if (css[i] === '}' && --depth === 0) break; }
  return css.slice(from + 1, i);
}
function vars(text) {
  const out = {};
  for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = vars(block(':root'));
const dark = { ...light, ...vars(block('.dark')) };

function resolve(map, v, d = 0) {
  if (d > 8) return v;
  return v.replace(/var\((--[\w-]+)\)/g, (_, n) => resolve(map, map[n] ?? '#000', d + 1));
}
function parse(c) {
  c = c.trim();
  let m;
  if ((m = c.match(/^#([0-9a-f]{6})$/i))) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
  if ((m = c.match(/^#([0-9a-f]{3})$/i))) { const [r, g, b] = m[1].split('').map(x => parseInt(x + x, 16)); return [r, g, b, 1]; }
  if ((m = c.match(/^rgba?\(([^)]+)\)$/i))) { const p = m[1].split(',').map(s => parseFloat(s)); return [p[0], p[1], p[2], p[3] ?? 1]; }
  return null;
}
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground token, background token(s) to composite over, min ratio, label]
const textPairs = [
  ['--text-primary', '--surface', 4.5], ['--text-primary', '--background', 4.5],
  ['--text-secondary', '--surface', 4.5], ['--text-secondary', '--background', 4.5],
  ['--text-tertiary', '--surface', 4.5], ['--text-tertiary', '--background', 4.5],
  ['--muted-foreground', '--surface', 4.5], ['--muted-foreground', '--muted', 4.5],
  ['--primary', '--surface', 4.5], ['--primary', '--background', 4.5],
  ['--primary-foreground', '--primary', 4.5],
  ['--success', '--surface', 4.5], ['--warning', '--surface', 4.5], ['--danger', '--surface', 4.5], ['--info', '--surface', 4.5],
  ['--success', '--success-soft@--surface', 4.5], ['--warning', '--warning-soft@--surface', 4.5],
  ['--danger', '--danger-soft@--surface', 4.5], ['--info', '--info-soft@--surface', 4.5],
];
let failures = 0;
for (const [theme, map] of [['light', light], ['dark', dark]]) {
  console.log(`\n== ${theme}`);
  for (const [fg, bgSpec, min] of textPairs) {
    const [bgTok, baseTok] = bgSpec.split('@');
    const base = parse(resolve(map, map[baseTok ?? '--surface'] ?? '#fff')) ?? [255, 255, 255, 1];
    const bgRaw = parse(resolve(map, map[bgTok] ?? ''));
    const fgRaw = parse(resolve(map, map[fg] ?? ''));
    if (!bgRaw || !fgRaw) { console.log(`  skip  ${fg} on ${bgSpec} (unparseable)`); continue; }
    const baseSolid = over(base, [255, 255, 255, 1]);
    const bg = over(bgRaw, baseSolid);
    const f = over(fgRaw, bg);
    const r = ratio(f, bg);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${r.toFixed(2).padStart(5)}  ${fg} on ${bgSpec} (need ${min})`);
  }
}
console.log(`\n${failures} failing pair(s)`);
process.exit(failures ? 1 : 0);
