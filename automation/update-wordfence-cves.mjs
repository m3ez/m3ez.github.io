import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const ENDPOINT = "https://www.wordfence.com/api/intelligence/v3/vulnerabilities/production";
const SOURCE = "Wordfence";
const PROFILE = "https://www.wordfence.com/threat-intel/vulnerabilities/researchers/supakiad-s";
const RESEARCHER_ALIASES = new Set([
  "supakiad s. (m3ez)",
  "supakiad s.",
  "m3ez",
]);
const CVE_PATTERN = /^CVE-(?:1999|2\d{3})-\d{4,}$/;
const CVE_PARTS_PATTERN = /^CVE-(\d{4})-(\d{4,})$/;

export function normalizeResearcherName(value) {
  if (typeof value !== "string") {
    throw new TypeError("Researcher names must be strings");
  }

  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseHttpsUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" ? url : null;
  } catch {
    return null;
  }
}

function isWordfenceUrl(value) {
  const url = parseHttpsUrl(value);
  return url !== null && (url.hostname === "wordfence.com" || url.hostname.endsWith(".wordfence.com"));
}

function isOfficialCveRecordUrl(value, cveId) {
  const url = parseHttpsUrl(value);
  const authority = typeof value === "string" ? /^https:\/\/([^/?#]+)/iu.exec(value)?.[1] : undefined;
  if (
    url === null ||
    (url.hostname !== "cve.org" && url.hostname !== "www.cve.org") ||
    url.port !== "" ||
    authority?.toLowerCase() !== url.hostname ||
    url.pathname !== "/CVERecord" ||
    url.hash !== ""
  ) {
    return false;
  }

  const parameters = [...url.searchParams];
  return parameters.length === 1 && parameters[0][0] === "id" && parameters[0][1] === cveId;
}

function isCvssBaseScore(value) {
  return Number.isFinite(value) && value >= 0 && value <= 10 && Number.isInteger(value * 10);
}

function compareCveDescending(left, right) {
  const leftMatch = CVE_PARTS_PATTERN.exec(left);
  const rightMatch = CVE_PARTS_PATTERN.exec(right);
  const yearDifference = Number(rightMatch[1]) - Number(leftMatch[1]);
  if (yearDifference !== 0) {
    return yearDifference;
  }

  const numberDifference = BigInt(rightMatch[2]) - BigInt(leftMatch[2]);
  if (numberDifference !== 0n) {
    return numberDifference < 0n ? -1 : 1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

function assertResearchers(record) {
  if (!Array.isArray(record.researchers) || !record.researchers.every((value) => typeof value === "string")) {
    throw new Error("Invalid Wordfence researcher schema");
  }
}

function normalizeTitle(value) {
  if (typeof value !== "string") {
    throw new Error("Matching Wordfence record has an invalid title");
  }

  const title = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (title.length === 0) {
    throw new Error("Matching Wordfence record has a blank title");
  }
  return title;
}

function extractCvssScore(record) {
  if (!isPlainObject(record.cvss) || !isCvssBaseScore(record.cvss.score)) {
    throw new Error("Matching Wordfence record has an invalid CVSS score");
  }
  return record.cvss.score;
}

function compareCandidate(left, right) {
  if (left.href !== right.href) {
    return left.href < right.href ? -1 : 1;
  }
  if (left.title !== right.title) {
    return left.title < right.title ? -1 : 1;
  }
  return left.cvss - right.cvss;
}

function selectAdvisoryUrl(record) {
  if (!Array.isArray(record.references) || !record.references.every((value) => typeof value === "string")) {
    throw new Error("Invalid Wordfence references schema");
  }

  const wordfenceReference = record.references.find(isWordfenceUrl);
  if (wordfenceReference) {
    return wordfenceReference;
  }

  if (isOfficialCveRecordUrl(record.cve_link, record.cve)) {
    return record.cve_link;
  }

  throw new Error("Matching Wordfence record has no HTTPS advisory URL");
}

export function extractWordfenceCves(feed) {
  if (!isPlainObject(feed)) {
    throw new Error("Invalid Wordfence production feed schema");
  }

  const byId = new Map();
  for (const record of Object.values(feed)) {
    if (!isPlainObject(record)) {
      throw new Error("Invalid Wordfence production feed schema");
    }

    assertResearchers(record);
    if (!record.researchers.some((name) => RESEARCHER_ALIASES.has(normalizeResearcherName(name)))) {
      continue;
    }

    if (typeof record.cve !== "string" || !CVE_PATTERN.test(record.cve)) {
      throw new Error("Matching Wordfence record has a malformed CVE");
    }

    const candidate = {
      id: record.cve,
      title: normalizeTitle(record.title),
      cvss: extractCvssScore(record),
      href: selectAdvisoryUrl(record),
    };
    const current = byId.get(record.cve);
    if (current === undefined || compareCandidate(candidate, current) < 0) {
      byId.set(record.cve, candidate);
    }
  }

  const items = [...byId.values()].sort((left, right) => compareCveDescending(left.id, right.id));

  if (items.length === 0) {
    throw new Error("Wordfence production feed contains no matching CVEs");
  }

  return {
    schemaVersion: 1,
    source: SOURCE,
    profile: PROFILE,
    items,
  };
}

function assertGeneratedDocument(document) {
  if (!isPlainObject(document) || document.schemaVersion !== 1 || document.source !== SOURCE || document.profile !== PROFILE) {
    throw new Error("Invalid generated Wordfence document");
  }

  if (!Array.isArray(document.items) || document.items.length === 0) {
    throw new Error("Generated Wordfence document must contain CVEs");
  }

  const seen = new Set();
  let previousId = null;
  for (const item of document.items) {
    if (
      !isPlainObject(item) ||
      Object.keys(item).sort().join(",") !== "cvss,href,id,title" ||
      typeof item.id !== "string" ||
      !CVE_PATTERN.test(item.id) ||
      (!isWordfenceUrl(item.href) && !isOfficialCveRecordUrl(item.href, item.id))
    ) {
      throw new Error("Generated Wordfence document contains an invalid item");
    }
    if (normalizeTitle(item.title) !== item.title || !isCvssBaseScore(item.cvss)) {
      throw new Error("Generated Wordfence document contains an invalid item");
    }
    if (seen.has(item.id) || (previousId !== null && compareCveDescending(previousId, item.id) > 0)) {
      throw new Error("Generated Wordfence document items are not deterministic");
    }
    seen.add(item.id);
    previousId = item.id;
  }
}

function serializeDocument(document) {
  assertGeneratedDocument(document);
  return `${JSON.stringify(document, null, 2)}\n`;
}

export async function writeGeneratedFile(document, outputPath) {
  const bytes = Buffer.from(serializeDocument(document), "utf8");
  const resolvedOutputPath = resolve(outputPath);
  const outputDirectory = dirname(resolvedOutputPath);

  let existing;
  try {
    existing = await readFile(resolvedOutputPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (existing !== undefined && Buffer.compare(existing, bytes) === 0) {
    return false;
  }

  await mkdir(outputDirectory, { recursive: true });
  const temporaryPath = resolve(outputDirectory, `.${basename(resolvedOutputPath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, bytes, { flag: "wx" });
    await rename(temporaryPath, resolvedOutputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }

  return true;
}

function parseArguments(argumentsList) {
  let inputPath;
  let outputPath;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if ((argument === "--input" || argument === "--output") && index + 1 < argumentsList.length) {
      const value = argumentsList[index + 1];
      if (argument === "--input" && inputPath === undefined) {
        inputPath = value;
      } else if (argument === "--output" && outputPath === undefined) {
        outputPath = value;
      } else {
        throw new Error("Invalid command arguments");
      }
      index += 1;
      continue;
    }
    throw new Error("Invalid command arguments");
  }

  if (outputPath === undefined) {
    throw new Error("An output path is required");
  }

  return { inputPath, outputPath };
}

async function readFixture(inputPath) {
  let source;
  try {
    source = await readFile(inputPath, "utf8");
  } catch {
    throw new Error("Unable to read Wordfence input");
  }

  try {
    return JSON.parse(source);
  } catch {
    throw new Error("Invalid Wordfence input JSON");
  }
}

async function fetchProductionFeed() {
  const apiKey = process.env.WORDFENCE_API_KEY;
  if (!apiKey) {
    throw new Error("WORDFENCE_API_KEY is required when no input fixture is supplied");
  }

  let response;
  try {
    response = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error("Unable to fetch the Wordfence production feed");
  }

  if (!response.ok) {
    throw new Error("Wordfence production feed request failed");
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Wordfence production feed returned invalid JSON");
  }
}

async function readExistingDocument(outputPath) {
  try {
    const content = await readFile(outputPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw new Error("Existing Wordfence output is invalid");
  }
}

async function updateFromCommandLine(argumentsList) {
  const { inputPath, outputPath } = parseArguments(argumentsList);
  const feed = inputPath === undefined ? await fetchProductionFeed() : await readFixture(inputPath);
  const document = extractWordfenceCves(feed);
  const existing = await readExistingDocument(outputPath);
  if (existing !== null) {
    assertGeneratedDocument(existing);
    if (document.items.length < existing.items.length) {
      throw new Error("Wordfence CVE list unexpectedly shrank");
    }
    const nextIds = new Set(document.items.map(({ id }) => id));
    if (existing.items.some(({ id }) => !nextIds.has(id))) {
      throw new Error("Wordfence CVE update dropped a published CVE ID");
    }
  }
  await writeGeneratedFile(document, outputPath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateFromCommandLine(process.argv.slice(2)).catch((error) => {
    console.error(`Wordfence update failed: ${error.message}`);
    process.exitCode = 1;
  });
}
