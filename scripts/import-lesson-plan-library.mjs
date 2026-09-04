// Imports a local corpus of GES weekly lesson-plan documents (docx/pdf)
// into the `lesson_plan_library` table (database/023_lesson_plan_library.sql)
// so teachers can pick pre-written GES content from a dropdown instead of
// typing every field from scratch (see src/app/teacher/lesson-notes).
//
// Standalone maintenance script — NOT part of the Next.js app. Talks
// directly to Supabase with the service-role key (bypasses RLS
// deliberately: this is a privileged one-off/rerunnable import, not
// something an end user triggers).
//
// Usage:
//   node scripts/import-lesson-plan-library.mjs "<path to corpus root>"
//
// The corpus root must contain "TERM 1" / "TERM 2" / "TERM 3" folders,
// each with one subfolder per class (B1..B9, KG1, KG2, tolerant of odd
// naming like "B5 TERM3", "B8TSOL", "B8 1", "B8 2").
//
// Safe to re-run: rows are upserted on the table's unique constraint, so
// fixing this script and re-running does not duplicate library entries.

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------------
// Env file loading (standalone script — Next.js's own env loading
// doesn't apply outside the Next runtime). Defaults to .env.local, but
// accepts --env=<path> so this can be pointed at a different project
// (e.g. a git-ignored .env.production.local) without touching the
// local-dev .env.local or ever passing secrets on the command line.
// ------------------------------------------------------------------
function loadEnvLocal() {
  const envArg = process.argv.find((a) => a.startsWith("--env="));
  const envPath = path.join(process.cwd(), envArg ? envArg.slice("--env=".length) : ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "lesson-plan-library";

// ------------------------------------------------------------------
// Corpus walking
// ------------------------------------------------------------------
const corpusRoot = process.argv[2];
if (!corpusRoot || !fs.existsSync(corpusRoot)) {
  console.error(
    'Usage: node scripts/import-lesson-plan-library.mjs "<path to corpus root>" [--term=N] [--class=<folder name>]'
  );
  process.exit(1);
}

// Optional narrowing so a single run only processes one term and/or one
// class folder — each invocation is then a short-lived process with a
// small memory footprint, letting the OS fully reclaim memory between
// runs rather than one long process accumulating for the whole corpus.
const termFilterArg = process.argv.find((a) => a.startsWith("--term="));
const classFilterArg = process.argv.find((a) => a.startsWith("--class="));
const termFilter = termFilterArg ? parseInt(termFilterArg.slice("--term=".length), 10) : null;
const classFilter = classFilterArg ? classFilterArg.slice("--class=".length) : null;

function isLockFile(name) {
  return name.startsWith("~$");
}

const SKIP_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp"]);

async function walkTermFolders(root) {
  const termDirs = (await fsp.readdir(root, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .filter((d) => /^TERM\s*[123]$/i.test(d.name.trim()));

  const result = []; // { termNumber, classDir, classFolderName, files: [...] }
  for (const termDir of termDirs) {
    const termNumber = parseInt(termDir.name.match(/[123]/)[0], 10);
    const termPath = path.join(root, termDir.name);
    const classDirs = (await fsp.readdir(termPath, { withFileTypes: true })).filter((d) => d.isDirectory());

    for (const classDir of classDirs) {
      if (/^new folder/i.test(classDir.name.trim())) continue;
      const classPath = path.join(termPath, classDir.name);
      const files = await collectFilesRecursively(classPath);
      result.push({ termNumber, classFolderName: classDir.name, classPath, files });
    }
  }
  return result;
}

async function collectFilesRecursively(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files = files.concat(await collectFilesRecursively(full));
    } else if (e.isFile() && !isLockFile(e.name)) {
      const ext = path.extname(e.name).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) continue;
      if (ext === ".docx" || ext === ".pdf") files.push(full);
    }
  }
  return files;
}

function normalizedBasename(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Prefer .docx over .pdf when both exist with the same normalized basename.
function dedupeFiles(files) {
  const byKey = new Map();
  for (const f of files) {
    const key = normalizedBasename(f);
    const ext = path.extname(f).toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, f);
    } else {
      const existingExt = path.extname(existing).toLowerCase();
      if (existingExt === ".pdf" && ext === ".docx") byKey.set(key, f); // prefer docx
    }
  }
  return [...byKey.values()];
}

// ------------------------------------------------------------------
// Class-folder -> academic level label
// ------------------------------------------------------------------
function academicLevelRawFromFolder(folderName) {
  const compact = folderName.toUpperCase().replace(/\s+/g, "");
  const m = compact.match(/^(KG[12]|B(\d{1,2}))/);
  if (!m) return null;
  if (m[1].startsWith("KG")) return `KG ${m[1].slice(2)}`;
  const n = parseInt(m[2], 10);
  if (n >= 1 && n <= 6) return `Basic ${n}`;
  if (n === 7) return "JHS 1";
  if (n === 8) return "JHS 2";
  if (n === 9) return "JHS 3";
  return null;
}

// ------------------------------------------------------------------
// Filename -> subject/week fallback (used when a document has no
// internal Subject/Week Ending fields at all, e.g. the CAD/PE/Career-Tech
// "FAYOL INC" template)
// ------------------------------------------------------------------
const FILENAME_SUBJECT_TOKENS = [
  [/CAREER[-\s]?TECH/i, "Career Technology"],
  [/\bC[-.]?TECH\b/i, "Career Technology"],
  [/\bCAD\b/i, "Creative Arts and Design"],
  [/\bMATHS?\b/i, "Mathematics"],
  [/\bENG\b/i, "English Language"],
  [/\bSCI\b/i, "Integrated Science"],
  [/\bSOC\b/i, "Social Studies"],
  [/\bRME\b/i, "Religious and Moral Education"],
  [/\bGH\b|GHANAIAN/i, "Ghanaian Language"],
  [/\bCOMP?\b|COMPUT/i, "Computing"],
  [/\bPE\b|PHYSICAL/i, "Physical and Health Education"],
  [/\bHIST/i, "History"],
];

function subjectFromFilename(fileName) {
  for (const [re, canonical] of FILENAME_SUBJECT_TOKENS) {
    if (re.test(fileName)) return canonical;
  }
  return null;
}

function weekFromFilename(fileName) {
  const m = fileName.match(/W(?:EE)?K\s*-?\s*(\d{1,2})/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

// ------------------------------------------------------------------
// Subject canonicalization (built from the corpus's real-world spelling
// variants) + fuzzy match against this org's real `subjects` rows.
// ------------------------------------------------------------------
const SUBJECT_CANON_RULES = [
  [/ENGLISH/i, "English Language"],
  [/R\.?\s*M\.?\s*E\b|RELIGIOUS/i, "Religious and Moral Education"],
  [/GHANAIAN/i, "Ghanaian Language"],
  [/COMPUT/i, "Computing"],
  [/MATHEMATIC|^MATHS?$/i, "Mathematics"],
  [/^SCIENCE$|INTEGRATED SCIENCE/i, "Integrated Science"],
  [/SOCIAL STUD/i, "Social Studies"],
  [/^HISTORY$|COMMUNITY HISTORY/i, "History"],
  [/CREATIVE ART/i, "Creative Arts and Design"],
  [/CAREER TECH/i, "Career Technology"],
  [/PHYSICAL|HEALTH EDUC|^PE$/i, "Physical and Health Education"],
  [/OUR WORLD|OWOP/i, "Our World Our People"],
];

function canonicalizeSubject(raw) {
  if (!raw) return null;
  // Strip contamination like "MATHEMATICS CLASS: ONE" bleeding in from an
  // adjacent table cell (see corpus survey findings).
  let cleaned = raw
    .replace(/\bCLASS\s*:.*/i, "")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 60) return null; // implausibly long = not really a subject value
  for (const [re, canonical] of SUBJECT_CANON_RULES) {
    if (re.test(cleaned)) return canonical;
  }
  // Title-case fallback for anything unrecognized — still kept as
  // subject_raw, just won't resolve to a subject_id.
  return cleaned
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ------------------------------------------------------------------
// Week-heading detection (both "WEEK 1" and spelled-out "WEEK ONE")
// ------------------------------------------------------------------
const WEEK_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function parseWeekToken(token) {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return WEEK_WORDS[t] ?? null;
}

function detectWeekHeading(text) {
  const m = text.match(/\bWEEK\s*[:\-]?\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i);
  if (!m) return null;
  const n = parseWeekToken(m[1]);
  return n ? { number: n, label: text.trim().slice(0, 50) } : null;
}

// ------------------------------------------------------------------
// Date parsing for "Week Ending" values, e.g. "5th September, 2025" /
// "3rd Oct. 2025". Best-effort — returns null rather than guessing.
// ------------------------------------------------------------------
const MONTHS = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseWeekEndingDate(text) {
  if (!text) return null;
  const m = text.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\.?\s*([A-Za-z]+)\.?,?\s*(\d{4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const monthKey = m[2].slice(0, 3).toLowerCase();
  const month = MONTHS[monthKey];
  if (!month) return null;
  return `${m[3]}-${month}-${day}`;
}

// ------------------------------------------------------------------
// Field-label normalization
// ------------------------------------------------------------------
const FIELD_LABELS = [
  [/^week\s*ending$|^date$|^week\s*ending\s*:?$/i, "week_ending"],
  [/^subject\s*:?$/i, "subject"],
  [/^reference\s*:?$/i, "reference"],
  [/^performance\s*indicator/i, "performance_indicator"],
  [/^(learning\s*)?indicator/i, "indicator"],
  [/^content\s*standard/i, "content_standard"],
  [/^strand\s*:?$/i, "strand"],
  [/^sub[\s-]?strand/i, "sub_strand"],
  [/^teaching\s*\/?\s*learning\s*resources?/i, "teaching_learning_resources"],
  [/^core\s*competencies/i, "core_competencies"],
  [/^key\s*words?/i, "keywords"],
  [/^remarks?$/i, "remarks"],
  [/^class$/i, "class"], // captured but not persisted — academic level already comes from the folder
];

function matchFieldLabel(text) {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/:$/, "");
  for (const [re, key] of FIELD_LABELS) {
    if (re.test(cleaned)) return key;
  }
  return null;
}

// Matches "Label: value" packed into one paragraph/cell (as opposed to a
// dedicated label cell with the value in a sibling cell). Returns
// { key, value } or null.
function matchInlineLabel(text) {
  const m = text.match(/^([A-Za-z /().'-]{2,40}?)\s*:\s*(.+)$/);
  if (!m) return null;
  const key = matchFieldLabel(m[1]);
  if (!key) return null;
  return { key, value: m[2] };
}

// ------------------------------------------------------------------
// Entry accumulator — shared between the docx (table-walk) and pdf
// (text-scan) extraction paths. A new entry starts every time a
// "Subject" field is encountered (whether that's a new table, per the
// common one-subject-per-table template, or a repeated Subject row
// within one table/section, per the "2 lessons in one week" template).
// ------------------------------------------------------------------
function createAccumulator(ctx) {
  const entries = [];
  let current = null;
  let currentWeek = { number: null, label: null };
  let inDaysSection = false;
  let lastDayName = null;
  let lastPhaseKey = null;

  function finalize() {
    if (current && current.subject_raw) entries.push(current);
    current = null;
    inDaysSection = false;
    lastDayName = null;
    lastPhaseKey = null;
  }

  function setWeek(week) {
    currentWeek = week;
  }

  function setField(key, value) {
    const text = value.replace(/\s+/g, " ").trim();
    if (!text) return;

    if (key === "subject") {
      finalize();
      current = {
        term_number: ctx.termNumber,
        academic_level_raw: ctx.academicLevelRaw,
        subject_raw: text,
        week_number: currentWeek.number,
        week_label: currentWeek.label,
        week_ending: null,
        strand: null,
        sub_strand: null,
        indicator: null,
        content_standard: null,
        performance_indicator: null,
        core_competencies: null,
        keywords: null,
        teaching_learning_resources: null,
        reference: null,
        phase1_starter: null,
        phase2_main: null,
        phase3_reflection: null,
        remarks: null,
      };
      return;
    }

    if (!current) return; // field appeared before any Subject — ignore (likely the scheme overview)

    switch (key) {
      case "week_ending":
        current.week_ending = parseWeekEndingDate(text);
        break;
      case "reference":
        current.reference = text;
        break;
      case "indicator":
        current.indicator = current.indicator ? `${current.indicator}; ${text}` : text;
        break;
      case "performance_indicator":
        current.performance_indicator = current.performance_indicator
          ? `${current.performance_indicator}\n${text}`
          : text;
        break;
      case "content_standard":
        current.content_standard = text;
        break;
      case "strand":
        current.strand = text;
        break;
      case "sub_strand":
        current.sub_strand = text;
        break;
      case "teaching_learning_resources":
        current.teaching_learning_resources = text;
        break;
      case "core_competencies":
        current.core_competencies = text;
        break;
      case "keywords":
        current.keywords = text;
        break;
      case "remarks":
        current.remarks = text;
        break;
      default:
        break;
    }
  }

  function beginDaysSection() {
    inDaysSection = !!current;
    lastDayName = null;
  }

  const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday"];

  function addDayRow(dayCellText, phase1Text, phase2Text, phase3Text) {
    if (!current || !inDaysSection) return;
    const dayText = dayCellText.replace(/\s+/g, " ").trim();
    if (DAY_NAMES.includes(dayText.toLowerCase())) lastDayName = dayText;
    const prefix = lastDayName ? `${lastDayName}: ` : "";

    const append = (fieldKey, text) => {
      const clean = text.replace(/\s+/g, " ").trim();
      if (!clean) return;
      const withPrefix = prefix ? `${prefix}${clean}` : clean;
      current[fieldKey] = current[fieldKey] ? `${current[fieldKey]}\n\n${withPrefix}` : withPrefix;
    };
    append("phase1_starter", phase1Text);
    append("phase2_main", phase2Text);
    append("phase3_reflection", phase3Text);
  }

  // Some templates write the whole week's activities as one block of text
  // inside a single cell, with "Starter (Nmins)" / "Main (Nmins)" /
  // "Reflection (Nmins)" as inline sub-headers rather than a day-by-day
  // table. Splits and assigns directly rather than accumulating.
  function setInlinePhases(starterText, mainText, reflectionText) {
    if (!current) return;
    if (starterText) current.phase1_starter = starterText.replace(/\s+/g, " ").trim() || current.phase1_starter;
    if (mainText) current.phase2_main = mainText.replace(/\s+/g, " ").trim() || current.phase2_main;
    if (reflectionText) current.phase3_reflection = reflectionText.replace(/\s+/g, " ").trim() || current.phase3_reflection;
  }

  // A fourth layout: one row per phase ("PHASE 1: STARTER" | activity
  // content | resources), with follow-on rows for the same phase leaving
  // the first cell blank. labelText identifies which phase a row belongs
  // to (or "" for a continuation row, using whichever phase was last
  // active). Returns false when the row doesn't look like a phase row at
  // all, so the caller can fall through to other row handling.
  const PHASE_ROW_PATTERNS = [
    [/PHASE\s*1|^STARTER\b/i, "phase1_starter"],
    [/PHASE\s*2|NEW\s*LEARNING|^MAIN\b/i, "phase2_main"],
    [/PHASE\s*3|REFLECTION/i, "phase3_reflection"],
  ];
  function addPhaseRow(labelText, contentText) {
    if (!current) return false;
    const label = labelText.replace(/\s+/g, " ").trim();
    const matched = PHASE_ROW_PATTERNS.find(([re]) => re.test(label));
    if (matched) {
      lastPhaseKey = matched[1];
    } else if (!label && lastPhaseKey) {
      // continuation row — keep using lastPhaseKey
    } else {
      return false;
    }
    const clean = contentText.replace(/\s+/g, " ").trim();
    if (clean) {
      current[lastPhaseKey] = current[lastPhaseKey] ? `${current[lastPhaseKey]}\n\n${clean}` : clean;
    }
    return true;
  }

  return {
    setWeek,
    setField,
    beginDaysSection,
    addDayRow,
    setInlinePhases,
    addPhaseRow,
    finalize,
    entries,
    get current() { return current; },
  };
}

// Detects the "Starter (5mins) ... Main (35mins) ... Reflection (10mins)"
// inline-block phase layout inside a single table cell and splits it into
// three chunks. Returns null if the cell doesn't look like this layout.
function trySplitInlinePhases(cellText) {
  const m = cellText.match(
    /Starter\s*\([^)]*\)?\s*:?\s*([\s\S]*?)\bMain\s*\([^)]*\)?\s*:?\s*([\s\S]*?)\bReflection\s*\([^)]*\)?\s*:?\s*([\s\S]*)$/i
  );
  if (!m) return null;
  return { starter: m[1], main: m[2], reflection: m[3] };
}

// ------------------------------------------------------------------
// DOCX extraction (mammoth -> HTML -> cheerio table walk)
// ------------------------------------------------------------------
// Skips embedding images as base64 data URIs — irrelevant to text-field
// extraction, and some source documents carry several megabytes of
// embedded pictures per file that otherwise bloat the in-memory HTML
// string enough to threaten OOM across a 2000+ file batch run.
const IGNORE_IMAGES = { convertImage: mammoth.images.imgElement(() => Promise.resolve({})) };

async function extractFromDocx(filePath, ctx) {
  let html;
  try {
    const result = await mammoth.convertToHtml({ path: filePath }, IGNORE_IMAGES);
    html = result.value;
  } catch (e) {
    return { entries: [], error: `mammoth failed: ${e.message}` };
  }
  if (!html || html.length < 20) return { entries: [], error: "empty document" };

  const $ = cheerio.load(html);
  const acc = createAccumulator(ctx);

  // Every table is walked the same way — an entry only actually starts
  // once a real "Subject" field is found and processed by setField (see
  // createAccumulator). This means a non-entry table (the scheme-overview
  // table, or a template with no structured fields at all) simply
  // contributes nothing rather than needing a separate up-front
  // "is this an entry table?" heuristic that could disagree with what
  // the row walk itself is actually able to extract.
  $("body")
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3") {
        const text = $(el).text();
        const week = detectWeekHeading(text);
        if (week) acc.setWeek(week);
        return;
      }
      if (tag !== "table") return;

      const rows = $(el).find("tr").toArray();
      for (const row of rows) {
        const cells = $(row).find("td,th").toArray();
        if (cells.length === 0) continue;
        const firstTrim = $(cells[0]).text().replace(/\s+/g, " ").trim();

        if (/^days$/i.test(firstTrim)) {
          acc.beginDaysSection();
          continue;
        }

        // Day-detail row: 4 cells [day, phase1, phase2, phase3].
        if (cells.length === 4 && acc.current && !matchFieldLabel(firstTrim) && !matchInlineLabel(firstTrim)) {
          acc.addDayRow($(cells[0]).text(), $(cells[1]).text(), $(cells[2]).text(), $(cells[3]).text());
          continue;
        }

        // Label-cell-then-value-cell(s) layout: first cell is JUST a label
        // with no value of its own attached (checked via matchInlineLabel
        // first — a cell like "Content Standard: B8.1.1.1. ..." must go
        // through the inline-scan path below, not this one, even though
        // matchFieldLabel's prefix regexes would also match its start).
        const wholeCellLabel = matchInlineLabel(firstTrim) ? null : matchFieldLabel(firstTrim);
        if (wholeCellLabel && wholeCellLabel !== "class") {
          const valueText = cells
            .slice(1)
            .map((c) => $(c).text())
            .join(" ");
          if (valueText.trim()) {
            acc.setField(wholeCellLabel, valueText);
            continue;
          }
        }

        // Compact-grid layout: scan every cell in the row for an inline
        // "Label: value" pair (several fields can share one row).
        let matchedAnyInline = false;
        for (const cell of cells) {
          const cellText = $(cell).text().replace(/\s+/g, " ").trim();
          if (!cellText) continue;

          const phases = trySplitInlinePhases(cellText);
          if (phases) {
            acc.setInlinePhases(phases.starter, phases.main, phases.reflection);
            matchedAnyInline = true;
            continue;
          }

          const inline = matchInlineLabel(cellText);
          if (inline && inline.key !== "class") {
            acc.setField(inline.key, inline.value);
            matchedAnyInline = true;
          }
        }
        if (matchedAnyInline) continue;

        // Fourth layout: one row per phase ("PHASE 1: STARTER" | activity
        // content | resources), continuation rows leaving the first cell
        // blank. Tried last so it never pre-empts an actual field row.
        if (cells.length >= 2 && acc.addPhaseRow(firstTrim, $(cells[1]).text())) continue;
      }
    });

  acc.finalize();

  if (acc.entries.length === 0) {
    // Fallback: no recognizable structured fields anywhere in the doc
    // (e.g. CAD/PE/Career-Tech "FAYOL INC" template). Dump the raw text
    // as a single filename-derived entry so there's still something for
    // an admin to review, rather than silently losing the file.
    const rawText = $("body").text().replace(/[ \t]+/g, " ").trim();
    const fileName = path.basename(filePath);
    return {
      entries: [
        {
          term_number: ctx.termNumber,
          academic_level_raw: ctx.academicLevelRaw,
          subject_raw: subjectFromFilename(fileName) ?? fileName,
          week_number: weekFromFilename(fileName),
          week_label: null,
          week_ending: null,
          strand: null,
          sub_strand: null,
          indicator: null,
          content_standard: null,
          performance_indicator: null,
          core_competencies: null,
          keywords: null,
          teaching_learning_resources: null,
          reference: null,
          phase1_starter: null,
          phase2_main: rawText.slice(0, 8000) || null,
          phase3_reflection: null,
          remarks: null,
          extraction_method: "docx_filename",
        },
      ],
    };
  }

  return { entries: acc.entries.map((e) => ({ ...e, extraction_method: "docx_fields" })) };
}

// ------------------------------------------------------------------
// PDF extraction (pdf-parse -> line-oriented field scan). Coarser than
// the docx table walk since PDF text has no cell boundaries, but reuses
// the same accumulator/state machine.
// ------------------------------------------------------------------
async function extractFromPdf(filePath, ctx) {
  let text;
  try {
    const buffer = await fsp.readFile(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = result.text;
    await parser.destroy();
  } catch (e) {
    return { entries: [], error: `pdf-parse failed: ${e.message}` };
  }
  if (!text || text.length < 20) return { entries: [], error: "empty document" };

  const acc = createAccumulator(ctx);
  const lines = text.split("\n").map((l) => l.trim());
  let sawSubject = false;
  let inDays = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const week = detectWeekHeading(line);
    if (week && !/subject|indicator/i.test(line)) acc.setWeek(week);

    if (/^days\b/i.test(line)) {
      inDays = true;
      continue;
    }

    // "Label: value" on one line, or "Label" on its own line followed by
    // the value on the next non-empty line.
    const inline = matchInlineLabel(line);
    let label = null;
    let value = null;
    if (inline) {
      label = inline.key;
      value = inline.value;
    } else {
      label = matchFieldLabel(line);
      if (label) {
        value = lines[i + 1] || "";
        i++;
      }
    }
    if (!label) continue;
    if (label === "subject") sawSubject = true;
    if (label !== "class") acc.setField(label, value);
    if (label === "subject") inDays = false;
  }

  acc.finalize();

  if (!sawSubject) {
    const fileName = path.basename(filePath);
    return {
      entries: [
        {
          term_number: ctx.termNumber,
          academic_level_raw: ctx.academicLevelRaw,
          subject_raw: subjectFromFilename(fileName) ?? fileName,
          week_number: weekFromFilename(fileName),
          week_label: null,
          week_ending: null,
          strand: null,
          sub_strand: null,
          indicator: null,
          content_standard: null,
          performance_indicator: null,
          core_competencies: null,
          keywords: null,
          teaching_learning_resources: null,
          reference: null,
          phase1_starter: null,
          phase2_main: text.slice(0, 8000) || null,
          phase3_reflection: null,
          remarks: null,
          extraction_method: "pdf_filename",
        },
      ],
    };
  }

  return { entries: acc.entries.map((e) => ({ ...e, extraction_method: "pdf_fields" })) };
}

// ------------------------------------------------------------------
// Main import
// ------------------------------------------------------------------
async function main() {
  console.log(`Reading corpus from ${corpusRoot}`);

  const { data: orgRows } = await supabase.from("organizations").select("id").limit(1);
  const organizationId = orgRows?.[0]?.id;
  if (!organizationId) {
    console.error("No organization found — seed the app first.");
    process.exit(1);
  }

  const { data: subjectRows } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("organization_id", organizationId);
  const { data: levelRows } = await supabase
    .from("academic_levels")
    .select("id, name")
    .eq("organization_id", organizationId);

  function resolveSubjectId(canonicalName) {
    if (!canonicalName) return null;
    const upper = canonicalName.toUpperCase();
    const exact = subjectRows?.find((s) => s.name.toUpperCase() === upper);
    if (exact) return exact.id;
    const fuzzy = subjectRows?.find(
      (s) => upper.includes(s.name.toUpperCase()) || s.name.toUpperCase().includes(upper)
    );
    return fuzzy?.id ?? null;
  }

  // Schools name their academic levels differently ("Basic 3" vs
  // "Primary 3" both mean the same class in Ghana's system) — try the
  // primary label, its common synonym, then a substring fuzzy match
  // before giving up.
  function resolveAcademicLevelId(rawLabel) {
    if (!rawLabel) return null;
    const candidates = [rawLabel];
    const basicToPrimary = rawLabel.match(/^Basic (\d)$/);
    if (basicToPrimary) candidates.push(`Primary ${basicToPrimary[1]}`);
    const primaryToBasic = rawLabel.match(/^Primary (\d)$/);
    if (primaryToBasic) candidates.push(`Basic ${primaryToBasic[1]}`);

    for (const candidate of candidates) {
      const upper = candidate.toUpperCase();
      const exact = levelRows?.find((l) => l.name.toUpperCase() === upper);
      if (exact) return exact.id;
    }
    const upper = rawLabel.toUpperCase();
    const fuzzy = levelRows?.find((l) => upper.includes(l.name.toUpperCase()) || l.name.toUpperCase().includes(upper));
    return fuzzy?.id ?? null;
  }

  let groups = await walkTermFolders(corpusRoot);
  if (termFilter) groups = groups.filter((g) => g.termNumber === termFilter);
  if (classFilter) groups = groups.filter((g) => g.classFolderName === classFilter);
  console.log(`Found ${groups.length} class/term folders, ${groups.reduce((n, g) => n + g.files.length, 0)} files total.`);

  const stats = {
    filesSeen: 0,
    filesSkippedLegacyOrCorrupt: 0,
    filesSkippedUnclassifiable: 0,
    filesSkippedDbError: 0,
    entriesCreated: 0,
    entriesAutoApproved: 0,
    entriesPendingReview: 0,
    perTerm: { 1: 0, 2: 0, 3: 0 },
    skippedFiles: [],
  };

  for (const group of groups) {
    const academicLevelRaw = academicLevelRawFromFolder(group.classFolderName);
    if (!academicLevelRaw) {
      stats.filesSkippedUnclassifiable += group.files.length;
      stats.skippedFiles.push({ reason: "unclassifiable class folder", folder: group.classPath });
      continue;
    }

    const files = dedupeFiles(group.files);
    for (const filePath of files) {
      stats.filesSeen++;
      if (stats.filesSeen % 100 === 0) {
        console.log(
          `... ${stats.filesSeen} files seen, ${stats.entriesCreated} entries created (${stats.entriesAutoApproved} auto-approved)`
        );
      }
      const ext = path.extname(filePath).toLowerCase();
      const ctx = { termNumber: group.termNumber, academicLevelRaw };
      const relPath = path.relative(corpusRoot, filePath);

      let extraction;
      try {
        extraction = ext === ".docx" ? await extractFromDocx(filePath, ctx) : await extractFromPdf(filePath, ctx);
      } catch (e) {
        stats.filesSkippedLegacyOrCorrupt++;
        stats.skippedFiles.push({ reason: `unexpected error: ${e.message}`, file: relPath });
        continue;
      }

      if (extraction.error || extraction.entries.length === 0) {
        stats.filesSkippedLegacyOrCorrupt++;
        stats.skippedFiles.push({ reason: extraction.error ?? "no entries extracted", file: relPath });
        continue;
      }

      // Upload the source file once per source document, reused by every
      // entry extracted from it.
      let storagePath = null;
      try {
        const fileBuffer = await fsp.readFile(filePath);
        const safeName = path.basename(filePath).replace(/[^A-Za-z0-9._-]/g, "_");
        storagePath = `${organizationId}/${crypto.randomUUID()}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf",
            upsert: true,
          });
        if (uploadError) storagePath = null;
      } catch {
        storagePath = null;
      }

      const rows = [];
      const rowMeta = [];
      for (const entry of extraction.entries) {
        const subjectCanonical = canonicalizeSubject(entry.subject_raw);
        const subjectId = resolveSubjectId(subjectCanonical);
        const academicLevelId = resolveAcademicLevelId(entry.academic_level_raw);

        const isStructured = entry.extraction_method === "docx_fields" || entry.extraction_method === "pdf_fields";
        const hasRequiredText =
          entry.strand && entry.indicator && entry.phase1_starter && entry.phase2_main && entry.phase3_reflection;
        const autoApprove = isStructured && subjectId && academicLevelId && hasRequiredText;

        const topic =
          [entry.strand, entry.sub_strand].filter(Boolean).join(" — ") ||
          entry.indicator ||
          `${subjectCanonical ?? entry.subject_raw}${entry.week_number ? ` — Week ${entry.week_number}` : ""}`;

        const row = {
          organization_id: organizationId,
          term_number: entry.term_number,
          academic_level_id: academicLevelId,
          academic_level_raw: entry.academic_level_raw,
          subject_id: subjectId,
          subject_raw: (subjectCanonical ?? entry.subject_raw).slice(0, 200),
          week_number: entry.week_number,
          week_label: entry.week_label,
          week_ending: entry.week_ending,
          topic: topic.slice(0, 300),
          strand: entry.strand,
          sub_strand: entry.sub_strand,
          indicator: entry.indicator?.slice(0, 100) ?? null,
          content_standard: entry.content_standard,
          performance_indicator: entry.performance_indicator,
          core_competencies: entry.core_competencies,
          keywords: entry.keywords,
          teaching_learning_resources: entry.teaching_learning_resources,
          reference: entry.reference,
          phase1_starter: entry.phase1_starter,
          phase2_main: entry.phase2_main,
          phase3_reflection: entry.phase3_reflection,
          remarks: entry.remarks,
          source_file_path: relPath,
          storage_path: storagePath,
          extraction_method: entry.extraction_method,
          review_status: autoApprove ? "APPROVED" : "PENDING_REVIEW",
        };

        rows.push(row);
        rowMeta.push({ termNumber: entry.term_number, autoApprove: !!autoApprove });
      }

      // A single source file can produce two entries with the same
      // conflict key (e.g. "Lesson 1 of 2" / "Lesson 2 of 2" for the same
      // subject+week) — Postgres rejects a batch upsert that would touch
      // the same conflict target twice, so merge same-key rows within
      // this file (concatenating their text fields) before upserting,
      // rather than losing one arbitrarily or failing the whole batch.
      const mergedByKey = new Map();
      const mergedMeta = new Map();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const key = `${row.term_number} ${row.subject_raw} ${row.week_number}`;
        const existing = mergedByKey.get(key);
        if (!existing) {
          mergedByKey.set(key, row);
          mergedMeta.set(key, rowMeta[i]);
          continue;
        }
        for (const field of [
          "strand", "sub_strand", "indicator", "content_standard", "performance_indicator",
          "core_competencies", "keywords", "teaching_learning_resources", "reference",
          "phase1_starter", "phase2_main", "phase3_reflection", "remarks",
        ]) {
          if (row[field] && row[field] !== existing[field]) {
            existing[field] = existing[field] ? `${existing[field]}\n\n${row[field]}` : row[field];
          }
        }
        existing.academic_level_id = existing.academic_level_id ?? row.academic_level_id;
        existing.subject_id = existing.subject_id ?? row.subject_id;
        if (row.review_status === "APPROVED") existing.review_status = "APPROVED";
        const meta = mergedMeta.get(key);
        if (rowMeta[i].autoApprove) meta.autoApprove = true;
      }
      const dedupedRows = [...mergedByKey.values()];
      const dedupedMeta = [...mergedMeta.values()];
      // Merging can push a length-limited column over its column limit
      // (strand/sub_strand VARCHAR(200), indicator VARCHAR(100)) — the
      // per-field .slice() at row-build time only bounded the individual
      // pre-merge value, not the concatenated result.
      for (const row of dedupedRows) {
        if (row.strand) row.strand = row.strand.slice(0, 200);
        if (row.sub_strand) row.sub_strand = row.sub_strand.slice(0, 200);
        if (row.indicator) row.indicator = row.indicator.slice(0, 100);
      }

      // One upsert per source file (rather than per entry) — cuts DB
      // round-trips roughly 3-8x, since a single primary-school weekly
      // doc can yield that many subject entries.
      if (dedupedRows.length > 0) {
        const { error } = await supabase
          .from("lesson_plan_library")
          .upsert(dedupedRows, { onConflict: "organization_id,source_file_path,term_number,subject_raw,week_number" });

        if (error) {
          stats.filesSkippedDbError++;
          stats.skippedFiles.push({ reason: `db error: ${error.message}`, file: relPath });
        } else {
          for (const meta of dedupedMeta) {
            stats.entriesCreated++;
            stats.perTerm[meta.termNumber] = (stats.perTerm[meta.termNumber] ?? 0) + 1;
            if (meta.autoApprove) stats.entriesAutoApproved++;
            else stats.entriesPendingReview++;
          }
        }
      }
    }
    console.log(`Done: Term ${group.termNumber} / ${group.classFolderName} (${files.length} files)`);
  }

  console.log("\n===== Import summary =====");
  console.log(`Files seen:                 ${stats.filesSeen}`);
  console.log(`Files skipped (unparsed):   ${stats.filesSkippedLegacyOrCorrupt}`);
  console.log(`Files skipped (folder):     ${stats.filesSkippedUnclassifiable}`);
  console.log(`Files skipped (db error):   ${stats.filesSkippedDbError}`);
  console.log(`Entries created:            ${stats.entriesCreated}`);
  console.log(`  auto-approved:            ${stats.entriesAutoApproved}`);
  console.log(`  pending review:           ${stats.entriesPendingReview}`);
  console.log(`Per term: T1=${stats.perTerm[1] ?? 0} T2=${stats.perTerm[2] ?? 0} T3=${stats.perTerm[3] ?? 0}`);

  const reportPath = path.join(process.cwd(), "scripts", "import-lesson-plan-library.report.json");
  await fsp.writeFile(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\nFull report (including skipped files) written to ${reportPath}`);
}

function cryptoRandomId() {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
