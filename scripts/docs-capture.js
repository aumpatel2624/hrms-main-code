/**
 * Screenshot capture (ADR-011).
 *
 * Boots the server and the admin dev server against the fixture database, signs
 * in, walks every screen in `docs-src/manifest.js` and photographs each one in
 * both themes.
 *
 *   npm run docs              generate + capture what changed
 *   npm run docs -- --force   recapture everything
 *   npm run docs -- --skip-capture   regenerate the markdown only
 *
 * Two rules this file exists to enforce:
 *
 * 1. **A screen that cannot be captured fails the run.** Shipping documentation
 *    with a missing or half-rendered image is worse than not shipping it, so
 *    there is no "continue on error" path.
 * 2. **Only what changed is recaptured.** See docs-fingerprint.js.
 */
import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

import { chromium } from "playwright";

import { FIXTURE_ADMIN, FIXTURE_DB_NAME } from "../apps/server/seed/fixtures.js";
import { ALL_SCREENS } from "../docs-src/manifest.js";
import { generate } from "./docs-generate.js";
import { planCapture, shotName, shotsFor, SHOTS_DIR, THEMES, writeStored } from "./docs-fingerprint.js";

const REPO_ROOT = path.join(import.meta.dirname, "..");
// Windows resolves the npm executable as `npm.cmd`, a batch file — spawning it
// directly (even by that name) throws ENOENT or EINVAL without a shell to
// interpret it. `shell: true` on win32 only; the shell is what does the PATH
// lookup and hands the batch file to cmd.exe.
const NPM = "npm";
const ON_WINDOWS = process.platform === "win32";
const FIXTURE_URI = process.env.DOCS_DATABASE
    ?? `mongodb://127.0.0.1:27017/${FIXTURE_DB_NAME}`;
const SERVER_PORT = Number(process.env.DOCS_SERVER_PORT ?? 5055);
const ADMIN_PORT = Number(process.env.DOCS_ADMIN_PORT ?? 5175);
const ADMIN_URL = `http://127.0.0.1:${ADMIN_PORT}`;

/** Wide enough that tables show their columns rather than collapsing. */
const VIEWPORT = { width: 1440, height: 1000 };

const children = [];

const run = (command, args, options = {}) =>
    new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: REPO_ROOT, stdio: "inherit", shell: ON_WINDOWS, ...options });
        child.on("exit", (code) =>
            code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    });

/** Starts a long-running process and remembers it so shutdown can kill it. */
const start = (name, command, args, env) => {
    const child = spawn(command, args, {
        cwd: REPO_ROOT,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
        shell: ON_WINDOWS,
        // Its own process group, so shutdown can signal the whole tree. These
        // are `npm` wrappers that spawn the real node/vite process; signalling
        // only the wrapper leaves the server running and holding its port,
        // which then makes every later run hang waiting for a port it can
        // never bind. On Windows this is instead handled by `taskkill /T` in
        // shutdown() below — negative-pid group signalling is POSIX only.
        detached: !ON_WINDOWS,
    });
    children.push({ name, child });
    // Kept quiet unless something fails — a Vite banner per run is noise, but
    // the output is the only clue when a boot fails, so it is buffered.
    let log = "";
    child.stdout.on("data", (chunk) => { log += chunk; });
    child.stderr.on("data", (chunk) => { log += chunk; });
    child.on("exit", (code) => {
        if (code !== 0 && code !== null) {
            console.error(`\n❌ ${name} exited with ${code}:\n${log}`);
        }
    });
    return child;
};

const shutdown = () => {
    for (const { child } of children) {
        if (child.killed || child.pid === undefined) continue;
        if (ON_WINDOWS) {
            // No process groups to signal on Windows, and the spawned process
            // is cmd.exe running npm, several layers above the real
            // node/vite process — killing just it leaves the port held.
            // `/T` kills the whole tree; `spawnSync` because this runs from
            // exit handlers, where async work is not guaranteed to finish.
            spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
            continue;
        }
        try {
            // Negative pid signals the group — the wrapper and the server it
            // spawned. ESRCH just means it is already gone.
            process.kill(-child.pid, "SIGTERM");
        } catch (error) {
            if (error.code !== "ESRCH") child.kill("SIGTERM");
        }
    }
};

/** Polls a URL until it answers or the timeout expires. */
const waitForServer = async (url, label, timeoutMs = 60000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.status < 500) return;
        } catch {
            // not up yet
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`${label} did not start within ${timeoutMs / 1000}s at ${url}`);
};

/**
 * Signs in as the fixture administrator.
 *
 * An administrator on purpose: the screenshots should show every screen with
 * every action available, because a page documenting a delete button ought to
 * show one. What each *role* sees is explained in the prose instead.
 */
const signIn = async (page) => {
    // The login screen is the SPA's root route, not /login — an unauthenticated
    // /login is an unmatched route that redirects here anyway.
    await page.goto(`${ADMIN_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await page.fill('input[name="email"]', FIXTURE_ADMIN.email);
    await page.fill('input[name="password"]', FIXTURE_ADMIN.password);

    // The consent checkboxes this step used to tick were removed from the
    // login UI (Login.jsx now sends locationConsent/ipConsent: true itself,
    // unconditionally) — nothing left to click here.
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
};

/**
 * Applies a theme.
 *
 * The app toggles a `dark-mode` class on the document element from React state.
 * Setting the class directly is equivalent for rendering and avoids depending
 * on the position of a toggle button that may move.
 */
const setTheme = async (page, theme) => {
    await page.evaluate((wantDark) => {
        document.documentElement.classList.toggle("dark-mode", wantDark);
    }, theme === "dark");
    // One frame for the transition to settle before the shutter.
    await page.waitForTimeout(250);
};

/**
 * Freezes CSS and SVG animation for the life of the page.
 *
 * Recharts animates a pie's wedges and a bar's height on mount, so a shot taken
 * during that lands a half-drawn chart — the first capture run caught a pie
 * mid-sweep. Waiting longer works until a slower machine makes it not; zeroing
 * the durations removes the race instead of widening the window.
 */
const freezeAnimations = (page) =>
    page.addStyleTag({
        content: `*, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
        }
        /* A fullPage screenshot resizes the viewport to the document's full
         * height before shooting. A sticky-positioned element (the form's
         * action bar footer) can be left painted at its old viewport-relative
         * offset through that resize — an opaque bar over whatever content
         * reflowed into that spot, one frame behind the corrected layout.
         * Found by actually looking at a capture: it silently erased the
         * "Merge fields" heading on the Email Template form, which happens to
         * sit right where the sticky bar used to rest. Nothing here scrolls
         * in a fullPage shot, so static positioning costs nothing.
         */
        .sticky {
            position: static !important;
        }`,
    });

/**
 * Waits for a screen to have finished painting its data.
 *
 * `networkidle` is not usable here: the admin runs on the Vite dev server,
 * whose HMR websocket keeps a connection open forever, so the page never goes
 * idle. Instead this waits for the page heading to exist (the SPA has rendered)
 * and for any loading indicator to go away (the data has arrived) — a list
 * screen paints its shell before its rows land, and a screenshot taken in
 * between is a picture of an empty table.
 */
const waitForContent = async (page) => {
    await page.waitForSelector("h1", { timeout: 30000 });
    await page
        .waitForFunction(
            () => !document.querySelector('[role="progressbar"], .animate-spin'),
            null,
            { timeout: 15000 },
        )
        .catch(() => {
            // A screen with no spinner at all never satisfies the wait; that is
            // fine, the settle below covers it.
        });

    // Recharts animates in JavaScript, so the CSS freeze above does not stop it.
    // Poll the chart markup until it stops changing: that is the animation
    // having finished, whatever the machine's speed. Screens with no chart fall
    // straight through on the first comparison.
    await page
        .waitForFunction(
            () => {
                const charts = document.querySelectorAll(".recharts-wrapper");
                const shape = [...charts].map((chart) => chart.innerHTML.length).join(",");
                const settled = window.__docsChartShape === shape;
                window.__docsChartShape = shape;
                return settled;
            },
            null,
            { timeout: 15000, polling: 300 },
        )
        .catch(() => {
            // A chart that never settles is worth a shot anyway — better a
            // slightly early frame than no page at all.
        });

    // Fonts and any remaining layout settle.
    await page.waitForTimeout(500);
};

/**
 * Navigates to one view of a screen and returns the path it should have landed
 * on.
 *
 * `add` is a plain URL. `view` and `edit` are not: they need the id of a real
 * record, which is knowable only from the rendered list. Rather than querying
 * the fixture database for one — which would couple this script to the seed's
 * internals — it clicks the row action the user would click, which is also the
 * gesture the documentation tells them to make.
 */
const gotoView = async (page, screen, view) => {
    const listPath = screen.path ?? pathFor(screen);
    if (view === "list") {
        await page.goto(`${ADMIN_URL}${listPath}`, { waitUntil: "domcontentloaded" });
        return listPath;
    }

    if (view === "add") {
        await page.goto(`${ADMIN_URL}${listPath}/add`, { waitUntil: "domcontentloaded" });
        return `${listPath}/add`;
    }

    await page.goto(`${ADMIN_URL}${listPath}`, { waitUntil: "domcontentloaded" });
    await waitForContent(page);

    const label = view === "view" ? "View" : "Edit";
    const action = page.locator(`[aria-label="${label}"]`).first();
    try {
        // A screen whose list came back empty has no row to act on, which is a
        // fixture problem rather than a flake: say so plainly instead of timing
        // out on a selector that will never appear.
        await action.waitFor({ state: "visible", timeout: 15000 });
    } catch {
        throw new Error(
            `${screen.key}/${view}: no ${label} action on ${listPath} — does the fixture seed ` +
                "create any rows for this screen?",
        );
    }
    await action.click();
    try {
        await page.waitForURL(new RegExp(`${listPath}/[^/]+${view === "edit" ? "/edit" : "$"}`), {
            timeout: 15000,
        });
    } catch {
        throw new Error(
            `${screen.key}/${view}: clicking ${label} did not open the record — ended up at ` +
                `${new URL(page.url()).pathname}`,
        );
    }
    return new URL(page.url()).pathname;
};

/** Photographs one view of one screen in one theme. */
const capture = async (page, screen, view, theme) => {
    const target = await gotoView(page, screen, view);
    await setTheme(page, theme);
    await freezeAnimations(page);
    await waitForContent(page);

    const file = path.join(REPO_ROOT, SHOTS_DIR, `${shotName(screen.key, view, theme)}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // fullPage: true — a viewport-only shot silently clips whatever falls
    // below ~1000px, which a longer form (extra sections, a rich-text
    // toolbar, a renderExtra panel) can do without warning. Found by actually
    // looking at a capture: the Email Template form's Merge fields panel was
    // being cut off entirely.
    await page.screenshot({ path: file, fullPage: true });

    // A screenshot of an error page is still a valid PNG, so check the app did
    // not bounce us somewhere unexpected. Redirect to /dashboard is the SPA's
    // catch-all for an unknown route.
    const landed = new URL(page.url()).pathname;
    if (landed !== target && !target.startsWith(landed)) {
        throw new Error(`${screen.key}/${view}: expected ${target}, ended up at ${landed}`);
    }
};

/** The route a config-driven screen lists at, read from its config. */
const pathFor = (screen) => {
    if (screen.path) return screen.path;
    const source = fs.readFileSync(path.join(REPO_ROOT, screen.source), "utf8");
    const start = source.indexOf(`export const ${screen.config} = {`);
    const slice = source.slice(start, source.indexOf("\n};", start));
    const match = slice.match(/\bpath:\s*"([^"]+)"/);
    if (!match) throw new Error(`No path found in ${screen.config}`);
    return match[1];
};

const main = async () => {
    const force = process.argv.includes("--force");
    const skipCapture = process.argv.includes("--skip-capture");

    console.log("→ Generating documentation pages");
    const written = generate(REPO_ROOT);
    console.log(`✅ ${written.length} pages generated`);

    if (skipCapture) {
        console.log("ℹ️  --skip-capture: stopping before screenshots");
        return;
    }

    const { capture: todo, reuse, fingerprints } = planCapture(REPO_ROOT, ALL_SCREENS, { force });
    console.log(`→ ${todo.length} screen(s) to capture, ${reuse.length} reused`);
    for (const { screen, reason } of todo) console.log(`   • ${screen.key} (${reason})`);

    if (!todo.length) {
        console.log("✅ Every screenshot is current");
        return;
    }

    console.log(`→ Seeding fixtures into ${FIXTURE_DB_NAME}`);
    await run("node", ["apps/server/seed/fixtures.js"], {
        env: { ...process.env, DOCS_DATABASE: FIXTURE_URI },
    });
    // The sidebar comes from the seeded menu tree, so the ordinary seeder has
    // to run against the fixture database too — without it every screen is
    // reachable by URL but the navigation is empty.
    console.log("→ Seeding the menu tree");
    await run(NPM, ["run", "seed", "-w", "@demo-panel/server"], {
        env: {
            ...process.env,
            DATABASE: FIXTURE_URI,
            SEED_ADMIN_EMAIL: FIXTURE_ADMIN.email,
            SEED_ADMIN_PASSWORD: FIXTURE_ADMIN.password,
        },
    });

    console.log("→ Starting server and admin");
    start("server", NPM, ["start", "-w", "@demo-panel/server"], {
        DATABASE: FIXTURE_URI,
        PORT: String(SERVER_PORT),
        NODE_ENV: "development",
    });
    // --host 127.0.0.1: Vite's default `localhost` binds wherever the OS
    // resolves that name first, which on some Windows setups is the IPv6
    // loopback ([::1]) only — leaving ADMIN_URL below (IPv4, matching
    // SERVER_PORT's Express binding) unreachable even though Vite is up.
    start("admin", NPM, ["run", "dev", "-w", "@demo-panel/admin", "--", "--port", String(ADMIN_PORT), "--strictPort", "--host", "127.0.0.1"], {
        VITE_API_URL_DEV: `http://127.0.0.1:${SERVER_PORT}`,
        // vite.config.js reads this to skip its dev-server `open: true` — see
        // the comment there. Playwright drives this instance; nobody should
        // watch it in a visible tab.
        DOCS_CAPTURE: "true",
    });

    // There is no health endpoint, so readiness is "an API route answers at
    // all". /countries responds 401 when unauthenticated, which is a perfectly
    // good signal that Express is up and routing.
    await waitForServer(`http://127.0.0.1:${SERVER_PORT}/api/v1/countries`, "server");
    await waitForServer(ADMIN_URL, "admin");

    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    const page = await context.newPage();
    let shot = 0;

    try {
        await signIn(page);
        for (const { screen } of todo) {
            for (const view of shotsFor(screen)) {
                for (const theme of THEMES) {
                    await capture(page, screen, view, theme);
                    shot += 1;
                }
            }
            console.log(`   ✓ ${screen.key} (${shotsFor(screen).join(", ")})`);
        }
    } finally {
        await browser.close();
    }

    writeStored(REPO_ROOT, fingerprints);
    console.log(`✅ Captured ${shot} image(s) across ${todo.length} screen(s)`);
};

process.on("exit", shutdown);
process.on("SIGINT", () => { shutdown(); process.exit(130); });
process.on("SIGTERM", () => { shutdown(); process.exit(143); });

main()
    .then(() => { shutdown(); process.exit(0); })
    .catch((error) => {
        console.error(`\n❌ ${error.message}`);
        shutdown();
        process.exit(1);
    });
