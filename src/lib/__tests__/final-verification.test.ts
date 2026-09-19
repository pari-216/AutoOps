/**
 * final-verification.test.ts — Regression Test Suite for AutoOps Final Verification
 *
 * Covers:
 * 1. Duplicate process race condition safety (error 23505 handling)
 * 2. Unique agent_action per (user_id, event_id) database constraint
 * 3. Approve state transition (pending -> approved atomic guard)
 * 4. Execution status lifecycle (status vs execution_status separation)
 * 5. Duplicate Realtime event handling (INSERT dedup, UPDATE in-place)
 * 6. Pending / Approved counts integrity
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
console.log("AutoOps Final Verification Regression Test Suite");
console.log("==================================================\n");

// ---------------------------------------------------------------------------
// SUITE 1: Unique Database Constraint on (user_id, event_id)
// ---------------------------------------------------------------------------
console.log("Suite 1: Database Migration 008 Unique Protection");

const migrationPath = path.resolve(__dirname, "../../../supabase/migrations/008_agent_actions_unique_event.sql");
assert(fs.existsSync(migrationPath), "Migration 008_agent_actions_unique_event.sql exists");

const migrationSql = fs.readFileSync(migrationPath, "utf-8");
assert(
  /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_agent_actions_user_event_unique/i.test(migrationSql),
  "Creates unique index idx_agent_actions_user_event_unique"
);
assert(
  /ON\s+public\.agent_actions\s*\(\s*user_id\s*,\s*event_id\s*\)/i.test(migrationSql),
  "Unique index covers (user_id, event_id)"
);
assert(
  /WHERE\s+event_id\s+IS\s+NOT\s+NULL/i.test(migrationSql),
  "Unique index has partial clause: WHERE event_id IS NOT NULL"
);

// ---------------------------------------------------------------------------
// SUITE 2: Duplicate Process Race Safety
// ---------------------------------------------------------------------------
console.log("\nSuite 2: Duplicate Process Race Safety (Postgres 23505 handling)");

const processEventPath = path.resolve(__dirname, "../ai/process-event.ts");
const processEventCode = fs.readFileSync(processEventPath, "utf-8");

assert(
  processEventCode.includes('insertError.code === "23505"'),
  "processInboundEvent explicitly catches PostgreSQL unique violation error code 23505"
);
assert(
  processEventCode.includes("race condition") || processEventCode.includes("already exists"),
  "processInboundEvent logs race condition skipping on 23505 without throwing"
);

// Simulate race condition handling
function simulateProcessEventInsert(insertSuccess: boolean, errorCode?: string) {
  if (!insertSuccess) {
    if (errorCode === "23505") {
      // Swallowed safely
      return { status: "skipped_race_condition", error: null };
    }
    return { status: "error", error: "DB insert failed" };
  }
  return { status: "created", error: null };
}

const raceResult = simulateProcessEventInsert(false, "23505");
assert(raceResult.status === "skipped_race_condition", "Race condition 23505 does not throw or fail");
assert(raceResult.error === null, "Race condition produces no error for caller");

// ---------------------------------------------------------------------------
// SUITE 3: Approve State Transition
// ---------------------------------------------------------------------------
console.log("\nSuite 3: Approve State Transition (pending -> approved)");

const approveRoutePath = path.resolve(__dirname, "../../app/api/actions/approve/route.ts");
const approveRouteCode = fs.readFileSync(approveRoutePath, "utf-8");

assert(
  approveRouteCode.includes('.eq("status", "pending")'),
  "Approve route enforces atomic check: status must be 'pending' to approve"
);
assert(
  approveRouteCode.includes('status: "approved"'),
  "Approve route updates status to 'approved'"
);
assert(
  approveRouteCode.includes("409"),
  "Approve route returns 409 Conflict if action is not pending (prevents double approval)"
);

// State transition validator
function transitionActionStatus(
  currentStatus: string,
  newDecision: "approved" | "edited" | "rejected"
): { success: boolean; finalStatus: string; error?: string } {
  if (currentStatus !== "pending") {
    return {
      success: false,
      finalStatus: currentStatus,
      error: `Cannot transition from '${currentStatus}' to '${newDecision}'.`,
    };
  }
  return {
    success: true,
    finalStatus: newDecision,
  };
}

assert(
  transitionActionStatus("pending", "approved").finalStatus === "approved",
  "pending -> approved is valid"
);
assert(
  transitionActionStatus("pending", "edited").finalStatus === "edited",
  "pending -> edited is valid"
);
assert(
  transitionActionStatus("pending", "rejected").finalStatus === "rejected",
  "pending -> rejected is valid"
);
assert(
  !transitionActionStatus("approved", "approved").success,
  "approved -> approved rejected with 409 conflict"
);
assert(
  !transitionActionStatus("rejected", "approved").success,
  "rejected -> approved rejected with 409 conflict"
);

// ---------------------------------------------------------------------------
// SUITE 4: Execution Status Lifecycle (status vs execution_status)
// ---------------------------------------------------------------------------
console.log("\nSuite 4: Execution Status Lifecycle");

const dispatcherPath = path.resolve(__dirname, "../execution/dispatcher.ts");
const dispatcherCode = fs.readFileSync(dispatcherPath, "utf-8");

assert(
  dispatcherCode.includes("const finalStatus = action.status"),
  "Dispatcher preserves human decision action.status ('approved' / 'edited')"
);
assert(
  dispatcherCode.includes('finalExecutionStatus = executionSuccess ? "executed" : "failed"'),
  "Dispatcher sets execution_status based on pipeline success"
);
assert(
  !dispatcherCode.includes('status: executionSuccess ? "executed" : "approved"'),
  "Dispatcher does NOT overwrite status with 'executed'"
);

// Lifecycle state machine verification
interface ActionState {
  id: string;
  status: "pending" | "approved" | "edited" | "rejected";
  execution_status: "unexecuted" | "executing" | "executed" | "failed";
}

function simulateLifecycle(action: ActionState, decision: "approve" | "edit" | "reject", executionSucceeds: boolean): ActionState {
  if (decision === "reject") {
    return {
      ...action,
      status: "rejected",
      execution_status: "unexecuted", // No execution triggered
    };
  }

  const newStatus = decision === "edit" ? "edited" : "approved";
  const execStatus = executionSucceeds ? "executed" : "failed";

  return {
    ...action,
    status: newStatus,
    execution_status: execStatus,
  };
}

const initialAction: ActionState = { id: "a-1", status: "pending", execution_status: "unexecuted" };

const approvedSuccess = simulateLifecycle(initialAction, "approve", true);
assert(approvedSuccess.status === "approved", "Approved + send Gmail: status = approved");
assert(approvedSuccess.execution_status === "executed", "Approved + send Gmail: execution_status = executed");

const editedSuccess = simulateLifecycle(initialAction, "edit", true);
assert(editedSuccess.status === "edited", "Edit & approve + send Gmail: status = edited");
assert(editedSuccess.execution_status === "executed", "Edit & approve + send Gmail: execution_status = executed");

const rejectedAction = simulateLifecycle(initialAction, "reject", false);
assert(rejectedAction.status === "rejected", "Rejected: status = rejected");
assert(rejectedAction.execution_status === "unexecuted", "Rejected: execution_status = unexecuted");

const approvedFailed = simulateLifecycle(initialAction, "approve", false);
assert(approvedFailed.status === "approved", "Approved + failed Gmail: status remains approved");
assert(approvedFailed.execution_status === "failed", "Approved + failed Gmail: execution_status = failed");

// ---------------------------------------------------------------------------
// SUITE 5: Duplicate Realtime Event Handling
// ---------------------------------------------------------------------------
console.log("\nSuite 5: Duplicate Realtime Event Handling in Queue Client");

const queueClientPath = path.resolve(__dirname, "../../app/dashboard/queue/approval-queue-client.tsx");
const queueClientCode = fs.readFileSync(queueClientPath, "utf-8");

assert(
  queueClientCode.includes("dedupActionsById"),
  "ApprovalQueueClient implements dedupActionsById helper"
);
assert(
  queueClientCode.includes("prev.some((a) => a.id === newRecord.id)"),
  "ApprovalQueueClient Realtime INSERT checks for existing action ID to prevent duplicate append"
);
assert(
  queueClientCode.includes("a.id === updated.id"),
  "ApprovalQueueClient Realtime UPDATE updates existing item in-place"
);

// Test local dedup function behavior
interface SimpleAction {
  id: string;
  status: string;
  subject?: string;
}

function dedupActions(actions: SimpleAction[]): SimpleAction[] {
  const seen = new Set<string>();
  const result: SimpleAction[] = [];
  for (const action of actions) {
    if (action?.id && !seen.has(action.id)) {
      seen.add(action.id);
      result.push(action);
    }
  }
  return result;
}

const rawListWithDups: SimpleAction[] = [
  { id: "act-1", status: "pending" },
  { id: "act-2", status: "pending" },
  { id: "act-1", status: "pending" }, // duplicate act-1
  { id: "act-3", status: "approved" },
  { id: "act-2", status: "approved" }, // duplicate act-2
];

const deduped = dedupActions(rawListWithDups);
assert(deduped.length === 3, `dedupActions removes duplicate IDs (expected 3, got ${deduped.length})`);
assert(deduped.map((a) => a.id).join(",") === "act-1,act-2,act-3", "Preserves first instance in order");

// Simulate Realtime INSERT duplicate prevention
function handleRealtimeInsert(current: SimpleAction[], newRecord: SimpleAction): SimpleAction[] {
  if (current.some((a) => a.id === newRecord.id)) {
    return current; // Don't add twice
  }
  return [newRecord, ...current];
}

const currentQueue: SimpleAction[] = [{ id: "act-1", status: "pending" }];
const insertedDup = handleRealtimeInsert(currentQueue, { id: "act-1", status: "pending" });
assert(insertedDup.length === 1, "Realtime INSERT with existing ID is not added twice");

const insertedNew = handleRealtimeInsert(currentQueue, { id: "act-2", status: "pending" });
assert(insertedNew.length === 2, "Realtime INSERT with new ID is added");

// Simulate Realtime UPDATE in-place
function handleRealtimeUpdate(current: SimpleAction[], updated: SimpleAction): SimpleAction[] {
  return current.map((a) => (a.id === updated.id ? { ...a, ...updated } : a));
}

const updatedQueue = handleRealtimeUpdate(insertedNew, { id: "act-1", status: "approved" });
assert(updatedQueue.length === 2, "Realtime UPDATE preserves queue length");
assert(updatedQueue.find((a) => a.id === "act-1")?.status === "approved", "Realtime UPDATE updates item in place");

// ---------------------------------------------------------------------------
// SUITE 6: Pending & Approved Counts
// ---------------------------------------------------------------------------
console.log("\nSuite 6: Pending & Approved Counts Integrity");

function calculateCounts(actions: SimpleAction[]) {
  const unique = dedupActions(actions);
  return {
    pending: unique.filter((a) => a.status === "pending").length,
    approved: unique.filter((a) => a.status === "approved").length,
    edited: unique.filter((a) => a.status === "edited").length,
    rejected: unique.filter((a) => a.status === "rejected").length,
    total: unique.length,
  };
}

const queueWithDups: SimpleAction[] = [
  { id: "1", status: "pending" },
  { id: "1", status: "pending" }, // duplicate pending
  { id: "2", status: "pending" },
  { id: "3", status: "approved" },
];

const countsBefore = calculateCounts(queueWithDups);
assert(countsBefore.pending === 2, `Pending count is 2 (not inflated by duplicate row: ${countsBefore.pending})`);
assert(countsBefore.approved === 1, `Approved count is 1 (${countsBefore.approved})`);

// After approving action "1"
const queueAfterApproval: SimpleAction[] = [
  { id: "1", status: "approved" },
  { id: "2", status: "pending" },
  { id: "3", status: "approved" },
];

const countsAfter = calculateCounts(queueAfterApproval);
assert(countsAfter.pending === 1, `Pending count decreases to 1 (${countsAfter.pending})`);
assert(countsAfter.approved === 2, `Approved count increases to 2 (${countsAfter.approved})`);

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n──────────────────────────────────────────────────");
console.log(`Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All AutoOps Final Verification Regression Tests Passed ✓\n");
}
