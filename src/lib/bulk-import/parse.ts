// Pure, client-safe parsing for the Super Admin bulk-import tool. Turns text
// pasted straight out of Excel/Google Sheets (tab-delimited when copied from
// a spreadsheet, comma-delimited as a CSV fallback) into row objects keyed
// by the field names each import panel declares — matched against the
// pasted header row case/whitespace-insensitively, in any column order.

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}

export interface ParsedSheet<T = Record<string, string>> {
  rows: T[];
  matchedHeaders: string[];
  unmatchedHeaders: string[];
  missingRequired: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parsePastedSheet<T = Record<string, string>>(text: string, fields: ImportField[]): ParsedSheet<T> {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], matchedHeaders: [], unmatchedHeaders: [], missingRequired: fields.filter((f) => f.required).map((f) => f.label) };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headerCells = lines[0].split(delimiter).map((h) => h.trim());
  const normalizedHeaders = headerCells.map(normalize);

  const columnByField = new Map<string, number>();
  for (const field of fields) {
    const idx = normalizedHeaders.findIndex((h) => h === normalize(field.label) || h === normalize(field.key));
    if (idx !== -1) columnByField.set(field.key, idx);
  }

  const matchedColumnIndexes = new Set(columnByField.values());
  const matchedHeaders = fields.filter((f) => columnByField.has(f.key)).map((f) => f.label);
  const unmatchedHeaders = headerCells.filter((_, i) => !matchedColumnIndexes.has(i));
  const missingRequired = fields.filter((f) => f.required && !columnByField.has(f.key)).map((f) => f.label);

  const rows = lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    const row: Record<string, string> = {};
    for (const field of fields) {
      const idx = columnByField.get(field.key);
      row[field.key] = idx !== undefined ? cells[idx] ?? "" : "";
    }
    return row as T;
  });

  return { rows, matchedHeaders, unmatchedHeaders, missingRequired };
}
