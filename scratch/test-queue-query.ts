import { createAdminClient } from "../src/lib/supabase/admin";

async function testQuery() {
  const supabase = createAdminClient();
  const userId = "488f9804-4482-47b8-8c57-10518061ccf6";

  const { data, error } = await supabase
    .from("agent_actions")
    .select("*, inbound_events(sender_email, sender_name, subject, body_text, received_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  console.log("Error:", error);
  console.log("Data count:", data?.length);
  if (data && data.length > 0) {
    console.log("Sample action:", JSON.stringify(data[0], null, 2));
  }
}

testQuery();
