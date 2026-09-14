import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestGmailForUser } from "@/lib/google/ingest";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── 1. Secure Cron Authentication ──────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && cronSecret.trim()) {
    const expectedHeader = `Bearer ${cronSecret.trim()}`;
    if (!authHeader || authHeader !== expectedHeader) {
      console.warn("[Cron Ingest] Unauthorized execution attempt blocked.");
      return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
    }
  }

  // ── 2. Retrieve active Google connected accounts ───────────────────────────
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("[Cron Ingest] Admin client error:", err);
    return NextResponse.json(
      { error: "Database client initialization failed." },
      { status: 503 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accounts, error: queryError } = await (supabase
    .from("connected_accounts") as any)
    .select("id, user_id, email, status, last_synced_at")
    .eq("provider", "google")
    .eq("status", "active");

  if (queryError) {
    console.error("[Cron Ingest] Error fetching connected accounts:", queryError);
    return NextResponse.json(
      { error: "Database error querying accounts." },
      { status: 500 }
    );
  }

  const activeAccounts = (accounts as { id: string; user_id: string; email: string | null }[]) || [];

  if (activeAccounts.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No active Google accounts connected for ingestion.",
      accountsProcessed: 0,
    });
  }

  // ── 3. Iterate accounts with per-user error isolation ──────────────────────
  const summaries: {
    userId: string;
    email: string | null;
    found: number;
    inserted: number;
    skipped: number;
    errors: number;
    retriedProcessed: number;
    success: boolean;
    error?: string;
  }[] = [];

  for (const account of activeAccounts) {
    try {
      const stats = await ingestGmailForUser(account.user_id);
      summaries.push({
        userId: account.user_id,
        email: account.email,
        found: stats.found,
        inserted: stats.inserted,
        skipped: stats.skipped,
        errors: stats.errors,
        retriedProcessed: stats.retriedProcessed || 0,
        success: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sync failed";
      console.error(`[Cron Ingest] Sync failed for user ${account.user_id} (${account.email}):`, errorMessage);

      summaries.push({
        userId: account.user_id,
        email: account.email,
        found: 0,
        inserted: 0,
        skipped: 0,
        errors: 1,
        retriedProcessed: 0,
        success: false,
        error: errorMessage,
      });
    }
  }

  const totalInserted = summaries.reduce((acc, s) => acc + s.inserted, 0);
  const totalRetriedProcessed = summaries.reduce((acc, s) => acc + s.retriedProcessed, 0);
  console.info(
    `[Cron Ingest] Ingestion complete across ${activeAccounts.length} user accounts. ` +
      `${totalInserted} new email(s) ingested, ${totalRetriedProcessed} unprocessed email(s) processed by AI.`
  );

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    accountsProcessed: activeAccounts.length,
    totalInserted,
    totalRetriedProcessed,
    details: summaries,
  });
}
