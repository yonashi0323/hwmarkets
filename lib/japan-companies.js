import {inflateRawSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {parseCSV} from '../portfolio-csv.js';

export const CACHE_MS = 24 * 60 * 60 * 1000;
export const SOURCE_URL = 'https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip';
export const LICENSE_URL = 'https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/WZEK0030.html';
const MAX_ZIP_BYTES = 5 * 1024 * 1024;
const MAX_CSV_BYTES = 10 * 1024 * 1024;
const CSV_NAME = 'EdinetcodeDlInfo.csv';
const MIN_COMPANIES = 3000;
const MAX_COMPANIES = 10000;
const snapshotURL = new URL('../japan-companies.json', import.meta.url);

export class CompanyCatalogError extends Error {
  constructor(code = 'upstream_error', status = 502) {
    super(code); this.code = code; this.status = status;
  }
}
const reject = () => { throw new CompanyCatalogError('invalid_catalog'); };
const normalize = value => String(value ?? '').normalize('NFKC').trim();
function clean(value, max, optional = false) {
  if (typeof value !== 'string') reject();
  const result = value.trim();
  if ((!optional && !result) || result.length > max || /[\u0000-\u001f\u007f\ufffd]/u.test(result)) reject();
  return result;
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) reject();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) reject();
  return value;
}
function isoTimestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) reject();
  return new Date(value).toISOString();
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Read only the expected single CSV; never extract ZIP paths onto the filesystem.
export function extractEdinetCSV(input) {
  const zip = Buffer.from(input);
  if (zip.length < 22 || zip.length > MAX_ZIP_BYTES) reject();
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50 && i + 22 + zip.readUInt16LE(i + 20) === zip.length) { end = i; break; }
  }
  if (end < 0 || zip.readUInt16LE(end + 4) || zip.readUInt16LE(end + 6)) reject();
  const entries = zip.readUInt16LE(end + 10);
  const directorySize = zip.readUInt32LE(end + 12);
  const directoryStart = zip.readUInt32LE(end + 16);
  if (entries !== 1 || zip.readUInt16LE(end + 8) !== entries || directoryStart + directorySize !== end || directorySize < 46) reject();
  const pos = directoryStart;
  if (pos + 46 > end || zip.readUInt32LE(pos) !== 0x02014b50) reject();
  const flags = zip.readUInt16LE(pos + 8), method = zip.readUInt16LE(pos + 10);
  const checksum = zip.readUInt32LE(pos + 16), packed = zip.readUInt32LE(pos + 20), size = zip.readUInt32LE(pos + 24);
  const nameLength = zip.readUInt16LE(pos + 28), extraLength = zip.readUInt16LE(pos + 30), commentLength = zip.readUInt16LE(pos + 32);
  const localStart = zip.readUInt32LE(pos + 42);
  if ((flags & ~0x0808) || ![0, 8].includes(method) || !packed || packed > MAX_ZIP_BYTES || !size || size > MAX_CSV_BYTES ||
      zip.readUInt16LE(pos + 34) || pos + 46 + nameLength + extraLength + commentLength !== end ||
      !zip.subarray(pos + 46, pos + 46 + nameLength).equals(Buffer.from(CSV_NAME))) reject();
  if (localStart + 30 > directoryStart || zip.readUInt32LE(localStart) !== 0x04034b50 ||
      zip.readUInt16LE(localStart + 6) !== flags || zip.readUInt16LE(localStart + 8) !== method) reject();
  const localNameLength = zip.readUInt16LE(localStart + 26), localExtraLength = zip.readUInt16LE(localStart + 28);
  const dataStart = localStart + 30 + localNameLength + localExtraLength;
  if (dataStart > directoryStart || dataStart + packed > directoryStart ||
      !zip.subarray(localStart + 30, localStart + 30 + localNameLength).equals(Buffer.from(CSV_NAME))) reject();
  if (!(flags & 8) && (zip.readUInt32LE(localStart + 14) !== checksum || zip.readUInt32LE(localStart + 18) !== packed || zip.readUInt32LE(localStart + 22) !== size)) reject();
  let csv;
  try { csv = method === 8 ? inflateRawSync(zip.subarray(dataStart, dataStart + packed), {maxOutputLength: MAX_CSV_BYTES}) : zip.subarray(dataStart, dataStart + packed); }
  catch { reject(); }
  if (csv.length !== size || crc32(csv) !== checksum) reject();
  try { return new TextDecoder('shift_jis', {fatal: true}).decode(csv); }
  catch { reject(); }
}

export function normalizeEdinetCSV(text, fetchedAt, {minCompanies = 1} = {}) {
  if (typeof text !== 'string' || text.includes('\ufffd')) reject();
  const firstBreak = text.search(/[\r\n]/);
  if (firstBreak < 0) reject();
  const metadata = normalize(text.slice(0, firstBreak)).match(/^ダウンロード実行日,(\d{4})年(\d{1,2})月(\d{1,2})日現在,件数,(\d+)件$/);
  if (!metadata) reject();
  const asOf = validDate(`${metadata[1]}-${metadata[2].padStart(2, '0')}-${metadata[3].padStart(2, '0')}`);
  let parsed;
  try { parsed = parseCSV(text.slice(firstBreak).replace(/^[\r\n]+/, ''), {maxRows: 20000, maxBytes: MAX_CSV_BYTES}); }
  catch { reject(); }
  const headers = parsed.headers.map(normalize);
  const required = ['提出者種別', '上場区分', '提出者名', '提出者名(英字)', '提出者名(ヨミ)', '提出者業種', '証券コード'];
  const columns = Object.fromEntries(required.map(key => [key, headers.indexOf(key)]));
  if (Object.values(columns).some(index => index < 0) || parsed.rows.length !== Number(metadata[4])) reject();
  const companies = [], seen = new Set();
  for (const row of parsed.rows) {
    if (normalize(row[columns['上場区分']]) !== '上場' || normalize(row[columns['提出者種別']]) !== '内国法人・組合') continue;
    const code = normalize(row[columns['証券コード']]).toUpperCase();
    if (!/^[0-9A-Z]{4}0$/.test(code)) continue;
    const shortCode = code.slice(0, 4);
    if (seen.has(shortCode)) reject();
    seen.add(shortCode);
    companies.push({code: shortCode, name: clean(row[columns['提出者名']], 250), kana: clean(row[columns['提出者名(ヨミ)']], 500, true),
      englishName: clean(row[columns['提出者名(英字)']], 500, true), industry: clean(row[columns['提出者業種']], 100, true)});
  }
  if (companies.length < minCompanies || companies.length > MAX_COMPANIES) reject();
  companies.sort((a, b) => a.code.localeCompare(b.code, 'en'));
  return {source: 'EDINET', sourceUrl: SOURCE_URL, licenseUrl: LICENSE_URL, asOf, fetchedAt: isoTimestamp(fetchedAt), stale: false, companies};
}

export function validateCatalog(value, {minCompanies = MIN_COMPANIES} = {}) {
  if (!value || value.source !== 'EDINET' || value.sourceUrl !== SOURCE_URL || value.licenseUrl !== LICENSE_URL ||
      !Array.isArray(value.companies) || value.companies.length < minCompanies || value.companies.length > MAX_COMPANIES) reject();
  const seen = new Set();
  const companies = value.companies.map(company => {
    if (!company || typeof company.code !== 'string' || !/^[0-9A-Z]{4}$/.test(company.code) || seen.has(company.code)) reject();
    seen.add(company.code);
    return {code: company.code, name: clean(company.name, 250), kana: clean(company.kana, 500, true),
      englishName: clean(company.englishName, 500, true), industry: clean(company.industry, 100, true)};
  });
  return {source: 'EDINET', sourceUrl: SOURCE_URL, licenseUrl: LICENSE_URL, asOf: validDate(value.asOf),
    fetchedAt: isoTimestamp(value.fetchedAt), stale: false, companies};
}

async function readBounded(response) {
  const size = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(size) && size > MAX_ZIP_BYTES) reject();
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_ZIP_BYTES) reject();
    return bytes;
  }
  const reader = response.body.getReader(), chunks = []; let total = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_ZIP_BYTES) { await reader.cancel(); reject(); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}

export function createCompanyCatalogService({fetchImpl = fetch, now = Date.now,
  loadSnapshot = async () => JSON.parse(await readFile(snapshotURL, 'utf8'))} = {}) {
  let cached, cachedAt = 0, pending, snapshot, snapshotPending;
  async function fallback() {
    if (snapshot) return snapshot;
    if (!snapshotPending) snapshotPending = Promise.resolve().then(loadSnapshot).then(validateCatalog).then(value => (snapshot = value)).finally(() => { snapshotPending = undefined; });
    return snapshotPending;
  }
  async function load() {
    try {
      const response = await fetchImpl(SOURCE_URL, {headers: {Accept: 'application/zip, application/octet-stream'}, signal: AbortSignal.timeout(12000), redirect: 'error'});
      if (!response.ok) throw new CompanyCatalogError();
      const value = normalizeEdinetCSV(extractEdinetCSV(await readBounded(response)), new Date(now()).toISOString(), {minCompanies: MIN_COMPANIES});
      // A new request must not replace a newer successful catalog with an older file.
      const baseline = cached || await fallback().catch(() => null);
      if (baseline && value.asOf < baseline.asOf) reject();
      cached = value; cachedAt = now(); return value;
    } catch {
      const value = cached || await fallback();
      cached = {...value, stale: true, staleReason: 'upstream_unavailable'};
      cachedAt = now(); return cached;
    }
  }
  return async function getCompanyCatalog() {
    if (cached && now() - cachedAt < CACHE_MS) return cached;
    if (!pending) pending = load().finally(() => { pending = undefined; });
    return pending;
  };
}