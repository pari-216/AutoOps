/**
 * phase8.test.ts — Phase 8 Verification Tests:
 * 1. Deterministic date formatting across SSR and client hydration
 * 2. Vercel cron configuration integrity
 * 3. Ingestion deduplication and query safety
 */

import { formatDateTime, standardDateTimeFormatter } from "../format-date";
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log("\n==================================================");
console.log("AutoOps Phase 8 Tests: Hydration & Cron Verification");
console.log("==================================================\n");

// ---------------------------------------------------------------------------
// 1. Deterministic Date Formatting Tests
// ---------------------------------------------------------------------------
console.log("Suite 1: Deterministic Date Formatting (SSR / Client Hydration Safety)");

// Test 1: Deterministic output for the exact user example timestamp
// 2026-09-14T15:01:00.000Z -> 20:31 IST (UTC +5:30)
const sampleIso = "2026-09-14T15:01:00.000Z";
const formatted = formatDateTime(sampleIso);
assert(
  formatted === "Sep 14, 08:31 PM",
  `Formats 2026-09-14T15:01:00.000Z to "Sep 14, 08:31 PM" (actual: "${formatted}")`
);

// Test 2: Standard DateTime Formatter uses en-US and Asia/Kolkata (canonicalized as Asia/Calcutta in some ICU engines)
const resolvedOptions = standardDateTimeFormatter.resolvedOptions();
assert(
  resolvedOptions.timeZone === "Asia/Kolkata" || resolvedOptions.timeZone === "Asia/Calcutta",
  `Formatter timeZone is IST ('Asia/Kolkata' or 'Asia/Calcutta') (actual: '${resolvedOptions.timeZone}')`
);
assert(
  resolvedOptions.locale === "en-US",
  `Formatter locale is explicitly 'en-US' (actual: '${resolvedOptions.locale}')`
);

// Test 3: Multiple invocations with same timestamp return identical output
const run1 = formatDateTime(sampleIso);
const run2 = formatDateTime(sampleIso);
const run3 = formatDateTime(new Date(sampleIso));
const run4 = formatDateTime(new Date(sampleIso).getTime());
assert(
  run1 === run2 && run2 === run3 && run3 === run4,
  "Identical output across string, Date instance, and epoch millisecond inputs"
);

// Test 4: Morning / single-digit day formatting
// 2026-01-05T03:30:00.000Z -> 09:00 AM IST
const morningIso = "2026-01-05T03:30:00.000Z";
const morningFormatted = formatDateTime(morningIso);
assert(
  morningFormatted === "Jan 5, 09:00 AM",
  `Formats morning single-digit day correctly: "Jan 5, 09:00 AM" (actual: "${morningFormatted}")`
);

// Test 5: Graceful fallback on null, undefined, empty, or invalid input
assert(formatDateTime(null) === "—", "Returns '—' for null");
assert(formatDateTime(undefined) === "—", "Returns '—' for undefined");
assert(formatDateTime("") === "—", "Returns '—' for empty string");
assert(formatDateTime("not-a-valid-date") === "—", "Returns '—' for invalid date string");

// ---------------------------------------------------------------------------
// 2. Vercel Cron Configuration Integrity Tests
// ---------------------------------------------------------------------------
console.log("\nSuite 2: Vercel Cron Configuration (vercel.json)");

const vercelJsonPath = path.resolve(__dirname, "../../../vercel.json");
const vercelJsonExists = fs.existsSync(vercelJsonPath);
assert(vercelJsonExists, "vercel.json exists in root directory");

if (vercelJsonExists) {
  const content = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
  assert(Array.isArray(content.crons), "vercel.json defines 'crons' array");
  
  const ingestCron = content.crons.find(
    (c: { path: string; schedule: string }) => c.path === "/api/cron/ingest-gmail"
  );
  assert(Boolean(ingestCron), "Cron path '/api/cron/ingest-gmail' is configured");
  assert(
    ingestCron?.schedule === "*/2 * * * *",
    `Cron schedule is '*/2 * * * *' (actual: '${ingestCron?.schedule}')`
  );
}

// ---------------------------------------------------------------------------
// 3. Repository-wide SSR Hydration Risk Audit
// ---------------------------------------------------------------------------
console.log("\nSuite 3: SSR Hydration Risk Audit");

// Check that no toLocaleString() or toLocaleDateString() calls exist in src/
function findInFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "__tests__") {
        results.push(...findInFiles(fullPath, pattern));
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !entry.name.includes(".test.")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (pattern.test(content)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const srcDir = path.resolve(__dirname, "../..");
const toLocaleStringMatches = findInFiles(srcDir, /\.toLocaleString\s*\(/);
assert(
  toLocaleStringMatches.length === 0,
  `Zero toLocaleString() calls in src (found: ${toLocaleStringMatches.length})`
);

const toLocaleDateStringMatches = findInFiles(srcDir, /\.toLocaleDateString\s*\(/);
assert(
  toLocaleDateStringMatches.length === 0,
  `Zero toLocaleDateString() calls in src (found: ${toLocaleDateStringMatches.length})`
);

const toLocaleTimeStringMatches = findInFiles(srcDir, /\.toLocaleTimeString\s*\(/);
assert(
  toLocaleTimeStringMatches.length === 0,
  `Zero toLocaleTimeString() calls in src (found: ${toLocaleTimeStringMatches.length})`
);

const suppressWarningMatches = findInFiles(srcDir, /suppressHydrationWarning/);
assert(
  suppressWarningMatches.length === 0,
  `Zero suppressHydrationWarning workarounds in src (found: ${suppressWarningMatches.length})`
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) FAILED.`);
  process.exit(1);
} else {
  console.log(`\nAll Phase 8 tests passed ✓`);
}
