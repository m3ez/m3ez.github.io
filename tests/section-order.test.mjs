import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const redesign = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');

test('Credentials is immediately before Consulting in the exported page', () => {
  const recognition = html.indexOf('id="recognition"');
  const credentials = html.indexOf('id="credentials"');
  const consulting = html.indexOf('id="consulting"');
  const contact = html.indexOf('id="contact"');

  assert.ok(recognition >= 0 && credentials >= 0 && consulting >= 0 && contact >= 0);
  assert.ok(recognition < credentials, 'Recognition stays before Credentials');
  assert.ok(credentials < consulting, 'Credentials must be before Consulting');
  assert.ok(consulting < contact, 'Consulting stays before Contact');
  assert.doesNotMatch(html, /class="balanced-sections"/, 'Recognition and Consulting are no longer locked into the old side-by-side wrapper');
});

test('enhancement module preserves Credentials before Consulting for future exports', () => {
  assert.match(redesign, /function placeCredentialsBeforeConsulting\(\)/);
  assert.match(redesign, /balanced\.before\(recognition, credentials, consulting\)/);
  assert.match(redesign, /credentials\.nextElementSibling !== consulting/);
  assert.match(redesign, /consulting\.before\(credentials\)/);
  assert.match(redesign, /function start\(\)\s*\{\s*placeCredentialsBeforeConsulting\(\);/);
});
