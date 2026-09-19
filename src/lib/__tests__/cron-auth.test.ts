import { GET } from "../../app/api/cron/ingest-gmail/route";
import { NextRequest } from "next/server";

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

async function runTests() {
  console.log("\n==================================================");
  console.log("AutoOps Cron Authentication & Behavior Verification");
  console.log("==================================================\n");

  const testSecret = "test-external-cron-secret-abcdef123456";
  process.env.CRON_SECRET = testSecret;

  // 1. Missing Authorization header -> 401 Unauthorized
  const noAuthReq = new NextRequest("http://localhost:3000/api/cron/ingest-gmail", {
    method: "GET",
  });
  const noAuthRes = await GET(noAuthReq);
  assert(noAuthRes.status === 401, `No Authorization header returns 401 Unauthorized (got ${noAuthRes.status})`);
  const noAuthBody = await noAuthRes.json();
  assert(noAuthBody.error === "Unauthorized cron request.", "Returns unauthorized error message");

  // 2. Incorrect Authorization header -> 401 Unauthorized
  const badAuthReq = new NextRequest("http://localhost:3000/api/cron/ingest-gmail", {
    method: "GET",
    headers: {
      authorization: "Bearer wrong-secret",
    },
  });
  const badAuthRes = await GET(badAuthReq);
  assert(badAuthRes.status === 401, `Incorrect CRON_SECRET returns 401 Unauthorized (got ${badAuthRes.status})`);

  // 3. Non-Bearer format -> 401 Unauthorized
  const nonBearerReq = new NextRequest("http://localhost:3000/api/cron/ingest-gmail", {
    method: "GET",
    headers: {
      authorization: testSecret,
    },
  });
  const nonBearerRes = await GET(nonBearerReq);
  assert(nonBearerRes.status === 401, `Non-Bearer header returns 401 Unauthorized (got ${nonBearerRes.status})`);

  // 4. Correct Authorization header -> Passes auth check (proceeds past auth step)
  const validReq = new NextRequest("http://localhost:3000/api/cron/ingest-gmail", {
    method: "GET",
    headers: {
      authorization: `Bearer ${testSecret}`,
    },
  });
  const validRes = await GET(validReq);
  // Status should be 200 (if db query succeeds with 0 accounts or accounts) or 503/500 if unmocked db, NOT 401
  assert(validRes.status !== 401, `Valid CRON_SECRET is accepted (status: ${validRes.status})`);

  console.log(`\n==================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
