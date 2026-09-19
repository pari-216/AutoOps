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

async function checkIndexes() {
  console.log("Checking indexes...");
  // We can query pg_indexes via rpc or schema query or check what indexes exist
  const { data, error } = await supabase.rpc("pg_indexes");
  console.log("RPC error:", error);

  // Or let's inspect the duplicate inbound_events:
  const { data: dups } = await supabase
    .from("inbound_events")
    .select("id, user_id, source, external_event_id, gmail_message_id, created_at")
    .eq("external_event_id", "1a0a0b8035894eb3");
  console.log("Dups for 1a0a0b8035894eb3:", dups);

  // And let's check actions linked to these dups!
  const dupIds = (dups || []).map(d => d.id);
  const { data: linkedActions } = await supabase
    .from("agent_actions")
    .select("id, user_id, event_id, status, execution_status, created_at")
    .in("event_id", dupIds);
  console.log("Linked actions to dups:", linkedActions);
}

checkIndexes();
