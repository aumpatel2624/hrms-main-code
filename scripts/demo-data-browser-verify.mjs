/**
 * Manual-browser acceptance check for apps/server/seed/demo-data.js.
 *
 * Start the server against the seeded database first, then run:
 *   LD_LIBRARY_PATH=/tmp/shift-browser-libs/extracted/usr/lib/x86_64-linux-gnu \
 *     node scripts/demo-data-browser-verify.mjs
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const baseUrl = process.env.DEMO_VERIFY_URL ?? "http://127.0.0.1:7015";
const outputDir = process.env.DEMO_VERIFY_SCREENSHOTS
  ?? path.join(import.meta.dirname, "../artifacts/demo-data-seed-verify");
const password = "Demo@1234";

const accounts = [
  { email: "hemant.patel@apideltech.com", role: "HR Manager", widgets: 5 },
  { email: "mamta.patel@apideltech.com", role: "HR User", widgets: 4 },
  { email: "hardik.p@apideltech.com", role: "Employee", widgets: 2 },
  { email: "mahesh.gohil@apideltech.com", role: "Leave Approver", widgets: 1 },
];

fs.mkdirSync(outputDir, { recursive: true });

const signIn = async (page, email) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 30000 });
};

const waitForWidgets = async (page, expected) => {
  await page.waitForFunction(
    (minimum) => document.querySelectorAll("h3").length >= minimum,
    expected,
    { timeout: 30000 },
  );
  await page.waitForTimeout(800);
};

const browser = await chromium.launch({ headless: true });
try {
  for (const account of accounts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await signIn(page, account.email);
    await waitForWidgets(page, account.widgets);
    const filename = `${account.role.toLowerCase().replaceAll(" ", "-")}-dashboard.png`;
    await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
    if (await page.getByText("This widget no longer matches its data source").count()) {
      throw new Error(`${account.role} dashboard contains a stale widget`);
    }
    if (await page.getByText("Could not load this widget").count()) {
      throw new Error(`${account.role} dashboard contains an unloaded widget`);
    }
    const rendered = await page.locator("h3").count();
    if (rendered < account.widgets) {
      throw new Error(`${account.role} dashboard rendered ${rendered} widgets, expected ${account.widgets}`);
    }
    console.log(`✅ ${account.role}: dashboard rendered (${rendered} widget(s)) → ${filename}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await signIn(page, "hemant.patel@apideltech.com");
  await page.goto(`${baseUrl}/leave-application`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Leave Applications" }).waitFor({ timeout: 30000 });
  await page.getByText("open", { exact: true }).first().waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(outputDir, "hr-manager-leave-approvals.png"), fullPage: true });
  console.log("✅ HR Manager: Leave Applications includes a pending open item → hr-manager-leave-approvals.png");
  await context.close();
} finally {
  await browser.close();
}
