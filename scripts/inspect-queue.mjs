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
const supabaseUrl = rawSupabaseUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabase = createClient(supabaseUrl, serviceKey);

async function inspectQueue() {
  const { data, error } = await supabase
    .from("agent_actions")
    .select("id, status, execution_status, created_at, event_id, inbound_events(id, external_event_id, gmail_message_id, subject, sender_email)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Total actions in DB: ${data.length}`);
  const statusCounts = {};
  const externalIdToActions = new Map();

  for (const act of data) {
    statusCounts[act.status] = (statusCounts[act.status] || 0) + 1;
    const ev = Array.isArray(act.inbound_events) ? act.inbound_events[0] : act.inbound_events;
    const extId = ev?.external_event_id || "none";
    if (!externalIdToActions.has(extId)) {
      externalIdToActions.set(extId, []);
    }
    externalIdToActions.get(extId).push({
      action_id: act.id,
      status: act.status,
      execution_status: act.execution_status,
      event_id: act.event_id,
      subject: ev?.subject,
      sender: ev?.sender_email,
      created_at: act.created_at,
    });
  }

  console.log("\nStatus breakdown:", statusCounts);

  console.log("\nDuplicate actions by external_event_id (Gmail Message ID):");
  for (const [extId, acts] of externalIdToActions.entries()) {
    if (acts.length > 1) {
      console.log(`\nExternal Event ID: ${extId} (${acts.length} actions) - Subject: "${acts[0].subject}"`);
      for (const a of acts) {
        console.log(`  action_id: ${a.action_id}, status: ${a.status}, execution_status: ${a.execution_status}, event_id: ${a.event_id}, created_at: ${a.created_at}`);
      }
    }
  }
}

inspectQueue();
