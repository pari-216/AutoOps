import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!rawSupabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabaseUrl = rawSupabaseUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
  console.log("=== INSPECTING INBOUND_EVENTS ===");
  const { data: events, error: evErr } = await supabase
    .from("inbound_events")
    .select("id, user_id, source, external_event_id, gmail_message_id, subject, sender_email, created_at")
    .order("created_at", { ascending: false });

  if (evErr) console.error("Error fetching inbound_events:", evErr);
  else {
    console.log(`Total inbound_events: ${events.length}`);
    const msgIdMap = new Map();
    const extIdMap = new Map();
    const subjectSenderMap = new Map();

    for (const ev of events) {
      if (ev.gmail_message_id) {
        msgIdMap.set(ev.gmail_message_id, (msgIdMap.get(ev.gmail_message_id) || []).concat(ev));
      }
      if (ev.external_event_id) {
        extIdMap.set(ev.external_event_id, (extIdMap.get(ev.external_event_id) || []).concat(ev));
      }
      const key = `${ev.sender_email}:::${ev.subject}`;
      subjectSenderMap.set(key, (subjectSenderMap.get(key) || []).concat(ev));
    }

    console.log("\nDuplicate gmail_message_id in inbound_events:");
    let dupMsgFound = false;
    for (const [msgId, evs] of msgIdMap.entries()) {
      if (evs.length > 1) {
        console.log(`  gmail_message_id: ${msgId} -> count: ${evs.length}`);
        for (const e of evs) {
          console.log(`    event id=${e.id}, external_id=${e.external_event_id}, subject=${e.subject}, date=${e.created_at}`);
        }
        dupMsgFound = true;
      }
    }
    if (!dupMsgFound) console.log("  None found.");

    console.log("\nDuplicate external_event_id in inbound_events:");
    let dupExtFound = false;
    for (const [extId, evs] of extIdMap.entries()) {
      if (evs.length > 1) {
        console.log(`  external_event_id: ${extId} -> count: ${evs.length}`);
        dupExtFound = true;
      }
    }
    if (!dupExtFound) console.log("  None found.");

    console.log("\nEmails with same sender + subject in inbound_events:");
    for (const [key, evs] of subjectSenderMap.entries()) {
      if (evs.length > 1) {
        console.log(`  Key "${key}" -> count: ${evs.length}`);
        for (const e of evs) {
          console.log(`    id=${e.id}, external_id=${e.external_event_id}, gmail_msg_id=${e.gmail_message_id}, created_at=${e.created_at}`);
        }
      }
    }
  }

  console.log("\n=== INSPECTING AGENT_ACTIONS ===");
  const { data: actions, error: actErr } = await supabase
    .from("agent_actions")
    .select("id, user_id, event_id, status, execution_status, classification, created_at, updated_at, drafted_reply")
    .order("created_at", { ascending: false });

  if (actErr) console.error("Error fetching agent_actions:", actErr);
  else {
    console.log(`Total agent_actions: ${actions.length}`);
    const eventIdMap = new Map();
    for (const act of actions) {
      if (act.event_id) {
        eventIdMap.set(act.event_id, (eventIdMap.get(act.event_id) || []).concat(act));
      }
    }

    console.log("\nDuplicate event_id in agent_actions:");
    let dupEventFound = false;
    for (const [eventId, acts] of eventIdMap.entries()) {
      if (acts.length > 1) {
        console.log(`  event_id: ${eventId} -> count: ${acts.length}:`);
        for (const a of acts) {
          console.log(`    action id=${a.id}, status=${a.status}, exec_status=${a.execution_status}, created_at=${a.created_at}`);
        }
        dupEventFound = true;
      }
    }
    if (!dupEventFound) console.log("  None found.");
  }
}

inspect();
