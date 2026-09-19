#!/usr/bin/env node

/**
 * scripts/dev-cron.mjs
 *
 * Local Development Cron Runner for AutoOps.
 *
 * Periodically invokes the existing, protected `/api/cron/ingest-gmail` endpoint
 * using the configured CRON_SECRET from `.env.local`.
 *
 * Usage:
 *   node scripts/dev-cron.mjs           # Runs every 2 minutes (default)
 *   node scripts/dev-cron.mjs --once    # Runs once and exits
 *   node scripts/dev-cron.mjs --interval 60  # Runs every 60 seconds
 *
 * NOTE: This is strictly for local development testing (`npm run dev:cron`).
 * In production, an external HTTP cron scheduler (e.g. cron-job.org) invokes
 * `/api/cron/ingest-gmail` with the production CRON_SECRET every 2 minutes.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// 1. Load environment variables from .env.local if not already set
function loadEnv() {
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
        // Remove enclosing quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const CRON_SECRET = process.env.CRON_SECRET || "";
const PORT = process.env.PORT || "3000";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT}`;
const ENDPOINT = `${BASE_URL.replace(/\/$/, "")}/api/cron/ingest-gmail`;

// Parse CLI flags
const args = process.argv.slice(2);
const onceMode = args.includes("--once");
const intervalFlagIdx = args.indexOf("--interval");
let intervalSec = 120; // 2 minutes default, matching vercel.json

if (intervalFlagIdx !== -1 && args[intervalFlagIdx + 1]) {
  const parsed = parseInt(args[intervalFlagIdx + 1], 10);
  if (!isNaN(parsed) && parsed > 0) {
    intervalSec = parsed;
  }
}

async function triggerCron() {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  process.stdout.write(`[${timestamp} IST] Pinging /api/cron/ingest-gmail... `);

  try {
    const headers = {};
    if (CRON_SECRET) {
      headers["Authorization"] = `Bearer ${CRON_SECRET}`;
    }

    const res = await fetch(ENDPOINT, {
      method: "GET",
      headers,
    });

    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = { raw: await res.text() };
    }

    if (res.ok) {
      const inserted = data.totalInserted ?? 0;
      const accounts = data.accountsProcessed ?? 0;
      const retried = data.totalRetriedProcessed ?? 0;
      console.log(`✓ 200 OK | Accounts: ${accounts} | Ingested: ${inserted} | AI Processed: ${retried}`);
      if (data.details && Array.isArray(data.details)) {
        for (const detail of data.details) {
          if (detail.found > 0 || detail.inserted > 0 || !detail.success) {
            console.log(
              `   └─ ${detail.email || detail.userId}: found=${detail.found}, inserted=${detail.inserted}, errors=${detail.errors}${
                detail.error ? ` (${detail.error})` : ""
              }`
            );
          }
        }
      }
    } else {
      console.log(`✗ HTTP ${status} | Error: ${data.error || JSON.stringify(data)}`);
    }
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      console.log(`⚠ Next.js server not running on port ${PORT} (ECONNREFUSED). Will retry next interval.`);
    } else {
      console.log(`✗ Request failed: ${err.message}`);
    }
  }
}

console.log("==================================================");
console.log("AutoOps Local Development Cron Helper");
console.log(`Target: ${ENDPOINT}`);
console.log(`Auth:   ${CRON_SECRET ? "Bearer <CRON_SECRET>" : "⚠ No CRON_SECRET configured in .env.local"}`);
console.log(`Mode:   ${onceMode ? "One-shot execution" : `Every ${intervalSec}s (matching production 2-minute cycle)`}`);
console.log("==================================================\n");

// Execute immediately
await triggerCron();

if (!onceMode) {
  setInterval(triggerCron, intervalSec * 1000);
}
