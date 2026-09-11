// Live-browser check for the 5 new Performance screens (ADR-032, module 16
// foundation half) — per the lesson from the /add-pages bug hunt (issues
// #18-#22), a backend-only verify script cannot catch frontend-only bugs
// (TDZ crashes, missing imports, a SelectField broken on plain-string
// options, broken array-field columns). Logs in as admin, loads each
// screen's list page and /add page, and asserts zero console pageerrors and
// that #root actually rendered content.
import { chromium } from "playwright";

// Must share a hostname with the API's cookie domain (VITE_API_URL_DEV is
// http://localhost:7002) — 127.0.0.1 and localhost are different origins for
// cookie purposes, so browsing via 127.0.0.1 silently drops the session cookie.
const ADMIN_BASE = process.env.ADMIN_BASE || "http://localhost:3000";
const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

const SCREENS = [
  { path: "/kra", label: "KRA" },
  { path: "/employee-feedback-criteria", label: "Employee Feedback Criteria" },
  { path: "/appraisal-template", label: "Appraisal Template" },
  { path: "/appraisal-cycle", label: "Appraisal Cycle" },
  { path: "/appraisal", label: "Appraisal" },
];

const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console.error] ${msg.text()}`);
});

let failed = false;

try {
  console.log(`Logging in at ${ADMIN_BASE}...`);
  await page.goto(`${ADMIN_BASE}/`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  const [loginResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/login")),
    page.click('button[type="submit"]'),
  ]);
  if (loginResponse.status() !== 200) {
    throw new Error(`Login failed with status ${loginResponse.status()}`);
  }
  // Wait for the post-login redirect (to /dashboard) rather than just "not
  // /login" — the public login route is actually "/", so that check
  // resolved instantly without the real login round-trip completing.
  await page.waitForURL((url) => url.pathname !== "/", { timeout: 15000 });
  console.log("Logged in.");

  for (const screen of SCREENS) {
    errors.length = 0;
    console.log(`\nChecking ${screen.label} list page (${screen.path})...`);
    await page.goto(`${ADMIN_BASE}${screen.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    let rootHtml = await page.locator("#root").innerHTML();
    if (!rootHtml || rootHtml.trim().length === 0) {
      console.error(`  FAIL: #root is empty on ${screen.path}`);
      failed = true;
    } else {
      console.log(`  OK: #root rendered (${rootHtml.length} chars)`);
    }
    if (errors.length > 0) {
      console.error(`  FAIL: console errors on ${screen.path}:`);
      for (const e of errors) console.error(`    ${e}`);
      failed = true;
    } else {
      console.log("  OK: zero console errors");
    }

    errors.length = 0;
    const addPath = `${screen.path}/add`;
    console.log(`Checking ${screen.label} /add page (${addPath})...`);
    await page.goto(`${ADMIN_BASE}${addPath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    rootHtml = await page.locator("#root").innerHTML();
    if (!rootHtml || rootHtml.trim().length === 0) {
      console.error(`  FAIL: #root is empty on ${addPath}`);
      failed = true;
    } else {
      console.log(`  OK: #root rendered (${rootHtml.length} chars)`);
    }
    if (errors.length > 0) {
      console.error(`  FAIL: console errors on ${addPath}:`);
      for (const e of errors) console.error(`    ${e}`);
      failed = true;
    } else {
      console.log("  OK: zero console errors");
    }
  }
} finally {
  await browser.close();
}

if (failed) {
  console.error("\n❌ Live-browser check FAILED — see above.");
  process.exit(1);
}
console.log("\n🎉 Live-browser check passed for all 5 Performance screens (list + /add, zero console errors).");
