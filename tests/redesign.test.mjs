import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { certs, CATEGORIES, issuerMonogram } from '../assets/certs.js';
import {
  classifyCve,
  buildStats,
  filterAndSort,
  deriveClassOptions,
  normalizeWordfenceDocument,
} from '../assets/research-data.js';

test('credentials source contains 13 certifications with flagships first', () => {
  assert.equal(certs.length, 13);
  assert.deepEqual(CATEGORIES, ['All', 'Offensive', 'Web', 'Identity', 'Mobile', 'Systems', 'Foundational']);
  assert.deepEqual(certs.filter((cert) => cert.flagship).map((cert) => cert.name), ['OSEP', 'OSCP+', 'OSWE', 'eWPTX', 'CRTP']);
  assert.ok(certs.slice(0, 5).every((cert) => cert.flagship));
  assert.ok(certs.slice(5).every((cert) => !cert.flagship));
  assert.equal(certs.some((cert) => /LLMail|MVR Volume/i.test(cert.name)), false);
  assert.equal(issuerMonogram('TCM Security'), 'TCM');
  assert.equal(issuerMonogram('Altered Security'), 'Altered');
});

test('classifier enriches a raw CVE with requested research metadata', () => {
  const item = classifyCve({
    id: 'CVE-2026-15981',
    title: 'SAML Single Sign On <= 5.4.4 - Unauthenticated Authentication Bypass via SAMLResponse Parameter',
    cvss: 9.8,
    href: 'https://example.test/cve',
  });
  assert.equal(item.severity, 'Critical');
  assert.equal(item.class, 'Auth bypass');
  assert.equal(item.authContext, 'Unauthenticated');
  assert.equal(item.unauthenticated, true);
  assert.equal(item.target, 'SAML Single Sign On');
  assert.equal(item.year, 2026);
  assert.match(item.shortTitle, /Unauthenticated Authentication Bypass/);
});

test('stats are derived from classified items', () => {
  const items = [
    classifyCve({ id: 'CVE-2026-10001', title: 'A <= 1.0 - Unauthenticated SQL Injection', cvss: 9.8, href: 'https://e.test/a' }),
    classifyCve({ id: 'CVE-2026-10002', title: 'B <= 1.0 - Authenticated (Subscriber+) SQL Injection', cvss: 7.5, href: 'https://e.test/b' }),
    classifyCve({ id: 'CVE-2025-10003', title: 'C <= 1.0 - Missing Authorization', cvss: 5.3, href: 'https://e.test/c' }),
  ];
  assert.deepEqual(buildStats(items), { total: 3, critical: 1, high: 1, unauthenticated: 1 });
});

test('severity and class filters combine and CVSS sort is descending', () => {
  const items = [
    classifyCve({ id: 'CVE-2026-10001', title: 'A <= 1.0 - Unauthenticated SQL Injection', cvss: 7.5, href: 'https://e.test/a' }),
    classifyCve({ id: 'CVE-2026-10002', title: 'B <= 1.0 - Unauthenticated Authentication Bypass', cvss: 9.8, href: 'https://e.test/b' }),
    classifyCve({ id: 'CVE-2025-10003', title: 'C <= 1.0 - SQL Injection', cvss: 5.3, href: 'https://e.test/c' }),
  ];
  const result = filterAndSort(items, { severity: 'High', vulnerabilityClass: 'SQLi', sort: 'cvss' });
  assert.deepEqual(result.map((item) => item.id), ['CVE-2026-10001']);
  assert.deepEqual(deriveClassOptions(items), ['Auth bypass', 'SQLi']);
});

test('date sort uses publication date when present and falls back to CVE chronology', () => {
  const items = [
    { ...classifyCve({ id: 'CVE-2026-10001', title: 'A <= 1.0 - XSS', cvss: 7.2, href: 'https://e.test/a' }), published: '2026-01-01' },
    { ...classifyCve({ id: 'CVE-2025-99999', title: 'B <= 1.0 - XSS', cvss: 7.2, href: 'https://e.test/b' }), published: '2026-06-01' },
  ];
  const result = filterAndSort(items, { severity: 'All', vulnerabilityClass: 'All', sort: 'date' });
  assert.deepEqual(result.map((item) => item.id), ['CVE-2025-99999', 'CVE-2026-10001']);
});

test('document normalization adds stats while preserving valid top-level identity', () => {
  const doc = normalizeWordfenceDocument({
    schemaVersion: 1,
    source: 'Wordfence',
    profile: 'https://example.test/profile',
    items: [{ id: 'CVE-2026-10001', title: 'A <= 1.0 - Unauthenticated SQL Injection', cvss: 9.8, href: 'https://e.test/a' }],
  });
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.source, 'Wordfence');
  assert.equal(doc.stats.total, 1);
  assert.equal(doc.items[0].class, 'SQLi');
});

test('redesign preserves hero carousel and removes only the legacy static credential list', () => {
  const source = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /existingCarousel\.remove\(\)/);
  assert.doesNotMatch(source, /legacyStyle\?\.remove\(\)/);
  assert.doesNotMatch(source, /redesign-legacy-carousel-stub/);
  assert.match(source, /legacyList\.remove\(\)/);
});

test('redesign normalizes the existing MSRC Special Mention to 2026 without adding a duplicate', () => {
  const source = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
  assert.match(source, /a\[href="https:\/\/msrc\.microsoft\.com\/special-mention"\]/);
  assert.match(source, /Special Mentions \| MSRC Researcher Portal/);
  assert.match(source, /Microsoft Security · researcher recognition/);
  assert.match(source, /term\.textContent = '2026'/);
  assert.match(source, /anchor\.textContent = 'Special Mentions \| MSRC Researcher Portal'/);
  assert.doesNotMatch(source, /recognitionList\.prepend\(/);
  assert.doesNotMatch(source, /recognition-special-mention-entry/);
});

test('CVE list keeps only outer top and bottom hairlines with no internal row borders', () => {
  const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');
  const listRule = css.match(/\.cve-row-list-v2\{([^}]*)\}/)?.[1] ?? '';
  const rowRule = css.match(/\.cve-row-v2\{([^}]*)\}/)?.[1] ?? '';
  assert.match(listRule, /border-top:\.5px solid var\(--line\)/);
  assert.match(listRule, /border-bottom:\.5px solid var\(--line\)/);
  assert.doesNotMatch(listRule, /border-left|border-right|border:\.5px/);
  assert.doesNotMatch(rowRule, /border-top|border-bottom|border-left|border-right/);
});

test('CVE severity and score are centered in desktop columns and right aligned on mobile', () => {
  const css = readFileSync(new URL('../assets/research-credentials.css', import.meta.url), 'utf8');
  const chipRule = css.match(/\.severity-chip\{([^}]*)\}/)?.[1] ?? '';
  const scoreRule = css.match(/(?:^|\n)\.cve-score-v2\{([^}]*)\}/)?.[1] ?? '';
  assert.match(chipRule, /justify-self:center/);
  assert.match(chipRule, /text-align:center/);
  assert.match(scoreRule, /justify-self:center/);
  assert.match(scoreRule, /text-align:center/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.severity-chip\{[^}]*justify-self:end[^}]*\}/);
  assert.match(css, /@media \(max-width:760px\)\{[\s\S]*?\.cve-score-v2\{[^}]*justify-self:end[^}]*\}/);
});

test('redesign waits for page load and paint before mutating React-hydrated markup', () => {
  const source = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
  assert.match(source, /window\.addEventListener\('load', scheduleStart, \{ once: true \}\)/);
  assert.match(source, /requestAnimationFrame\(\(\) => requestAnimationFrame\(start\)\)/);
  assert.doesNotMatch(source, /DOMContentLoaded/);
});
