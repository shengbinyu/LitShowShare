/**
 * BibTeX Parser
 *
 * Parses BibTeX format strings into Literature objects.
 * Uses a custom regex-based parser (no external dependency needed)
 * that handles various BibTeX styles robustly.
 */

import type { Literature } from '@/utils/db';
import { normalizeAuthorName } from './authorUtils';

// ============================================================
// Types
// ============================================================

export interface BibtexParseResult {
  results: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: string[];
}

interface BibtexEntry {
  citationKey: string;
  entryType: string;
  fields: Record<string, string>;
}

// ============================================================
// Main Parser
// ============================================================

/**
 * Parse a BibTeX format string into an array of Literature objects.
 * Uses custom regex-based parsing for robustness.
 *
 * @param content - Raw BibTeX file/text content
 * @returns Parsed literature entries and any parsing errors
 */
export function parseBibtex(content: string): BibtexParseResult {
  const results: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return { results, errors };
  }

  try {
    const entries = parseBibtexEntries(content);

    for (let i = 0; i < entries.length; i++) {
      try {
        const literature = mapBibtexEntry(entries[i]);
        if (literature) {
          results.push(literature);
        }
      } catch (err) {
        errors.push(
          `Entry ${i + 1}: ${err instanceof Error ? err.message : 'Unknown mapping error'}`
        );
      }
    }
  } catch (err) {
    errors.push(
      `Parse error: ${err instanceof Error ? err.message : 'Unknown BibTeX parsing error'}`
    );
  }

  return { results, errors };
}

// ============================================================
// Custom BibTeX Parser (regex-based, handles major formats)
// ============================================================

/**
 * Parse raw BibTeX text into structured entries.
 * Handles @article{key, field = {value}, field = "value", etc.
 */
function parseBibtexEntries(text: string): BibtexEntry[] {
  const entries: BibtexEntry[] = [];

  // Match BibTeX entries: @type{key, ...fields...}
  // This regex matches the entry type, citation key, and captures the body
  const entryRegex = /@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\}\s*(?=@|\s*$)/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(text)) !== null) {
    const entryType = match[1].toLowerCase();
    const citationKey = match[2].trim();
    const body = match[3].trim();

    try {
      const fields = parseFields(body);
      entries.push({ citationKey, entryType, fields });
    } catch {
      // Skip entries that fail field parsing but continue with others
      continue;
    }
  }

  return entries;
}

/**
 * Parse the field body of a BibTeX entry.
 * Handles:
 *   field = {value}
 *   field = "value"
 *   field = 1234 (bare numbers)
 *   field = {nested {braces} here} (balanced braces)
 */
function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  // Match: optional comma, field name, optional whitespace, =, optional whitespace, value
  const fieldRegex = /,?\s*(\w+)\s*=\s*/gi;
  let lastIndex = 0;
  let fieldMatch: RegExpExecArray | null;

  while ((fieldMatch = fieldRegex.exec(body)) !== null) {
    const fieldName = fieldMatch[1].toLowerCase();
    const valueStart = fieldMatch.index + fieldMatch[0].length;
    const remaining = body.slice(valueStart);

    const value = extractFieldValue(remaining);
    if (value !== null) {
      fields[fieldName] = value;
      // Advance lastIndex past this value
      const valueLen = findValueEnd(remaining);
      lastIndex = valueStart + valueLen;
      fieldRegex.lastIndex = lastIndex;
    }
  }

  return fields;
}

/**
 * Extract the value from a BibTeX field, handling:
 * - {braced values} including nested braces
 * - "quoted values"
 * - Bare numbers
 */
function extractFieldValue(text: string): string | null {
  text = text.trimStart();

  if (text.startsWith('{')) {
    // Braced value - handle nested braces
    let depth = 0;
    let endIdx = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx === -1) return null; // Unbalanced braces
    // Extract content between outer braces, keeping inner braces
    return text.slice(1, endIdx).trim();
  }

  if (text.startsWith('"')) {
    // Quoted value
    const endIdx = text.indexOf('"', 1);
    if (endIdx === -1) return null;
    return text.slice(1, endIdx);
  }

  // Bare value (number or single word)
  const bareMatch = text.match(/^([^\s,}]+)/);
  if (bareMatch) {
    return bareMatch[1];
  }

  return null;
}

/**
 * Find the end position of a BibTeX field value starting at index 0 of text.
 */
function findValueEnd(text: string): number {
  text = text.trimStart();
  const trimmedLen = text.length - text.trimStart().length;
  text = text.trimStart();

  if (text.startsWith('{')) {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) return i + 1 + trimmedLen;
      }
    }
    return text.length + trimmedLen;
  }

  if (text.startsWith('"')) {
    const endIdx = text.indexOf('"', 1);
    if (endIdx === -1) return text.length + trimmedLen;
    return endIdx + 1 + trimmedLen;
  }

  const bareMatch = text.match(/^([^\s,}]+)/);
  if (bareMatch) return bareMatch[0].length + trimmedLen;

  return text.length + trimmedLen;
}

// ============================================================
// Mapping
// ============================================================

/**
 * Map a parsed BibTeX entry to the Literature model.
 * Strips curly braces from all string values and handles field normalization.
 */
function mapBibtexEntry(
  entry: BibtexEntry
): Omit<Literature, 'id' | 'createdAt' | 'updatedAt'> | null {
  const { entryType, fields } = entry;

  // Extract and normalize title
  const title = cleanValue(fields['title']);
  if (!title) {
    return null;
  }

  // Split authors by " and " separator, then normalize name format
  const authorStr = cleanValue(fields['author']);
  const authors = authorStr
    ? authorStr
        .split(/\s+and\s+/i)
        .map((a) => a.trim())
        .filter(Boolean)
        .map(normalizeAuthorName)
    : [];

  // Split keywords by semicolons, commas, or newlines
  const keywordStr = cleanValue(fields['keywords']) || cleanValue(fields['keyword']);
  const keywords = keywordStr
    ? keywordStr
        .split(/[;,]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  // Build publish date from year/month/date fields
  const year = cleanValue(fields['year']);
  const month = cleanValue(fields['month']);
  const publishDate = [year, month].filter(Boolean).join('-');

  const category = entryType ? `bibtex-${entryType}` : '';

  return {
    title,
    authors,
    abstract: cleanValue(fields['abstract']) || cleanValue(fields['abstr']) || '',
    keywords,
    publishDate,
    category,
    doi: cleanValue(fields['doi']) || '',
    journal: cleanValue(fields['journal']) || cleanValue(fields['journaltitle']) || '',
    volume: cleanValue(fields['volume']) || '',
    number: cleanValue(fields['number']) || '',
    pages: cleanValue(fields['pages']) || '',
    publisher: cleanValue(fields['publisher']) || '',
    sourceFormat: 'bibtex',
    pdfPath: '',
    pdfFileName: '',
    cloudLink: '',
    tagIds: [],
  };
}

/**
 * Clean a BibTeX field value: remove surrounding braces, trim whitespace.
 */
function cleanValue(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/[{}]/g, '')
    .replace(/\\"/g, '"')
    .trim();
}
