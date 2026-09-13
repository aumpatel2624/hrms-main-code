import { chromium } from "playwright";

const adminBase = process.env.ADMIN_BASE || "http://localhost:5178";
const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
const screenshotPath = process.env.SCREENSHOT_PATH || "artifacts/sidebar-collapse-flyout.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${message.text()} (${message.location().url})`);
});

try {
    await page.goto(`${adminBase}/`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    const [loginResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().includes("/auth/login")),
        page.click('button[type="submit"]'),
    ]);
    if (loginResponse.status() !== 200) throw new Error(`Login returned ${loginResponse.status()}`);
    await page.waitForURL((url) => url.pathname !== "/", { timeout: 15000 });

    await page.getByRole("button", { name: "Collapse navigation" }).click();
    const groupTrigger = page.locator('aside button[aria-expanded]:visible').first();
    await groupTrigger.hover();
    const groupName = await groupTrigger.getAttribute("aria-label");
    if (!groupName) throw new Error("Collapsed group trigger has no accessible name");

    const flyout = page.locator("aside nav").nth(1).locator("li.relative > div.absolute").filter({ has: page.getByText(groupName, { exact: true }) });
    await flyout.waitFor({ state: "visible" });

    const triggerBox = await groupTrigger.boundingBox();
    const flyoutBox = await flyout.boundingBox();
    if (!triggerBox || !flyoutBox) throw new Error("Could not measure trigger or flyout");
    if (Math.abs(triggerBox.x + triggerBox.width - flyoutBox.x) > 1) {
        throw new Error(`Flyout does not abut trigger (trigger right=${triggerBox.x + triggerBox.width}, flyout left=${flyoutBox.x})`);
    }

    // Move through the former margin area before entering the panel. With the old
    // ml-2 gap, the list item's mouseleave closed the panel at this point.
    const transitionY = Math.max(triggerBox.y + 8, flyoutBox.y + 8);
    await page.mouse.move(triggerBox.x + triggerBox.width - 1, transitionY);
    await page.mouse.move(triggerBox.x + triggerBox.width + 1, transitionY);
    await flyout.waitFor({ state: "visible" });
    await page.mouse.move(flyoutBox.x + 12, transitionY);
    await flyout.waitFor({ state: "visible" });

    const nestedItem = flyout.locator("a").first();
    const href = await nestedItem.getAttribute("href");
    if (!href) throw new Error("Flyout has no navigable nested item");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await nestedItem.click();
    await page.waitForURL((url) => url.pathname === href, { timeout: 15000 });

    if (errors.length) console.warn(`Non-blocking browser console errors after navigation: ${errors.join(" | ")}`);
    console.log(`PASS: ${groupName} flyout stayed open across the edge transition and navigated to ${href}`);
    console.log(`Screenshot: ${screenshotPath}`);
} finally {
    await browser.close();
}
