import { CATEGORIES, certs, issuerMonogram } from './certs.js';
import {
  deriveClassOptions,
  filterAndSort,
  normalizeWordfenceDocument,
} from './research-data.js';

const LEGACY_CAROUSEL_ID = 'm3ez-credential-carousel-v1';
const MOVED_RECOGNITION = new Set(['LLMail-Inject Challenge', '2023 MVR Volume Badge']);
const SEVERITIES = ['All', 'Critical', 'High', 'Medium'];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setPressed(buttons, activeValue) {
  for (const button of buttons) {
    const active = button.dataset.value === activeValue;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
}

function makeFilterButton(value, onClick) {
  const button = element('button', 'filter-button', value);
  button.type = 'button';
  button.dataset.value = value;
  button.setAttribute('aria-pressed', value === 'All' ? 'true' : 'false');
  button.addEventListener('click', () => onClick(value));
  return button;
}

function installLegacyCarouselCompatibilityStub() {
  const existingCarousel = document.getElementById(LEGACY_CAROUSEL_ID);
  if (existingCarousel) existingCarousel.remove();
  const legacyStyle = document.getElementById(`${LEGACY_CAROUSEL_ID}-style`);
  legacyStyle?.remove();

  const hero = document.querySelector('.hero');
  if (!hero) return;

  const root = element('div', 'credential-carousel redesign-legacy-carousel-stub');
  root.id = LEGACY_CAROUSEL_ID;
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');

  const stage = element('div', 'credential-carousel-stage');
  const previous = element('button', 'credential-carousel-arrow');
  previous.type = 'button';
  previous.setAttribute('aria-label', 'Previous credential');
  const next = element('button', 'credential-carousel-arrow');
  next.type = 'button';
  next.setAttribute('aria-label', 'Next credential');
  root.append(stage, previous, next);
  hero.appendChild(root);
}

function moveRecognitionBadges() {
  const credentialItems = [...document.querySelectorAll('#credentials .credential-list li')];
  const recognitionList = document.querySelector('#recognition .recognition-list');
  if (!recognitionList) return;

  for (const item of credentialItems) {
    const link = item.querySelector('a');
    const title = link?.textContent?.trim() ?? '';
    const alreadyMoved = [...recognitionList.querySelectorAll('[data-moved-badge]')]
      .some((entry) => entry.dataset.movedBadge === title);
    if (!MOVED_RECOGNITION.has(title) || alreadyMoved) {
      continue;
    }

    const meta = item.querySelector('.record-meta')?.textContent?.trim() ?? 'Microsoft Security';
    const [issuer = 'Microsoft Security', issued = ''] = meta.split('·').map((part) => part.trim());
    const entry = element('div', 'recognition-badge-entry');
    entry.dataset.movedBadge = title;
    const term = element('dt', '', issued || 'Recognition');
    const detail = element('dd');
    const anchor = element('a', '', title);
    anchor.href = link?.href ?? '#';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label', `${title} recognition badge (external link)`);
    const note = element('span', '', `${issuer} · issuer-verified recognition badge.`);
    detail.append(anchor, note);
    entry.append(term, detail);
    recognitionList.appendChild(entry);
  }
}

function renderCredentials() {
  const section = document.getElementById('credentials');
  if (!section || section.querySelector('.credential-grid-v2')) return;

  moveRecognitionBadges();

  const heading = section.querySelector('.section-heading');
  const intro = heading?.querySelector('p');
  if (intro) intro.textContent = 'Issuer-verified. Recognition badges listed under Recognition.';
  if (heading && !heading.querySelector('.credential-total')) {
    heading.appendChild(element('span', 'credential-total', `${certs.length} certifications`));
  }

  const legacyList = section.querySelector('.credential-list');
  if (legacyList) legacyList.remove();

  const controls = element('div', 'credential-filter-row filter-row');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Filter credentials by category');

  const grid = element('ul', 'credential-grid-v2');
  const items = new Map();
  let activeCategory = 'All';
  const buttons = CATEGORIES.map((category) => makeFilterButton(category, (value) => {
    activeCategory = value;
    setPressed(buttons, activeCategory);
    for (const [cert, item] of items) {
      item.hidden = activeCategory !== 'All' && cert.category !== activeCategory;
    }
  }));
  controls.append(...buttons);

  for (const cert of certs) {
    const listItem = element('li', cert.flagship ? 'credential-grid-item is-flagship' : 'credential-grid-item');
    const link = element('a', 'credential-tile');
    link.href = cert.verificationUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Verify ${cert.name} credential from ${cert.issuer} (external link)`);

    const top = element('span', 'credential-tile-top');
    top.append(
      element('span', 'credential-category', cert.category),
      element('span', 'credential-monogram', issuerMonogram(cert.issuer)),
    );
    const name = element('strong', 'credential-name', cert.name);
    link.append(top, name);
    if (cert.flagship) link.appendChild(element('span', 'credential-proof', cert.description));
    link.appendChild(element('span', 'credential-meta', `${cert.issuer} · ${cert.year}`));
    listItem.appendChild(link);
    grid.appendChild(listItem);
    items.set(cert, listItem);
  }

  section.append(controls, grid);
}

function severityChip(item) {
  const chip = element('span', 'severity-chip', item.severity.toUpperCase());
  chip.dataset.severity = item.severity;
  return chip;
}

function renderResearchRows(container, items) {
  container.replaceChildren();
  if (items.length === 0) {
    container.appendChild(element('li', 'cve-empty', 'No CVEs match these filters.'));
    return;
  }

  for (const item of items) {
    const row = element('li', 'cve-row-v2');
    const id = element('a', 'cve-id-v2', item.id);
    id.href = item.href;
    id.target = '_blank';
    id.rel = 'noopener noreferrer';
    id.setAttribute('aria-label', `${item.id} advisory (external link)`);

    const summary = element('span', 'cve-summary-v2');
    const target = element('strong', 'cve-target-v2', item.target);
    summary.append(target, document.createTextNode(` — ${item.shortTitle}`));

    const score = element('span', 'cve-score-v2', Number(item.cvss).toFixed(1));
    row.append(id, summary, severityChip(item), score);
    container.appendChild(row);
  }
}

function createStatsStrip(stats) {
  const strip = element('dl', 'research-stats');
  const entries = [
    ['CVEs', stats.total],
    ['Critical', stats.critical],
    ['High', stats.high],
    ['Unauthenticated', stats.unauthenticated],
  ];
  for (const [label, value] of entries) {
    const cell = element('div', 'research-stat');
    cell.append(element('dd', 'research-stat-value', String(value)), element('dt', 'research-stat-label', label));
    strip.appendChild(cell);
  }
  return strip;
}

function createButtonGroup(label, values, initial, onChange) {
  const group = element('div', 'filter-row');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  const buttons = values.map((value) => makeFilterButton(value, (selected) => {
    setPressed(buttons, selected);
    onChange(selected);
  }));
  setPressed(buttons, initial);
  group.append(...buttons);
  return { group, buttons };
}

async function renderResearch() {
  const ledger = document.querySelector('#research .cve-ledger');
  if (!ledger || ledger.querySelector('.research-index-v2')) return;

  let documentData;
  try {
    const response = await fetch('/data/wordfence-cves.json', { cache: 'no-store' });
    if (!response.ok) return;
    documentData = normalizeWordfenceDocument(await response.json());
  } catch {
    return;
  }

  const legacyWordPress = ledger.querySelector(':scope > section[aria-labelledby="wordpress-cves-title"]');
  if (legacyWordPress) legacyWordPress.hidden = true;

  const state = { severity: 'All', vulnerabilityClass: 'All', sort: 'cvss' };
  const section = element('section', 'research-index-v2');
  section.setAttribute('aria-labelledby', 'wordpress-cves-title-v2');
  const heading = element('div', 'research-index-heading');
  heading.appendChild(element('h3', '', 'WordPress Plugin CVEs'));
  heading.querySelector('h3').id = 'wordpress-cves-title-v2';
  section.append(heading, createStatsStrip(documentData.stats));

  const controls = element('div', 'research-controls');
  const rows = element('ul', 'cve-row-list-v2');
  const resultMeta = element('p', 'research-result-meta');
  resultMeta.setAttribute('aria-live', 'polite');

  const refresh = () => {
    const visible = filterAndSort([...documentData.items], state);
    renderResearchRows(rows, visible);
    resultMeta.textContent = `Showing ${visible.length} of ${documentData.items.length}`;
  };

  const severityControls = createButtonGroup('Filter CVEs by severity', SEVERITIES, state.severity, (value) => {
    state.severity = value;
    refresh();
  });
  const classControls = createButtonGroup(
    'Filter CVEs by vulnerability class',
    ['All', ...deriveClassOptions(documentData.items)],
    state.vulnerabilityClass,
    (value) => {
      state.vulnerabilityClass = value;
      refresh();
    },
  );

  const sortWrap = element('div', 'research-sort');
  sortWrap.appendChild(element('span', 'research-sort-label', 'Sort'));
  const sortControls = createButtonGroup('Sort CVEs', ['CVSS', 'Date'], 'CVSS', (value) => {
    state.sort = value === 'Date' ? 'date' : 'cvss';
    refresh();
  });
  for (const button of sortControls.buttons) {
    button.dataset.value = button.textContent;
  }
  sortWrap.appendChild(sortControls.group);

  controls.append(severityControls.group, classControls.group, sortWrap);
  section.append(controls, resultMeta, rows);

  const other = ledger.querySelector(':scope > section[aria-labelledby="other-cves-title"]');
  ledger.insertBefore(section, other ?? ledger.firstChild);
  refresh();
}

function start() {
  installLegacyCarouselCompatibilityStub();
  renderCredentials();
  void renderResearch();
}

function scheduleStart() {
  requestAnimationFrame(() => requestAnimationFrame(start));
}

if (document.readyState === 'complete') {
  scheduleStart();
} else {
  window.addEventListener('load', scheduleStart, { once: true });
}
