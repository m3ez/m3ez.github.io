import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const API = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const OUTPUT = 'data/recent-cves.json';
const PAGE_SIZE = 500;
const MAX_CACHED = 96;
const CVE_RE = /^CVE-(?:1999|2\d{3})-\d{4,}$/;

export function extractNvdItems(payload) {
  if (!payload || !Array.isArray(payload.vulnerabilities) || !Number.isSafeInteger(payload.totalResults)) {
    throw new Error('Unexpected NVD CVE API schema');
  }
  const byId = new Map();
  for (const entry of payload.vulnerabilities) {
    const cve = entry?.cve;
    if (!cve || typeof cve.id !== 'string' || !CVE_RE.test(cve.id)) continue;
    if (String(cve.vulnStatus || '').toLowerCase() === 'rejected') continue;
    const published = Date.parse(cve.published || '');
    if (!Number.isFinite(published)) continue;
    const candidate = { id: cve.id, published: new Date(published).toISOString() };
    const original = byId.get(candidate.id);
    if (!original || original.published < candidate.published) byId.set(candidate.id, candidate);
  }
  return [...byId.values()];
}

export function buildSnapshot(pages, now = new Date()) {
  if (!Array.isArray(pages) || !pages.length) throw new Error('Missing CVE API pages');
  const byId = new Map();
  for (const page of pages) {
    for (const cve of extractNvdItems(page)) {
      if (!byId.has(cve.id) || byId.get(cve.id).published < cve.published) byId.set(cve.id, cve);
    }
  }
  const items = [...byId.values()]
    .sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))
    .slice(0, MAX_CACHED);
  if (items.length < 4) throw new Error('NVD returned too few recent CVEs; retaining existing cache');
  return {
    schemaVersion: 1,
    source: 'NVD',
    generatedAt: now.toISOString(),
    items,
  };
}

function nvdDate(date) {
  return date.toISOString().replace('Z', '+00:00');
}

async function requestNvd(url, fetchImpl) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) return await response.json();
      if (response.status !== 429 && response.status < 500) {
        throw new Error('NVD returned HTTP ' + response.status);
      }
      if (attempt === 3) throw new Error('NVD returned HTTP ' + response.status);
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 8000));
  }
  throw new Error('Unreachable NVD fetch state');
}

export async function fetchRecentCves(now = new Date(), fetchImpl = fetch) {
  const start = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const url = new URL(API);
  url.searchParams.set('pubStartDate', nvdDate(start));
  url.searchParams.set('pubEndDate', nvdDate(now));
  url.searchParams.set('resultsPerPage', String(PAGE_SIZE));

  const first = await requestNvd(url, fetchImpl);
  const pages = [first];
  if (first.totalResults > PAGE_SIZE) {
    // Inspect both ends because the API may change its chronological result order.
    url.searchParams.set('startIndex', String(first.totalResults - PAGE_SIZE));
    pages.push(await requestNvd(url, fetchImpl));
  }
  return buildSnapshot(pages, now);
}

async function main() {
  const snapshot = await fetchRecentCves();
  await mkdir(dirname(OUTPUT), { recursive: true });

  // Avoid needless GitHub commits and Pages rebuilds if CVE IDs did not change.
  try {
    const previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
    if (previous.source === 'NVD' && JSON.stringify(previous.items) === JSON.stringify(snapshot.items)) {
      process.stdout.write('NVD CVE cache already current\n');
      return;
    }
  } catch {
    // File not present or invalid: replace it with a verified NVD snapshot.
  }

  const temporary = OUTPUT + '.tmp';
  await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  await rename(temporary, OUTPUT);
  process.stdout.write('Cached ' + snapshot.items.length + ' NVD CVEs\n');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
