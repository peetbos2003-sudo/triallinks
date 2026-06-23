// Refreshes latest.json with each ECR report's latest publication (title, date, author).
// Run by GitHub Actions on a schedule. Requires Node 20+ (global fetch).
// Repo destination: scripts/refresh-latest.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = 'https://ecrresearch.com/research';
const EMAIL = process.env.STAFF_EMAIL;
if (!EMAIL) { console.error('STAFF_EMAIL env var is required'); process.exit(1); }

const SLUGS = [
  'global-financial-markets',
  'interest-rates-outlook',
  'currencies-outlook',
  'monthly-chart-pack',
  'gold-report',
  'strategic-asset-allocation',
  'tactical-asset-allocation',
  'quantitative-asset-allocation',
  'technical-trend-outlook',
  'fund-selection',
];

const OUT = 'latest.json';

// Section/nav labels that are NOT a publication title — guards against a mis-parse.
const BAD_TITLE = /^(get access|previous reports|main navigation|user account menu|macro & markets|asset allocation|about us|contact|footer|how it works|what'?s in this report|about this report|hedging|get to know us|this is our promise|our gold report|wondering if)/i;

function decode(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&rsquo;|&#8217;/g, '’').replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&ndash;|&#8211;/g, '–').replace(/&mdash;|&#8212;/g, '—')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

const DATE = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\\s*\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}';

function parse(html) {
  // The latest report is the only block with ", written by <author>".
  const linkRe = new RegExp('(' + DATE + '),\\s*written by\\s*<a[^>]*>([^<]+)</a>');
  const plainRe = new RegExp('(' + DATE + '),\\s*written by\\s*([A-Za-z .\\u2019\'-]{2,60})');
  const m = html.match(linkRe) || html.match(plainRe);
  if (!m) return null;
  const date = decode(m[1]);
  const author = decode(m[2]);
  // Title = the last <h2> before the date line (the report's headline).
  const before = html.slice(0, m.index);
  const h2s = [...before.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  if (!h2s.length) return null;
  const title = decode(h2s[h2s.length - 1][1]);
  if (!title || BAD_TITLE.test(title)) return null;
  return { title, date, author };
}

const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { reports: {} };
const reports = { ...(existing.reports || {}) };
let ok = 0, kept = 0;

for (const slug of SLUGS) {
  try {
    const url = `${BASE}/${slug}?email=${encodeURIComponent(EMAIL)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ECR-latest-refresh' }, redirect: 'follow' });
    const html = await res.text();
    const parsed = parse(html);
    if (parsed) { reports[slug] = parsed; ok++; console.log('OK   ', slug, '->', parsed.date, '|', parsed.title); }
    else { kept++; console.warn('KEEP ', slug, '(could not parse; kept previous value)'); }
  } catch (e) {
    kept++; console.warn('ERROR', slug, e.message, '(kept previous value)');
  }
}

const out = { updated: new Date().toISOString().slice(0, 10), reports };
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`\nDone. ${ok} updated, ${kept} kept/failed. Wrote ${OUT}.`);
