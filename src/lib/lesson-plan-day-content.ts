// Reference library phase text (phase1_starter/phase2_main/phase3_reflection)
// is a single week's plan with each weekday's activities concatenated
// together, day-labelled by the source document itself — e.g.
// "Monday: ... \n\nTuesday: ... \n\nWednesday: ...". These helpers pull one
// day's slice back out, and split a corpus-concatenated indicator string
// (multiple GES codes run together, one per day) into its individual codes.

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const DAY_PATTERN = new RegExp(`(${DAY_NAMES.join("|")}):\\s*`, "g");

export type DayContentMap = Partial<Record<(typeof DAY_NAMES)[number], string>>;

// Returns null when the text isn't day-labelled at all (some subjects'
// source documents aren't broken out by day), so callers can fall back to
// showing the whole thing rather than losing content.
export function splitByDay(text: string | null | undefined): DayContentMap | null {
  if (!text) return null;
  const matches = [...text.matchAll(DAY_PATTERN)];
  if (matches.length === 0) return null;

  const result: DayContentMap = {};
  for (let i = 0; i < matches.length; i++) {
    const day = matches[i][1] as (typeof DAY_NAMES)[number];
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const segment = text.slice(start, end).trim();
    if (!segment) continue;
    result[day] = result[day] ? `${result[day]}\n\n${segment}` : segment;
  }
  return result;
}

// day_name is a free string on the form (not restricted to DAY_NAMES at the
// type level), so this stays permissive about the lookup key.
export function pickDayContent(map: DayContentMap | null, day: string, fallback: string | null): string {
  if (day && map && map[day as keyof DayContentMap]) return map[day as keyof DayContentMap]!;
  return fallback ?? "";
}

// GES indicator codes look like "B4.1.1.1.1" (optionally with a trailing
// dot) — a letter prefix, then 3-7 dot-separated number groups. The corpus
// sometimes concatenates several of these (one per day) into a single
// indicator string; this extracts each distinct one, in order.
const INDICATOR_CODE_PATTERN = /\b[A-Z]{1,4}\d+(?:\.\d+){2,6}\.?/g;

export function extractIndicatorCodes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const match of raw.matchAll(INDICATOR_CODE_PATTERN)) {
    if (!seen.has(match[0])) {
      seen.add(match[0]);
      ordered.push(match[0]);
    }
  }
  return ordered;
}
