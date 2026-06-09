import type { Literature } from '@/utils/db';
import { normalizeAuthorName } from './authorUtils';

// ============================================================
// RIS Parser
// ============================================================

/** Result of parsing an RIS file containing zero or more records. */
export interface RisParseResult {
  results: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
}

/**
 * Parse an RIS format string into an array of Literature objects.
 *
 * RIS format uses two-letter tags followed by "  - " and the value.
 * Records are separated by "ER  -" tags.
 *
 * @param content - Raw RIS file content
 * @returns Parsed literature entries and any parsing errors
 */
export function parseRis(content: string): RisParseResult {
  const results: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { results, errors };
  }

  // Split into individual records by the ER (End of Reference) tag
  const records = content.split(/^ER\s*-/m);

  for (let recordIdx = 0; recordIdx < records.length; recordIdx++) {
    const record = records[recordIdx].trim();
    if (!record) continue;

    try {
      const parsed = parseRisRecord(record);
      if (parsed) {
        results.push(parsed);
      }
    } catch (err) {
      errors.push(
        `Record ${recordIdx + 1}: ${err instanceof Error ? err.message : 'Unknown parsing error'}`
      );
    }
  }

  return { results, errors };
}

/**
 * Parse a single RIS record into a Literature object.
 * Collects all tag-value pairs and maps them to the Literature model.
 */
function parseRisRecord(
  record: string
): Omit<Literature, 'id' | 'createdAt' | 'updatedAt'> | null {
  const lines = record.split(/\r?\n/);
  const tagValues: Map<string, string[]> = new Map();

  // Parse each line into tag-value pairs
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    // RIS format: "TY  - JOUR" or "AU  - Smith, John"
    const match = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)/);
    if (match) {
      const tag = match[1];
      const value = match[2].trim();
      if (value) {
        const existing = tagValues.get(tag) || [];
        existing.push(value);
        tagValues.set(tag, existing);
      }
    }
  }

  // A valid record must have at least a title
  const title = getFirstValue(tagValues, 'TI', 'T1');
  if (!title) {
    return null;
  }

  // Collect authors from all author-related tags and normalize to "First Last"
  const authorTags = ['AU', 'A1', 'A2', 'A3', 'A4'];
  const authors: string[] = [];
  for (const tag of authorTags) {
    const values = tagValues.get(tag);
    if (values) {
      authors.push(...values.map(normalizeAuthorName));
    }
  }

  // Collect keywords from KW tags (each KW can contain semicolon-separated values)
  const keywords: string[] = [];
  const kwValues = tagValues.get('KW');
  if (kwValues) {
    for (const kw of kwValues) {
      // Split by semicolons and trim each keyword
      const parts = kw.split(';').map((s) => s.trim()).filter(Boolean);
      keywords.push(...parts);
    }
  }

  // Combine start page and end page into "SP-EP" format
  const startPage = getFirstValue(tagValues, 'SP');
  const endPage = getFirstValue(tagValues, 'EP');
  let pages = '';
  if (startPage && endPage) {
    pages = `${startPage}-${endPage}`;
  } else if (startPage) {
    pages = startPage;
  } else if (endPage) {
    pages = endPage;
  }

  // Date: prefer DA, then Y1, then PY
  const publishDate = getFirstValue(tagValues, 'DA', 'Y1', 'PY');

  // Type: TY tag stores the reference type (e.g., JOUR, BOOK)
  const refType = getFirstValue(tagValues, 'TY');

  return {
    title,
    authors,
    abstract: getFirstValue(tagValues, 'AB', 'N2') || '',
    keywords,
    publishDate: publishDate || '',
    category: '',
    doi: getFirstValue(tagValues, 'DO') || '',
    journal: getFirstValue(tagValues, 'T2', 'JA', 'JF', 'J0') || refType || '',
    volume: getFirstValue(tagValues, 'VL') || '',
    number: getFirstValue(tagValues, 'IS') || '',
    pages,
    publisher: getFirstValue(tagValues, 'PB') || '',
    sourceFormat: 'ris',
    pdfPath: '',
    pdfFileName: '',
    cloudLink: '',
    tagIds: [],
  };
}

/**
 * Retrieve the first non-empty value from a Map for any of the given tags.
 * Tags are checked in order; the first match is returned.
 */
function getFirstValue(
  tagValues: Map<string, string[]>,
  ...tags: string[]
): string | undefined {
  for (const tag of tags) {
    const values = tagValues.get(tag);
    if (values && values.length > 0 && values[0]) {
      return values[0];
    }
  }
  return undefined;
}
