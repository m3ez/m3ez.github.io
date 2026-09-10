const CLASS_PRIORITY = [
  'Auth bypass',
  'Missing authz',
  'SQLi',
  'XSS',
  'IDOR',
  'Privilege escalation',
  'File upload',
  'File read',
  'Object injection',
  'Info disclosure',
  'Open redirect',
  'Payment bypass',
  'Other',
];

export function severityFromCvss(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'Unknown';
  if (value >= 9) return 'Critical';
  if (value >= 7) return 'High';
  if (value >= 4) return 'Medium';
  if (value > 0) return 'Low';
  return 'None';
}

export function vulnerabilityClassFromTitle(title) {
  const value = String(title ?? '');
  if (/authentication bypass|missing authentication/i.test(value)) return 'Auth bypass';
  if (/sql injection/i.test(value)) return 'SQLi';
  if (/cross-site scripting|cross site scripting|\bxss\b/i.test(value)) return 'XSS';
  if (/insecure direct object reference|\bidor\b/i.test(value)) return 'IDOR';
  if (/privilege escalation/i.test(value)) return 'Privilege escalation';
  if (/arbitrary file upload|file upload/i.test(value)) return 'File upload';
  if (/arbitrary file read|file read/i.test(value)) return 'File read';
  if (/php object injection|object injection|unsafe deserial/i.test(value)) return 'Object injection';
  if (/information disclosure|information exposure|sensitive information|email disclosure/i.test(value)) return 'Info disclosure';
  if (/unvalidated redirect|open redirect/i.test(value)) return 'Open redirect';
  if (/payment bypass/i.test(value)) return 'Payment bypass';
  if (/missing authorization|improper authorization/i.test(value)) return 'Missing authz';
  return 'Other';
}

export function authContextFromTitle(title) {
  const value = String(title ?? '');
  if (/unauthenticated|missing authentication/i.test(value)) return 'Unauthenticated';
  const roleMatch = /authenticated\s*\(([^)]+)\)/i.exec(value);
  if (roleMatch) return roleMatch[1].trim();
  if (/authenticated/i.test(value)) return 'Authenticated';
  return 'Unknown';
}

export function targetFromTitle(title) {
  const value = String(title ?? '').trim();
  const versionBoundary = /^(.*?)\s+<=\s+/u.exec(value);
  if (versionBoundary?.[1]) return versionBoundary[1].trim();
  const dashBoundary = /^(.*?)\s+-\s+/u.exec(value);
  return (dashBoundary?.[1] ?? value).trim();
}

export function shortTitleFromTitle(title) {
  const value = String(title ?? '').trim();
  const match = /^.*?\s+<=\s+\S+\s*(?:-\s*)?(.*)$/u.exec(value);
  const shortened = (match?.[1] ?? value).trim();
  return shortened || value;
}

export function yearFromCveId(id) {
  const match = /^CVE-(\d{4})-/u.exec(String(id ?? ''));
  return match ? Number(match[1]) : 0;
}

export function classifyCve(item) {
  if (!item || typeof item !== 'object') throw new TypeError('CVE item must be an object');
  const title = String(item.title ?? '').trim();
  const authContext = typeof item.authContext === 'string' && item.authContext
    ? item.authContext
    : authContextFromTitle(title);
  return {
    ...item,
    severity: typeof item.severity === 'string' && item.severity ? item.severity : severityFromCvss(item.cvss),
    class: typeof item.class === 'string' && item.class ? item.class : vulnerabilityClassFromTitle(title),
    authContext,
    unauthenticated: typeof item.unauthenticated === 'boolean'
      ? item.unauthenticated
      : authContext === 'Unauthenticated',
    target: typeof item.target === 'string' && item.target ? item.target : targetFromTitle(title),
    year: Number.isInteger(item.year) ? item.year : yearFromCveId(item.id),
    shortTitle: typeof item.shortTitle === 'string' && item.shortTitle
      ? item.shortTitle
      : shortTitleFromTitle(title),
  };
}

export function buildStats(items) {
  return {
    total: items.length,
    critical: items.filter((item) => item.severity === 'Critical').length,
    high: items.filter((item) => item.severity === 'High').length,
    unauthenticated: items.filter((item) => item.unauthenticated === true).length,
  };
}

function validStats(stats) {
  return stats && ['total', 'critical', 'high', 'unauthenticated'].every(
    (key) => Number.isInteger(stats[key]) && stats[key] >= 0,
  );
}

export function normalizeWordfenceDocument(document) {
  if (!document || document.schemaVersion !== 1 || document.source !== 'Wordfence' || !Array.isArray(document.items)) {
    throw new Error('Invalid Wordfence CVE document');
  }
  const items = document.items.map(classifyCve);
  return {
    ...document,
    items,
    stats: validStats(document.stats) ? document.stats : buildStats(items),
  };
}

function cveChronologyValue(id) {
  const match = /^CVE-(\d{4})-(\d+)$/u.exec(String(id ?? ''));
  if (!match) return [0, 0n];
  return [Number(match[1]), BigInt(match[2])];
}

function compareDateDescending(left, right) {
  const leftDate = typeof left.published === 'string' ? Date.parse(left.published) : Number.NaN;
  const rightDate = typeof right.published === 'string' ? Date.parse(right.published) : Number.NaN;
  if (Number.isFinite(leftDate) || Number.isFinite(rightDate)) {
    const leftValue = Number.isFinite(leftDate) ? leftDate : 0;
    const rightValue = Number.isFinite(rightDate) ? rightDate : 0;
    if (rightValue !== leftValue) return rightValue - leftValue;
  }
  const [leftYear, leftNumber] = cveChronologyValue(left.id);
  const [rightYear, rightNumber] = cveChronologyValue(right.id);
  if (rightYear !== leftYear) return rightYear - leftYear;
  return rightNumber === leftNumber ? 0 : rightNumber > leftNumber ? 1 : -1;
}

export function filterAndSort(items, state) {
  const severity = state?.severity ?? 'All';
  const vulnerabilityClass = state?.vulnerabilityClass ?? 'All';
  const sort = state?.sort ?? 'cvss';
  const filtered = items.filter((item) => (
    (severity === 'All' || item.severity === severity)
    && (vulnerabilityClass === 'All' || item.class === vulnerabilityClass)
  ));
  return filtered.sort((left, right) => {
    if (sort === 'date') return compareDateDescending(left, right);
    const scoreDifference = Number(right.cvss) - Number(left.cvss);
    return scoreDifference !== 0 ? scoreDifference : compareDateDescending(left, right);
  });
}

export function deriveClassOptions(items) {
  const present = new Set(items.map((item) => item.class));
  return CLASS_PRIORITY.filter((name) => present.has(name));
}
