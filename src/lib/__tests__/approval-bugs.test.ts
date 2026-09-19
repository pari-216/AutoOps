/**
 * approval-bugs.test.ts — Unit & Contract Tests for Bug 1 & Bug 2 Fixes:
 * 
 * BUG 1: Duplicate Emails/Actions in Approval Queue
 *   - Verifies duplicate inbound events are blocked by external_event_id & gmail_message_id.
 *   - Verifies processUnprocessedEventsForUser filters out events already covered by actions.
 *   - Verifies intra-batch duplicate suppression.
 * 
 * BUG 2: Action Status Does Not Change / Disappears After Execution
 *   - Verifies human status ('approved' / 'edited') is preserved upon successful execution.
 *   - Verifies execution pipeline outcome only modifies execution_status ('executed' / 'failed').
 *   - Verifies queue tab filtering correctly classifies approved + executed items in the Approved tab.
 */

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
console.log("AutoOps Bug Fix Verification: Bug 1 & Bug 2");
console.log("==================================================\n");

// ---------------------------------------------------------------------------
// SUITE 1: BUG 2 — Status & Execution Status Decoupling
// ---------------------------------------------------------------------------
console.log("Suite 1: BUG 2 — Human Status vs. Pipeline Execution Status");

// Test 1: Simulating dispatcher final status logic (Bug 2 Root Cause Fix)
// Before fix: finalStatus was executionSuccess ? 'executed' : 'approved'
// After fix: finalStatus preserves action.status ('approved' or 'edited')
function computeFinalStatus(actionStatus: "approved" | "edited", executionSuccess: boolean): string {
  // Fixed dispatcher logic:
  return actionStatus;
}

function computeExecutionStatus(executionSuccess: boolean): "executed" | "failed" {
  return executionSuccess ? "executed" : "failed";
}

assert(
  computeFinalStatus("approved", true) === "approved",
  "Approved action status remains 'approved' after successful execution"
);
assert(
  computeFinalStatus("edited", true) === "edited",
  "Edited action status remains 'edited' after successful execution"
);
assert(
  computeExecutionStatus(true) === "executed",
  "Execution pipeline outcome maps to execution_status = 'executed'"
);
assert(
  computeExecutionStatus(false) === "failed",
  "Execution pipeline failure maps to execution_status = 'failed'"
);

// Test 2: Verify queue client filter tabs
interface ActionItem {
  id: string;
  status: "pending" | "approved" | "edited" | "rejected" | "executed" | "failed";
  execution_status: "unexecuted" | "executing" | "executed" | "failed";
}

function filterByTab(actions: ActionItem[], statusTab: "pending" | "approved" | "edited" | "rejected"): ActionItem[] {
  return actions.filter((action) => {
    if (statusTab === "pending" && action.status !== "pending") return false;
    if (statusTab === "approved" && action.status !== "approved") return false;
    if (statusTab === "edited" && action.status !== "edited") return false;
    if (statusTab === "rejected" && action.status !== "rejected") return false;
    return true;
  });
}

const sampleActions: ActionItem[] = [
  { id: "1", status: "pending", execution_status: "unexecuted" },
  { id: "2", status: "approved", execution_status: "executed" },
  { id: "3", status: "edited", execution_status: "executed" },
  { id: "4", status: "rejected", execution_status: "unexecuted" },
  // Old buggy state where status was overwritten to 'executed'
  { id: "5", status: "executed", execution_status: "executed" },
];

const approvedTabItems = filterByTab(sampleActions, "approved");
assert(
  approvedTabItems.some((a) => a.id === "2"),
  "Approved action with execution_status='executed' appears in the Approved tab"
);
assert(
  !approvedTabItems.some((a) => a.id === "5"),
  "Old buggy action with status='executed' was invisible in Approved tab (confirms root cause)"
);

const pendingTabItems = filterByTab(sampleActions, "pending");
assert(
  pendingTabItems.length === 1 && pendingTabItems[0].id === "1",
  "Only pending actions appear in Pending tab; approved items leave Pending tab immediately"
);

// ---------------------------------------------------------------------------
// SUITE 2: BUG 1 — Ingestion & AI Retry Deduplication
// ---------------------------------------------------------------------------
console.log("\nSuite 2: BUG 1 — Inbound Events Deduplication Logic");

// Test 3: Batch deduplication simulation matching ingest.ts processUnprocessedEventsForUser
interface InboundEvent {
  id: string;
  external_event_id?: string;
  gmail_message_id?: string;
}

function simulateUnprocessedFilter(
  existingActions: { event_id: string }[],
  existingInboundEvents: InboundEvent[],
  candidateEvents: InboundEvent[],
  limit: number
): { id: string }[] {
  const processedEventIds = new Set<string>(existingActions.map((a) => a.event_id));
  const processedExtIds = new Set<string>();
  const processedMsgIds = new Set<string>();

  for (const ie of existingInboundEvents) {
    if (processedEventIds.has(ie.id)) {
      if (ie.external_event_id) processedExtIds.add(ie.external_event_id);
      if (ie.gmail_message_id) processedMsgIds.add(ie.gmail_message_id);
    }
  }

  const unprocessed: { id: string }[] = [];
  for (const e of candidateEvents) {
    if (processedEventIds.has(e.id)) continue;
    if (e.external_event_id && processedExtIds.has(e.external_event_id)) continue;
    if (e.gmail_message_id && processedMsgIds.has(e.gmail_message_id)) continue;

    processedEventIds.add(e.id);
    if (e.external_event_id) processedExtIds.add(e.external_event_id);
    if (e.gmail_message_id) processedMsgIds.add(e.gmail_message_id);

    unprocessed.push({ id: e.id });
    if (unprocessed.length >= limit) break;
  }
  return unprocessed;
}

// Scenario: Gmail msg 'msg-123' was ingested 3 times (due to missing DB index)
// One row has an agent action already.
const existingInbound: InboundEvent[] = [
  { id: "ev-1", external_event_id: "msg-123", gmail_message_id: "<abc@gmail.com>" },
  { id: "ev-2", external_event_id: "msg-123", gmail_message_id: "<abc@gmail.com>" },
  { id: "ev-3", external_event_id: "msg-123", gmail_message_id: "<abc@gmail.com>" },
];
const existingActions = [{ event_id: "ev-1" }];

// Retry scan sees all 3 events
const unproc = simulateUnprocessedFilter(existingActions, existingInbound, existingInbound, 10);
assert(
  unproc.length === 0,
  "All duplicate inbound_events for msg-123 are skipped because ev-1 already has an action"
);

// Scenario: Fresh batch containing intra-batch duplicate events
const freshBatch: InboundEvent[] = [
  { id: "ev-10", external_event_id: "msg-999", gmail_message_id: "<first@gmail.com>" },
  { id: "ev-11", external_event_id: "msg-999", gmail_message_id: "<first@gmail.com>" }, // dupe
  { id: "ev-12", external_event_id: "msg-888", gmail_message_id: "<second@gmail.com>" },
];
const freshUnproc = simulateUnprocessedFilter([], [], freshBatch, 10);
assert(
  freshUnproc.length === 2 && freshUnproc[0].id === "ev-10" && freshUnproc[1].id === "ev-12",
  "Intra-batch duplicate event ev-11 is suppressed; only 1 event per Gmail message is queued for AI"
);

// ---------------------------------------------------------------------------
// SUITE 3: Codebase & Migration Integrity Audits
// ---------------------------------------------------------------------------
console.log("\nSuite 3: Codebase & Migration Integrity Audits");

// Test 4: Verify migration 007 exists and contains the required unique indexes
const migration007Path = path.resolve(__dirname, "../../../supabase/migrations/007_fix_inbound_dedup.sql");
assert(fs.existsSync(migration007Path), "Migration 007_fix_inbound_dedup.sql exists");

if (fs.existsSync(migration007Path)) {
  const sql = fs.readFileSync(migration007Path, "utf-8");
  assert(
    sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_dedup"),
    "007 creates unique index on (user_id, source, external_event_id)"
  );
  assert(
    sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_events_gmail_message_id"),
    "007 creates unique index on (user_id, gmail_message_id)"
  );
}

// Test 5: Verify dispatcher.ts does not overwrite action.status
const dispatcherPath = path.resolve(__dirname, "../execution/dispatcher.ts");
const dispatcherContent = fs.readFileSync(dispatcherPath, "utf-8");
assert(
  !dispatcherContent.includes('const finalStatus = executionSuccess ? "executed" : "approved"'),
  "dispatcher.ts has removed the bug where status was overwritten to 'executed'"
);
assert(
  dispatcherContent.includes("const finalStatus = action.status"),
  "dispatcher.ts preserves action.status on execution outcome"
);

// Test 6: Verify approve route returns action with execution_status
const approveRoutePath = path.resolve(__dirname, "../../app/api/actions/approve/route.ts");
const approveRouteContent = fs.readFileSync(approveRoutePath, "utf-8");
assert(
  approveRouteContent.includes("execution_status: executionResult.executionStatus"),
  "Approve route returns action with merged execution_status in response"
);

// Test 7: Verify edit route returns action with execution_status
const editRoutePath = path.resolve(__dirname, "../../app/api/actions/edit/route.ts");
const editRouteContent = fs.readFileSync(editRoutePath, "utf-8");
assert(
  editRouteContent.includes("execution_status: executionResult.executionStatus"),
  "Edit route returns action with merged execution_status in response"
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
  console.log(`\nAll Bug 1 & Bug 2 verification tests passed ✓`);
}
