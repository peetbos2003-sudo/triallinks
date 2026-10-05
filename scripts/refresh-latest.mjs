// Refreshes the "latest publication" data for BOTH Trial Links Outlook add-ins:
//   latest.json      — ECR Trial Links  (ecrresearch.com, English)
//   icc/latest.json  — ICC Trial Links  (icc-consultants.nl, Dutch)   [added 5 Oct 2026]
// Each entry: title, date, author of the item's current edition.
// Run by GitHub Actions on a schedule. Requires Node 20+ (global fetch).
// Repo destination: scripts/refresh-latest.mjs
//
// Rules (also in the project runbook RUNBOOK-latest-json-refresh.md):
// - Always fetch with the staff email as access key (?email=…); anonymous pages show stale teasers.
// - Report pages: the title is the edition headline (<h2>) right before "<date>, written by <author>".
// - Eddy's Weekly Market Insight (ECR): each edition is its own numbered page
//   (market-insight/eddys-weekly-market-insight-NN). Probe upward from the stored slug until 404.
// - ICC Weekupdate: date sits in the <h1>, title is the first <h3> of the body, author is always Eddy Markus.
// - If anything can't be parsed, the previous value is KEPT (never blanked).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const EMAIL = process.env.STAFF_EMAIL;
if (!EMAIL) { console.error('STAFF_EMAIL env var is required'); process.exit(1); }
const KEY = `email=${encodeURIComponent(EMAIL)}`;
const UA = { headers: { 'User-Agent': 'ECR-latest-refresh' }, redirect: 'follow' };

// ---------- shared helpers ----------

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

async function get(url) {
  const res = await fetch(url, UA);
  return { status: res.status, html: await res.text() };
}

function load(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { reports: {} };
}

function save(file, reports) {
  const out = { updated: new Date().toISOString().slice(0, 10), reports };
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
}

const DATE_EN = '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\\s*\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4}';
const DATE_NL = '(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag),\\s*\\d{1,2}\\s+[a-z]+\\s+\\d{4}';

// Section/nav labels that are NOT a publication title — guards against a mis-parse.
const BAD_TITLE = /^(get access|previous reports|main navigation|user account menu|macro & markets|asset allocation|about us|contact|footer|how it works|what'?s in this report|about this report|hedging|get to know us|this is our promise|our gold report|wondering if|download now|voorgaande rapporten|research van icc|icc renterapport|icc valutarapport|icc global financial markets|weekupdate voor cfo|eddy'?s weekly market insight|onze voorspellingen|beschikbare rapporten)/i;

// Report page (ECR and ICC share the same site template): "<date>, written by <author>",
// title = the last <h2> before that line.
function parseReport(html, DATE) {
  const linkRe = new RegExp('(' + DATE + '),\\s*written by\\s*<a[^>]*>([^<]+)</a>');
  const plainRe = new RegExp('(' + DATE + '),\\s*written by\\s*([A-Za-z .\\u2019\'-]{2,60})');
  const m = html.match(linkRe) || html.match(plainRe);
  if (!m) return null;
  const date = decode(m[1]);
  const author = decode(m[2]);
  const before = html.slice(0, m.index);
  const h2s = [...before.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  if (!h2s.length) return null;
  const title = decode(h2s[h2s.length - 1][1]);
  if (!title || BAD_TITLE.test(title)) return null;
  return { title, date, author };
}

// First <h3> after a marker (used for the newsletter bodies).
function firstH3After(html, markers) {
  for (const mk of markers) {
    const i = html.indexOf(mk);
    if (i < 0) continue;
    const m = html.slice(i).match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (m) { const t = decode(m[1]); if (t && !BAD_TITLE.test(t)) return t; }
  }
  return null;
}

let ok = 0, kept = 0;
const log = (tag, ...a) => console.log(tag.padEnd(6), ...a);

// ---------- A. ECR ----------

const ECR_BASE = 'https://ecrresearch.com/research';
const ECR_OUT = 'latest.json';
const ECR_SLUGS = [
  'global-financial-markets', 'interest-rates-outlook', 'currencies-outlook', 'monthly-chart-pack',
  'gold-report', 'strategic-asset-allocation', 'tactical-asset-allocation',
  'quantitative-asset-allocation', 'technical-trend-outlook', 'fund-selection',
];

const ecr = { ...(load(ECR_OUT).reports || {}) };

for (const slug of ECR_SLUGS) {
  try {
    const { html } = await get(`${ECR_BASE}/${slug}?${KEY}`);
    const p = parseReport(html, DATE_EN);
    if (p) { ecr[slug] = p; ok++; log('OK', 'ECR', slug, '->', p.date, '|', p.title); }
    else { kept++; log('KEEP', 'ECR', slug, '(could not parse; kept previous value)'); }
  } catch (e) { kept++; log('ERROR', 'ECR', slug, e.message, '(kept previous value)'); }
}

// Eddy's Weekly Market Insight — numbered edition pages. Probe upward from the stored slug.
{
  const KEYNAME = 'eddys-weekly-market-insight';
  const PREFIX = 'market-insight/eddys-weekly-market-insight-';
  try {
    const prev = ecr[KEYNAME] || {};
    let n = parseInt(((prev.slug || '').match(/-(\d+)$/) || [])[1] || '20', 10);
    let best = null;
    // Walk forward while pages exist (max 10 steps, guards against a runaway loop).
    for (let k = n, misses = 0; k < n + 10 && misses < 2; k++) {
      const { status, html } = await get(`${ECR_BASE}/${PREFIX}${k}?${KEY}`);
      if (status !== 200) { misses++; continue; }   // allow one gap in the numbering
      misses = 0;
      best = { k, html };
    }
    if (best) {
      const h = best.html;
      const t0 = h.indexOf('page-title');
      const dm = h.slice(t0 > -1 ? t0 : 0).match(new RegExp(DATE_EN));
      const title = firstH3After(h, ['field--name-body', 'weekly-overview']);
      const am = h.slice(Math.max(0, h.indexOf('author__info'))).match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      const author = (h.indexOf('author__info') > -1 && am) ? decode(am[1]) : (prev.author || 'Edward Markus');
      if (dm && title) {
        ecr[KEYNAME] = { title, date: decode(dm[0]), author, slug: PREFIX + best.k };
        ok++; log('OK', 'ECR', KEYNAME, `-> #${best.k}`, decode(dm[0]), '|', title);
      } else { kept++; log('KEEP', 'ECR', KEYNAME, `#${best.k} found but could not parse; kept previous value`); }
    } else { kept++; log('KEEP', 'ECR', KEYNAME, `no edition page found from #${n}; kept previous value`); }
  } catch (e) { kept++; log('ERROR', 'ECR', KEYNAME, e.message, '(kept previous value)'); }
}

save(ECR_OUT, ecr);

// ---------- B. ICC ----------

const ICC_BASE = 'https://icc-consultants.nl/nl';
const ICC_OUT = 'icc/latest.json';
const ICC_REPORTS = ['icc-renterapport', 'icc-valutarapport', 'icc-global-financial-markets'];

const icc = { ...(load(ICC_OUT).reports || {}) };

for (const slug of ICC_REPORTS) {
  try {
    const { html } = await get(`${ICC_BASE}/research/${slug}?${KEY}`);
    const p = parseReport(html, DATE_NL);
    if (p) { icc[slug] = p; ok++; log('OK', 'ICC', slug, '->', p.date, '|', p.title); }
    else { kept++; log('KEEP', 'ICC', slug, '(could not parse; kept previous value)'); }
  } catch (e) { kept++; log('ERROR', 'ICC', slug, e.message, '(kept previous value)'); }
}

// Weekupdate voor CFO's & treasurers (Eddy's): "<h1>Weekupdate … <br> 2 oktober 2026</h1>",
// title = first <h3> in the body. The page names no author; it is always Eddy Markus.
{
  const KEYNAME = 'weekupdate-voor-cfos-treasurers';
  const MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  const DAYS = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
  try {
    const { html } = await get(`${ICC_BASE}/${KEYNAME}?${KEY}`);
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    const dm = decode(h1).match(new RegExp('(\\d{1,2})\\s+(' + MONTHS.join('|') + ')\\s+(\\d{4})'));
    const title = firstH3After(html, ['weekly-overview', 'field--name-field-body']);
    if (dm && title) {
      const d = new Date(Date.UTC(+dm[3], MONTHS.indexOf(dm[2]), +dm[1]));
      const date = `${DAYS[d.getUTCDay()]}, ${String(dm[1]).padStart(2, '0')} ${dm[2]} ${dm[3]}`;
      icc[KEYNAME] = { title, date, author: 'Eddy Markus' };
      ok++; log('OK', 'ICC', KEYNAME, '->', date, '|', title);
    } else { kept++; log('KEEP', 'ICC', KEYNAME, '(could not parse; kept previous value)'); }
  } catch (e) { kept++; log('ERROR', 'ICC', KEYNAME, e.message, '(kept previous value)'); }
}

save(ICC_OUT, icc);

console.log(`\nDone. ${ok} updated, ${kept} kept/failed. Wrote ${ECR_OUT} and ${ICC_OUT}.`);
