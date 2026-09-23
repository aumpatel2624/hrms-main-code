// Live-browser sweep for the "raw id / blank value" bug class: logs in as
// admin, opens every CRUD list screen and the detail page of its first row,
// and fails if any cell or detail value shows a raw ObjectId, "[object Object]",
// "undefined", "NaN", "Invalid Date" or "null". Columns empty on every row are
// reported as warnings only — that is often genuinely empty data.
//
// Needs the dev servers running (npm run dev). Screens with no rows are
// skipped, so seed demo data for full coverage.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.ADMIN_BASE || "http://localhost:3001";
const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
// Every entity config's route, read from the configs themselves.
const PATHS = [...new Set(
  ["apps/admin/src/entities/index.js", "apps/admin/src/entities/advanced.jsx"]
    .flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/\bpath: "(\/[a-z0-9-]+)"/g)].map((m) => m[1])),
)];
const BAD = [
  [/\b[0-9a-f]{24}\b/, "raw-id"],
  [/\[object Object\]/, "object-object"],
  [/\bundefined\b/, "undefined"],
  [/\bNaN\b/, "NaN"],
  [/Invalid Date/, "invalid-date"],
  [/\bnull\b/, "null"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.fill('input[type="email"], input[name="email"]', EMAIL);
await page.fill('input[type="password"], input[name="password"]', PASSWORD);
await Promise.all([page.waitForResponse((r) => r.url().includes("/auth/login")), page.click('button[type="submit"]')]);
await page.waitForURL((u) => u.pathname !== "/", { timeout: 15000 });

const report = [];
let lastList = null;
page.on("response", async (r) => {
  if (r.request().resourceType() !== "xhr" && r.request().resourceType() !== "fetch") return;
  try {
    const j = await r.json();
    const d = j?.data;
    const rows = Array.isArray(d?.[0]?.data) ? d[0].data : Array.isArray(d) ? d :Array.isArray(d?.data) ? d.data : Array.isArray(d?.docs) ? d.docs : Array.isArray(d?.rows) ? d.rows : null;
    if (rows && rows.length && rows[0]?._id && r.request().method() === "POST" && !lastList) lastList = { url: r.url(), rows };
  } catch {}
});

const scan = (texts, where) => {
  const hits = [];
  for (const { label, text } of texts) {
    for (const [re, kind] of BAD) if (re.test(text)) hits.push({ where, kind, label, text: text.slice(0, 120) });
  }
  return hits;
};

for (const p of PATHS) {
  lastList = null;
  const entry = { path: p, hits: [], emptyCols: [], rows: 0 };
  try {
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    if (new URL(page.url()).pathname !== p) { entry.note = `redirected to ${page.url()}`; report.push(entry); continue; }
    const table = await page.evaluate(() => {
      const t = document.querySelector("main table") || document.querySelector("table");
      if (!t) return null;
      const heads = [...t.querySelectorAll("thead th")].map((th) => th.innerText.trim());
      const rows = [...t.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.innerText.trim()));
      return { heads, rows };
    });
    if (!table) { entry.note = "no table"; report.push(entry); continue; }
    const dataRows = table.rows.filter((r) => r.length > 1);
    entry.rows = dataRows.length;
    const texts = [];
    dataRows.forEach((r) => r.forEach((c, i) => texts.push({ label: table.heads[i] ?? `col${i}`, text: c })));
    entry.hits.push(...scan(texts, "list"));
    if (dataRows.length) {
      table.heads.forEach((h, i) => {
        if (!h || /action/i.test(h)) return;
        if (dataRows.every((r) => !r[i] || r[i] === "—" || r[i] === "-")) entry.emptyCols.push(h);
      });
    }
    // detail view of the first row
    const id = lastList?.rows?.[0]?._id;
    if (id) {
      await page.goto(`${BASE}${p}/${id}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1000);
      const tabs = await page.locator('[role="tab"]').count();
      const detailTexts = [];
      const emptyDetails = [];
      for (let t = 0; t < Math.max(1, tabs); t++) {
        if (tabs) { await page.locator('[role="tab"]').nth(t).click(); await page.waitForTimeout(250); }
        const pairs = await page.evaluate(() =>
          [...document.querySelectorAll("div.flex.flex-col.gap-1")].map((d) => ({
            label: d.children[0]?.innerText?.trim(),
            text: d.children[1]?.innerText?.trim() ?? "",
          })).filter((x) => x.label));
        detailTexts.push(...pairs);
      }
      entry.hits.push(...scan(detailTexts, "view"));
      entry.viewEmpty = detailTexts.filter((x) => x.text === "—" || x.text === "").map((x) => x.label);
      entry.viewId = id;
    }
  } catch (e) {
    entry.note = `error: ${e.message.split("\n")[0]}`;
  }
  report.push(entry);
}

await browser.close();

const failures = report.flatMap((e) => e.hits.map((h) => `${e.path} [${h.where}] ${h.label}: ${h.kind} "${h.text}"`));
const warnings = report.filter((e) => e.emptyCols.length).map((e) => `${e.path}: empty on every row — ${e.emptyCols.join(", ")}`);
warnings.forEach((w) => console.log("WARN", w));
failures.forEach((f) => console.log("FAIL", f));
console.log(`\n${report.length} screens, ${report.filter((e) => e.rows).length} with data, ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
