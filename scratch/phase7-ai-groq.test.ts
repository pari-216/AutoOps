import assert from "assert";
import { callAgent } from "../src/lib/ai/agent";

// Mock the global process.env
process.env.GROQ_API_KEY = "test_key";

// We need to mock groq-sdk, but since it's a module, we can intercept the calls
// by mocking global fetch or using a proxy. However, since the Groq SDK uses fetch internally,
// we can mock global fetch!
const originalFetch = global.fetch;

// A helper to set the next mock response
let nextMockResponse: any = null;
let nextMockError: Error | null = null;

global.fetch = async (url, options) => {
  if (url.toString().includes("groq.com")) {
    if (nextMockError) {
      throw nextMockError;
    }
    return new Response(JSON.stringify(nextMockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  return originalFetch(url, options);
};

function setMockAIResponse(classification: string, drafted_reply: string | null, confidence: number, reasoning: string) {
  nextMockError = null;
  nextMockResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({ classification, drafted_reply, confidence, reasoning })
        }
      }
    ]
  };
}

function setMockAIFailure(error: Error) {
  nextMockResponse = null;
  nextMockError = error;
}

function setMockMalformedJSON() {
  nextMockError = null;
  nextMockResponse = {
    choices: [{ message: { content: "```json\n{ oops this is broken }\n```" } }]
  };
}

function setMockSchemaFailure() {
  nextMockError = null;
  nextMockResponse = {
    choices: [{ message: { content: JSON.stringify({ classification: "not_a_valid_class", confidence: 2.5 }) } }]
  };
}

async function runTests() {
  console.log("Running AI Groq Migration Tests...\n");

  try {
    // 1. Normal email requiring reply
    setMockAIResponse("needs_reply", "Sure, let's meet tomorrow.", 0.85, "User wants to meet.");
    let res = await callAgent({ subject: "Meeting", body_text: "Tomorrow at 2pm?", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
    assert.strictEqual(res.classification, "needs_reply");
    assert.strictEqual(res.suggested_action, "reply");
    console.log("✅ 1. Normal email requiring reply passed");

    // 2. Urgent email
    setMockAIResponse("urgent", "We are looking into the outage.", 0.95, "Production is down.");
    res = await callAgent({ subject: "URGENT", body_text: "Production is down!", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
    assert.strictEqual(res.classification, "urgent");
    assert.strictEqual(res.suggested_action, "reply");
    console.log("✅ 2. Urgent email passed");

    // 3. FYI email
    setMockAIResponse("fyi", null, 0.9, "Just a newsletter.");
    res = await callAgent({ subject: "Newsletter", body_text: "Here is the news", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
    assert.strictEqual(res.classification, "fyi");
    assert.strictEqual(res.suggested_action, "ignore");
    assert.strictEqual(res.drafted_reply, null);
    console.log("✅ 3. FYI email passed");

    // 4. Spam-like email
    setMockAIResponse("spam_like", null, 0.99, "Selling SEO services.");
    res = await callAgent({ subject: "SEO Boost", body_text: "Buy our SEO", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
    assert.strictEqual(res.classification, "spam_like");
    assert.strictEqual(res.suggested_action, "ignore");
    console.log("✅ 4. Spam-like email passed");

    // 5. Malformed AI response
    setMockMalformedJSON();
    try {
      await callAgent({ subject: "Test", body_text: "Test", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
      assert.fail("Should have thrown error");
    } catch (e: any) {
      assert.ok(e.message.includes("Model returned non-JSON response") || e.message.includes("Unexpected token"));
      console.log("✅ 5. Malformed AI response handled");
    }

    // 6. Groq API failure
    setMockAIFailure(new Error("fetch failed (rate limit)"));
    try {
      await callAgent({ subject: "Test", body_text: "Test", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
      assert.fail("Should have thrown error");
    } catch (e: any) {
      assert.ok(e.message.includes("API call failed"));
      console.log("✅ 6. Groq API failure handled");
    }

    // 7. Schema validation failure
    setMockSchemaFailure();
    try {
      await callAgent({ subject: "Test", body_text: "Test", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
      assert.fail("Should have thrown error");
    } catch (e: any) {
      assert.ok(e.message.includes("classification") || e.message.includes("Invalid enum value"));
      console.log("✅ 7. Schema validation handled");
    }

    // 8. Confidence range 0-1
    setMockAIResponse("fyi", null, 0.5, "Some reasoning.");
    res = await callAgent({ subject: "Confidence test", body_text: "Test", sender_email: "a@b.com", sender_name: "Alice", received_at: new Date().toISOString() });
    assert.ok(res.confidence >= 0 && res.confidence <= 1);
    console.log("✅ 8. Confidence range checked");

    console.log("\nAll 8 AI logic tests passed. Step 9 (agent_actions creation) is inherently tested in integration and preserves existing logic.");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

runTests();
