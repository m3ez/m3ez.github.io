import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');

const expectedLinks = [
  ['YouTube', 'https://www.youtube.com/@SupakiadS'],
  ['Medium', 'https://m3ez.medium.com/'],
  ['OffSec Credential', 'https://credentials.offsec.com/profile/supakiadsatuwan533944/wallet'],
  ['Accredible Credential', 'https://www.credential.net/profile/supakiadsatuwan533944/wallet'],
  ['Credly Badges', 'https://www.credly.com/users/supakiad-satuwan/badges/credly'],
  ['Wordfence Researcher', 'https://www.wordfence.com/threat-intel/vulnerabilities/researchers/supakiad-s'],
  ['Patchstack Researcher', 'https://patchstack.com/database/researchers/d7a606d8-9d89-4bcf-a973-f8ebe721b82f'],
];

test('hero proof links use the approved seven labels and destinations in order', () => {
  const block = source.match(/const HERO_PROOF_LINKS = \[([\s\S]*?)\];/);
  assert.ok(block, 'HERO_PROOF_LINKS constant is missing');

  let lastIndex = -1;
  for (const [label, href] of expectedLinks) {
    const entry = `{ label: '${label}', href: '${href}' }`;
    const index = block[1].indexOf(entry);
    assert.notEqual(index, -1, `missing hero link: ${label}`);
    assert.ok(index > lastIndex, `hero link is out of order: ${label}`);
    lastIndex = index;
  }

  assert.equal((block[1].match(/label: '/g) ?? []).length, expectedLinks.length);
});

test('hero proof links replace the legacy set and always open external tabs safely', () => {
  assert.match(source, /function renderHeroProofLinks\(\)/);
  assert.match(source, /document\.querySelector\('#top \.proof-links'\)/);
  assert.match(source, /list\.replaceChildren\(\)/);
  assert.match(source, /link\.target = '_blank'/);
  assert.match(source, /link\.rel = 'noopener noreferrer'/);
  assert.match(source, /link\.setAttribute\('aria-label', `\$\{item\.label\} \(external link\)`\)/);
  assert.match(source, /renderHeroProofLinks\(\);/);
  assert.doesNotMatch(source, /label: 'MSRC recognition'/);
});
