// Snaps odd lucide icon sizes to the even pixel grid (11->12, 13->14, 15->16, 17->18, 19->20, 21->22).
// Only touches JSX tags imported from lucide-react. Run with --check to list instead of write.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const SNAP = { 11: 12, 13: 14, 15: 16, 17: 18, 19: 20, 21: 22 };
export function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules' && f !== '.next') walk(p, out); }
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}
export function lucideNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim(); if (!t) continue;
      const as = t.match(/\bas\s+(\w+)$/); names.add(as ? as[1] : t.replace(/^type\s+/, ''));
    }
  }
  return names;
}
export function snap(src) {
  const names = lucideNames(src);
  if (!names.size) return { out: src, changes: 0, odd: [] };
  let changes = 0; const odd = [];
  const out = src.replace(/<([A-Z]\w*)\b([^<>]*?)\bsize=\{(\d+)\}/g, (full, tag, mid, n) => {
    if (!names.has(tag)) return full;
    const v = Number(n);
    if (SNAP[v]) { changes++; odd.push(`${tag} ${v}`); return `<${tag}${mid}size={${SNAP[v]}}`; }
    return full;
  });
  return { out, changes, odd };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  let total = 0, files = 0;
  for (const f of walk('src')) {
    const src = readFileSync(f, 'utf8');
    const { out, changes } = snap(src);
    if (changes) { total += changes; files++; if (!check) writeFileSync(f, out); }
  }
  console.log(`${check ? 'would change' : 'changed'} ${total} icon size(s) in ${files} file(s)`);
}
