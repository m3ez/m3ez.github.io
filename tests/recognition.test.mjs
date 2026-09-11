import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const dataUrl = new URL('../assets/recognition-data.js', import.meta.url);

test('recognition data covers approved achievements from 2020 through 2026', async () => {
  assert.equal(existsSync(dataUrl), true, 'assets/recognition-data.js must exist');

  const { RECOGNITION_YEARS, recognitionItems, filterRecognition } = await import(dataUrl);
  assert.deepEqual(RECOGNITION_YEARS, ['All', '2026', '2025', '2024', '2023', '2022', '2021', '2020']);
  assert.equal(recognitionItems.length, 23);

  const counts = Object.fromEntries(
    RECOGNITION_YEARS.slice(1).map((year) => [year, recognitionItems.filter((item) => item.year === year).length]),
  );
  assert.deepEqual(counts, {
    2026: 4,
    2025: 4,
    2024: 4,
    2023: 4,
    2022: 4,
    2021: 2,
    2020: 1,
  });

  assert.equal(filterRecognition(recognitionItems, 'All').length, 23);
  assert.ok(filterRecognition(recognitionItems, '2026').every((item) => item.year === '2026'));

  const quests = recognitionItems.filter((item) => item.title.includes('Zero Day Quest'));
  assert.deepEqual(quests.map((item) => item.year), ['2026', '2025']);

  assert.ok(recognitionItems.some((item) => item.title.includes('NCSA AI CTF 2026') && item.title.includes('#9 Personal')));
  assert.ok(recognitionItems.some((item) => item.title.includes('Thailand Cyber Top Talent 2025') && item.title.includes('#6 Personal') && item.title.includes('#13 Team')));
  assert.ok(recognitionItems.some((item) => item.title.includes('Thailand Cyber Top Talent 2024') && item.title.includes('#10')));
  assert.ok(recognitionItems.some((item) => item.title.includes('MSRC Security Researcher 2024 Q3') && item.title.includes('#25')));
  assert.ok(recognitionItems.some((item) => item.title.includes('Dynamics Researchers 2024 Q3') && item.title.includes('#6')));
  assert.equal(recognitionItems.some((item) => item.title.includes('MSRC overall #16')), false);
  assert.ok(recognitionItems.some((item) => item.title.includes('HITB SECCONF CTF 2023') && item.title.includes('#16')));
  assert.ok(recognitionItems.some((item) => item.title.includes('National WhiteHat Challenge') && item.title.includes('Winner')));
  assert.ok(recognitionItems.some((item) => item.title.includes('Office Researchers 2022 Q4') && item.year === '2022' && item.dateLabel.includes('Jan 2023')));
  assert.ok(recognitionItems.some((item) => item.title.includes('MSRC Security Researcher 2022 Q4') && item.title.includes('#25')));
  assert.ok(recognitionItems.some((item) => item.title.includes('MSRC Security Researcher 2022 Q3') && item.title.includes('#44')));
  assert.ok(recognitionItems.some((item) => item.title.includes('Thailand Cyber Top Talent 2022') && item.title.includes('Participant')));
  assert.ok(recognitionItems.some((item) => item.title.includes('Thailand Cyber Top Talent 2021') && item.title.includes('Participant')));
  assert.ok(recognitionItems.some((item) => item.title.includes('UTCC Cyber Security #2') && item.title.includes('Participant')));
  assert.ok(recognitionItems.some((item) => item.title.includes('White Hat Hacking for Security') && item.title.includes('Winner')));
  assert.ok(recognitionItems.some((item) => item.title === 'Special Mentions | MSRC Researcher Portal' && item.year === '2026'));
  assert.ok(recognitionItems.some((item) => item.title === 'LLMail-Inject Challenge' && item.year === '2026'));
  assert.ok(recognitionItems.some((item) => item.title === '2023 MVR Volume Badge' && item.year === '2023'));
});

test('recognition renderer uses CVE-style year tabs with All selected by default', () => {
  const source = readFileSync(new URL('../assets/portfolio-redesign.js', import.meta.url), 'utf8');
  assert.match(source, /RECOGNITION_YEARS/);
  assert.match(source, /recognitionItems/);
  assert.match(source, /filterRecognition/);
  assert.match(source, /function renderRecognition\(\)/);
  assert.match(source, /recognition-filter-row filter-row/);
  assert.match(source, /let activeYear = 'All'/);
  assert.match(source, /setPressed\(buttons, activeYear\)/);
  assert.match(source, /recognitionList\.replaceChildren\(\)/);
  assert.match(source, /renderRecognition\(\)/);
});
