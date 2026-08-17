/**
 * Discover publicly reachable exam-board resource links without copying paper
 * content. This is intentionally a link cataloger, not a copyright bypasser.
 * Only allowlisted board domains are persisted.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SOURCES = [
  {
    board: 'CAIE',
    syllabusId: '9709',
    url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/',
  },
  {
    board: 'CAIE',
    syllabusId: '9702',
    url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/',
  },
  {
    board: 'CAIE',
    syllabusId: '9618',
    url: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/past-papers/',
  },
  {
    board: 'ZIMSEC',
    syllabusId: null,
    url: 'https://website.zimsec.co.zw/documents/',
  },
] as const;

const ALLOWED_HOSTS = new Set(['www.cambridgeinternational.org', 'cambridgeinternational.org', 'website.zimsec.co.zw', 'www5.zimsec.co.zw']);

function absoluteUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (!['https:', 'http:'].includes(url.protocol) || !ALLOWED_HOSTS.has(url.hostname)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function text(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase service credentials');
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const discovered: Array<{ board: string; syllabusId: string | null; title: string; url: string }> = [];
  for (const source of SOURCES) {
    const response = await fetch(source.url, { headers: { 'user-agent': 'ShadecodeStudent-PaperSourceBot/1.0' } });
    if (!response.ok) {
      console.warn(`Skipping ${source.url}: HTTP ${response.status}`);
      continue;
    }
    const html = await response.text();
    const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    for (const match of links) {
      const url = absoluteUrl(match[1], source.url);
      if (!url) continue;
      const label = text(match[2]);
      const isPaper = /\.pdf(?:$|\?)/i.test(url) && /(question|paper|specimen|exam|mark|report)/i.test(`${label} ${url}`);
      if (!isPaper) continue;
      discovered.push({
        board: source.board,
        syllabusId: source.syllabusId,
        title: label || url.split('/').pop() || 'Exam resource',
        url,
      });
    }
  }

  const unique = [...new Map(discovered.map((item) => [item.url, item])).values()];
  let written = 0;
  for (const item of unique) {
    const { error } = await supabase.from('paper_sources').upsert({
      board: item.board,
      syllabus_id: item.syllabusId,
      title: item.title.slice(0, 300),
      source_url: item.url,
      source_kind: 'past_paper',
      access_mode: 'external_link',
      rights_note: 'External link only. Shadecode does not copy or republish copyrighted exam content without permission.',
      active: true,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'source_url' });
    if (error) throw new Error(`Failed to store ${item.url}: ${error.message}`);
    written += 1;
  }

  console.log(JSON.stringify({ discovered: unique.length, written }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
