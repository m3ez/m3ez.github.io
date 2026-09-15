import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Locks the approved personal References set and prevents generic vendor/legal links from returning.
const source = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');

const expectedLinks = [
  ['GitHub Profile', 'https://github.com/m3ez'],
  ['Medium Articles', 'https://m3ez.medium.com/'],
  ['YouTube', 'https://www.youtube.com/@SupakiadS'],
  ['Wordfence Researcher', 'https://www.wordfence.com/threat-intel/vulnerabilities/researchers/supakiad-s'],
  ['Patchstack Researcher', 'https://patchstack.com/database/researchers/d7a606d8-9d89-4bcf-a973-f8ebe721b82f'],
  ['GitHub Advisory Credits', 'https://github.com/advisories?query=credit%3Am3ez'],
  ['OffSec Credential', 'https://credentials.offsec.com/profile/supakiadsatuwan533944/wallet'],
  ['Accredible Credential', 'https://www.credential.net/profile/supakiadsatuwan533944/wallet'],
  ['Credly Badges', 'https://www.credly.com/users/supakiad-satuwan/badges/credly'],
  ['Portfolio Source', 'https://github.com/m3ez/m3ez-security-portfolio'],
];

test('References use exactly the approved identity and evidence links', () => {
  const block = source.match(/const REFERENCE_LINKS = \[([\s\S]*?)\];/);
  assert.ok(block, 'REFERENCE_LINKS constant is missing');

  for (const [text, href] of expectedLinks) {
    assert.ok(block[1].includes(`text: '${text}'`), `missing text: ${text}`);
    assert.ok(block[1].includes(`href: '${href}'`), `missing href: ${href}`);
  }

  assert.equal((block[1].match(/text: '/g) ?? []).length, expectedLinks.length);
  assert.doesNotMatch(block[1], /wordfence-intelligence-terms-and-conditions/);
  assert.doesNotMatch(block[1], /cve\.org\/Legal\/TermsOfUse/);
});

test('References replace the legacy list and open every destination safely in a new tab', () => {
  assert.match(source, /function renderReferences\(\)/);
  assert.match(source, /document\.querySelector\('#contact \.references \.reference-list'\)/);
  assert.match(source, /list\.replaceChildren\(\)/);
  assert.match(source, /link\.target = '_blank'/);
  assert.match(source, /link\.rel = 'noopener noreferrer'/);
  assert.match(source, /link\.setAttribute\('aria-label', `\$\{item\.text\} \(external link\)`\)/);
  assert.match(source, /renderReferences\(\);/);
});
