import https from "https";

const BASE = "https://catchball-eta.vercel.app";
let passed = 0;
let failed = 0;

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: opts.method || "GET",
      headers: opts.headers || {},
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log("🧪 E2E Tests for catchball-eta.vercel.app\n");

// Page tests
const pages = [
  "/", "/login", "/register", "/dashboard", "/projects",
  "/balls", "/pipelines", "/team", "/settings", "/contractor",
];

console.log("📄 Page accessibility:");
for (const page of pages) {
  await test(`GET ${page} → 200`, async () => {
    const res = await fetch(`${BASE}${page}`);
    assert(res.status === 200, `Got ${res.status}`);
  });
}

// API endpoints
console.log("\n🔌 API endpoints:");
await test("POST /api/seed without body → 400", async () => {
  const res = await fetch(`${BASE}/api/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(res.status === 400, `Got ${res.status}`);
});

await test("POST /api/invite without body → 400", async () => {
  const res = await fetch(`${BASE}/api/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(res.status === 400, `Got ${res.status}`);
});

await test("POST /api/line/webhook → 200", async () => {
  const res = await fetch(`${BASE}/api/line/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: [] }),
  });
  assert(res.status === 200, `Got ${res.status}`);
});

// Firebase Auth test
console.log("\n🔐 Firebase Auth:");
const FIREBASE_API_KEY = "AIzaSyBk6sBX1fzEV5YC9_hToT2UAdndcZqVOaA";

await test("Sign up test user", async () => {
  const testEmail = `e2e-test-${Date.now()}@test.com`;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "TestPass123!", returnSecureToken: true }),
    }
  );
  const data = JSON.parse(res.body);
  assert(data.idToken, `No idToken received. Error: ${data.error?.message || "unknown"}`);
  console.log(`    (Created: ${testEmail})`);

  // Delete the test user
  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: data.idToken }),
    }
  );
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
process.exit(failed > 0 ? 1 : 0);
