import { CATEGORIES, certs, issuerMonogram } from './certs.js';
import { initializeInteractions } from './portfolio-interactions.js';
import { initializeMethodWorkflow } from './method-workflow.js';
import { initializeScrollMotion } from './scroll-motion.js';
import { RECOGNITION_YEARS, recognitionItems, filterRecognition } from './recognition-data.js';
import {
  deriveClassOptions,
  filterAndSort,
  normalizeWordfenceDocument,
} from './research-data.js';

const SEVERITIES = ['All', 'Critical', 'High', 'Medium'];
const CVE_PAGE_SIZE = 10;
const HERO_PROOF_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@SupakiadS' },
  { label: 'Medium', href: 'https://m3ez.medium.com/' },
  { label: 'OffSec Credential', href: 'https://credentials.offsec.com/profile/supakiadsatuwan533944/wallet' },
  { label: 'Accredible Credential', href: 'https://www.credential.net/profile/supakiadsatuwan533944/wallet' },
  { label: 'Credly Badges', href: 'https://www.credly.com/users/supakiad-satuwan/badges/credly' },
  { label: 'Wordfence Researcher', href: 'https://www.wordfence.com/threat-intel/vulnerabilities/researchers/supakiad-s' },
  { label: 'Patchstack Researcher', href: 'https://patchstack.com/database/researchers/d7a606d8-9d89-4bcf-a973-f8ebe721b82f' },
];

const REFERENCE_LINKS = [
  { text: 'GitHub Profile', href: 'https://github.com/m3ez' },
  { text: 'Medium Articles', href: 'https://m3ez.medium.com/' },
  { text: 'YouTube', href: 'https://www.youtube.com/@SupakiadS' },
  { text: 'Wordfence Researcher', href: 'https://www.wordfence.com/threat-intel/vulnerabilities/researchers/supakiad-s' },
  { text: 'Patchstack Researcher', href: 'https://patchstack.com/database/researchers/d7a606d8-9d89-4bcf-a973-f8ebe721b82f' },
  { text: 'GitHub Advisory Credits', href: 'https://github.com/advisories?query=credit%3Am3ez' },
  { text: 'OffSec Credential', href: 'https://credentials.offsec.com/profile/supakiadsatuwan533944/wallet' },
  { text: 'Accredible Credential', href: 'https://www.credential.net/profile/supakiadsatuwan533944/wallet' },
  { text: 'Credly Badges', href: 'https://www.credly.com/users/supakiad-satuwan/badges/credly' },
  { text: 'Portfolio Source', href: 'https://github.com/m3ez/m3ez-security-portfolio' },
];

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

function renderHeroProofLinks() {
  const list = document.querySelector('#top .proof-links');
  if (!list) return;

  if (!list.closest('.hero-profiles')) {
    const actions = element('div', 'hero-actions');
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Portfolio actions');
    for (const [label, href] of [['View Research', '#research'], ['Contact', '#contact']]) {
      const link = element('a', 'primary-action', label);
      link.href = href;
      actions.appendChild(link);
    }
    const profiles = element('div', 'hero-profiles');
    const label = element('p', 'hero-profiles-label', 'Profiles & verification');
    list.before(actions, profiles);
    profiles.append(label, list);
  }

  list.replaceChildren();
  for (const item of HERO_PROOF_LINKS) {
    const listItem = element('li');
    const link = element('a', '', item.label);
    link.href = item.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${item.label} (external link)`);
    listItem.appendChild(link);
    list.appendChild(listItem);
  }
}

function renderReferences() {
  const list = document.querySelector('#contact .references .reference-list');
  if (!list) return;

  list.replaceChildren();
  for (const item of REFERENCE_LINKS) {
    const listItem = element('li');
    const link = element('a', '', item.text);
    link.href = item.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${item.text} (external link)`);
    listItem.appendChild(link);
    list.appendChild(listItem);
  }
}

function renderRecognitionItems(container, items) {
  container.replaceChildren();

  for (const item of items) {
    const entry = element('div', 'recognition-entry-v2');
    entry.dataset.recognitionYear = item.year;
    const term = element('dt', 'recognition-date-v2', item.dateLabel);
    const detail = element('dd');

    let title;
    if (item.href) {
      title = element('a', 'recognition-title-v2', item.title);
      title.href = item.href;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
      title.setAttribute('aria-label', `${item.title} (external link)`);
    } else {
      title = element('span', 'recognition-title-v2', item.title);
    }

    const meta = element(
      'span',
      'recognition-meta-v2',
      [item.organization, item.detail].filter(Boolean).join(' · '),
    );
    detail.append(title, meta);
    entry.append(term, detail);
    container.appendChild(entry);
  }
}

function renderRecognition() {
  const section = document.getElementById('recognition');
  if (!section || section.querySelector('.recognition-filter-row')) return;

  const recognitionList = section.querySelector('.recognition-list');
  if (!recognitionList) return;

  recognitionList.classList.add('recognition-list-v2');
  recognitionList.replaceChildren();

  const controls = element('div', 'recognition-filter-row filter-row');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Filter recognition by year');

  let activeYear = 'All';
  const refresh = () => {
    renderRecognitionItems(recognitionList, filterRecognition(recognitionItems, activeYear));
  };
  const buttons = RECOGNITION_YEARS.map((year) => makeFilterButton(year, (value) => {
    activeYear = value;
    setPressed(buttons, activeYear);
    refresh();
  }));
  setPressed(buttons, activeYear);
  controls.append(...buttons);
  recognitionList.before(controls);
  refresh();
}

function renderCredentials() {
  const section = document.getElementById('credentials');
  if (!section || section.querySelector('.credential-grid-v2')) return;

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
    link.appendChild(element('span', 'credential-proof', cert.description));
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

function renderResearchRows(container, items, animateFrom = items.length) {
  container.replaceChildren();
  if (items.length === 0) {
    container.appendChild(element('li', 'cve-empty', 'No CVEs match these filters.'));
    return;
  }

  for (const [index, item] of items.entries()) {
    const row = element('li', 'cve-row-v2');
    if (index >= animateFrom) row.classList.add('cve-row-enter');
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

// Single-selection menus share an open state but never reset a selected filter.
function createResearchDropdown(id, label, menuLabel, values, initial, onChange, onOpen) {
  const root = element('div', 'research-dropdown');
  const trigger = element('button', 'filter-button research-dropdown-trigger');
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', id);
  const caption = element('span', 'research-dropdown-caption', `${label}: ${initial}`);
  const arrow = element('span', 'research-dropdown-arrow', '▾');
  arrow.setAttribute('aria-hidden', 'true');
  trigger.append(caption, arrow);
  const menu = element('div', 'research-dropdown-menu');
  menu.id = id;
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', menuLabel);

  const options = values.map(value => {
    const option = element('button', 'research-dropdown-option', value);
    option.type = 'button';
    option.tabIndex = -1;
    option.setAttribute('role', 'menuitemradio');
    option.setAttribute('aria-checked', String(value === initial));
    option.addEventListener('click', () => {
      caption.textContent = `${label}: ${value}`;
      options.forEach((item, index) => item.setAttribute('aria-checked', String(values[index] === value)));
      close(true);
      onChange(value);
    });
    return option;
  });
  menu.append(...options);
  root.append(trigger, menu);
  const dropdown = { root, close };

  function close(returnFocus = false) {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  function positionMenu() {
    if (menu.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? top;
    const below = bottom - rect.bottom - 8;
    const above = rect.top - Math.max(top, headerBottom) - 8;
    const upward = below < Math.min(menu.scrollHeight, 288) && above > below;
    menu.dataset.side = upward ? 'top' : 'bottom';
    menu.style.maxHeight = `${Math.max(44, Math.min(288, upward ? above : below))}px`;
  }

  function open(index = 0) {
    onOpen(dropdown);
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    positionMenu();
    options[index].focus({ preventScroll: true });
    options[index].scrollIntoView({ block: 'nearest' });
  }

  trigger.addEventListener('click', () => menu.hidden ? open() : close());
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open(event.key === 'ArrowUp' ? options.length - 1 : 0);
    }
  });
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key === 'Tab') {
      // Let the browser continue from the trigger, skipping the hidden options.
      close(true);
      return;
    } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const key = event.key.toLocaleLowerCase();
      for (let offset = 1; offset <= options.length; offset++) {
        const candidate = (index + offset) % options.length;
        if (values[candidate].toLocaleLowerCase().startsWith(key)) {
          next = candidate;
          break;
        }
      }
    }
    if (next !== undefined) {
      event.preventDefault();
      options[next].focus({ preventScroll: true });
      options[next].scrollIntoView({ block: 'nearest' });
    }
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', event => {
    if (!root.contains(event.target)) close();
  });
  window.addEventListener('resize', positionMenu);
  window.addEventListener('scroll', positionMenu, { passive: true });
  window.visualViewport?.addEventListener('resize', positionMenu);
  return dropdown;
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

  const state = {
    severity: 'All',
    vulnerabilityClass: 'All',
    sort: 'cvss',
    visibleLimit: CVE_PAGE_SIZE,
  };
  const section = element('section', 'research-index-v2');
  section.setAttribute('aria-labelledby', 'wordpress-cves-title-v2');
  const heading = element('div', 'research-index-heading');
  heading.appendChild(element('h3', '', 'WordPress Plugin CVEs'));
  heading.querySelector('h3').id = 'wordpress-cves-title-v2';
  section.append(heading, createStatsStrip(documentData.stats));

  const controls = element('div', 'research-controls');
  const rows = element('ul', 'cve-row-list-v2');
  rows.id = 'wordpress-cve-rows-v2';
  const resultMeta = element('p', 'research-result-meta');
  resultMeta.setAttribute('aria-live', 'polite');
  const footer = element('div', 'research-footer');

  const pagination = element('div', 'research-pagination filter-row');
  pagination.setAttribute('role', 'group');
  pagination.setAttribute('aria-label', 'WordPress CVE list controls');
  const showMoreButton = element('button', 'filter-button', 'Show more CVEs');
  showMoreButton.type = 'button';
  showMoreButton.setAttribute('aria-controls', rows.id);
  const showLessButton = element('button', 'filter-button', 'Show less');
  showLessButton.type = 'button';
  showLessButton.setAttribute('aria-controls', rows.id);
  pagination.append(showMoreButton, showLessButton);
  footer.append(resultMeta, pagination);

  const resetVisibleLimit = () => {
    state.visibleLimit = CVE_PAGE_SIZE;
  };

  const refresh = (animateFrom) => {
    const matched = filterAndSort([...documentData.items], state);
    const visible = matched.slice(0, state.visibleLimit);
    renderResearchRows(rows, visible, animateFrom);
    resultMeta.textContent = `Showing ${visible.length} of ${matched.length}`;
    showMoreButton.hidden = visible.length >= matched.length;
    showLessButton.hidden = state.visibleLimit <= CVE_PAGE_SIZE;
  };

  showMoreButton.addEventListener('click', () => {
    const revealFrom = rows.querySelectorAll('.cve-row-v2').length;
    state.visibleLimit += CVE_PAGE_SIZE;
    refresh(revealFrom);
  });
  showLessButton.addEventListener('click', () => {
    state.visibleLimit = CVE_PAGE_SIZE;
    refresh();
  });

  const severityControls = createButtonGroup('Filter CVEs by severity', SEVERITIES, state.severity, (value) => {
    state.severity = value;
    resetVisibleLimit();
    refresh();
  });
  let activeDropdown;
  const onOpen = dropdown => {
    if (activeDropdown !== dropdown) activeDropdown?.close();
    activeDropdown = dropdown;
  };
  const classControls = createResearchDropdown(
    'wordpress-cve-type-menu', 'Type', 'Filter CVEs by vulnerability class',
    ['All', ...deriveClassOptions(documentData.items)],
    state.vulnerabilityClass,
    (value) => {
      state.vulnerabilityClass = value;
      resetVisibleLimit();
      refresh();
    },
    onOpen,
  );

  const sortControls = createResearchDropdown('wordpress-cve-sort-menu', 'Sort', 'Sort CVEs', ['CVSS', 'Date'], 'CVSS', (value) => {
    state.sort = value === 'Date' ? 'date' : 'cvss';
    resetVisibleLimit();
    refresh();
  }, onOpen);
  const dropdowns = element('div', 'research-dropdowns');
  dropdowns.append(classControls.root, sortControls.root);

  controls.append(severityControls.group, dropdowns);
  section.append(controls, rows, footer);

  const other = ledger.querySelector(':scope > section[aria-labelledby="other-cves-title"]');
  ledger.insertBefore(section, other ?? ledger.firstChild);
  refresh();
}

function start() {
  initializeInteractions();
  initializeMethodWorkflow();
  renderHeroProofLinks();
  renderReferences();
  renderRecognition();
  renderCredentials();
  initializeScrollMotion();
  void renderResearch();
}

// This module owns the static page's enhancements; no React hydration runs here.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
