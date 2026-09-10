/**
 * Screenshot fingerprints (ADR-011).
 *
 * Decides which screens need recapturing. A screen is photographed again only
 * when something that could change how it looks has changed — its own config or
 * page file, the shared components it renders through, the theme, the fixture
 * data, or its own manifest entry.
 *
 * The hashing is deliberately conservative in one direction only: it will
 * happily recapture a screen that did not need it, and must never skip one that
 * did. A needless recapture costs a few seconds; a skipped one puts a picture of
 * last month's UI in front of the client's staff.
 *
 * Pure functions, so `npm test` can check the decision logic without a browser
 * or a database anywhere near it.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

import {
    CONFIG_SCREENS,
    FIXTURE_SOURCES,
    SHARED_CRUD_SOURCES,
    THEME_SOURCES,
} from "../docs-src/manifest.js";

/** Where the capture script writes images and the hash record. */
export const SHOTS_DIR = "apps/admin/src/docs/screenshots";
export const MANIFEST_FILE = path.join(SHOTS_DIR, "fingerprints.json");

/** Themes every screen is captured in. */
export const THEMES = ["light", "dark"];

/**
 * The views captured for one screen.
 *
 * `list` is the screen itself and every screen has one. The other three
 * illustrate the operation sections the generator writes — a reader following
 * "press Add Department" should be able to see the form those steps describe.
 *
 * A screen declares which it wants via `shots` in the manifest; `listOnly`
 * screens keep just the list, because they hand off to their own editor and
 * have no shared add/edit form to photograph.
 */
export const SHOT_VIEWS = ["list", "add", "view", "edit"];

/**
 * The views one manifest entry should be captured in.
 *
 * Only a config-driven screen renders the shared add/view/edit routes, so only
 * it gets the extra three. A custom page is whatever its own file draws — there
 * is no `/dashboard/add` to photograph — and a `listOnly` screen hands off to
 * its own editor rather than the shared form.
 */
export const shotsFor = (screen) => {
    if (screen.shots) return screen.shots;
    const configDriven = CONFIG_SCREENS.includes(screen) && !screen.listOnly;
    return configDriven ? SHOT_VIEWS : ["list"];
};

/**
 * The image basename for one screen/view/theme.
 *
 * `list` keeps the original `<key>-<theme>` name so the 44 images already
 * committed stay valid and are not all rewritten under new names.
 */
export const shotName = (key, view, theme) =>
    view === "list" ? `${key}-${theme}` : `${key}-${view}-${theme}`;

const sha = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

/**
 * Hash of one file's contents, or a marker for a missing file.
 *
 * A missing file hashes to a stable "absent" value rather than throwing: a
 * manifest entry pointing at a deleted page should force a recapture (which
 * then fails loudly with a useful message), not crash the hashing pass before
 * any screen has been considered.
 */
export const hashFile = (repoRoot, relativePath) => {
    const full = path.join(repoRoot, relativePath);
    if (!fs.existsSync(full)) return `absent:${relativePath}`;
    return sha(fs.readFileSync(full, "utf8"));
};

/**
 * Every file whose contents feed a given screen's appearance.
 *
 * Config-driven screens all render through the same CRUD components, so those
 * are inputs to every one of them. Custom pages render themselves, so they take
 * only their own file. Both take the theme and the fixture data, because both
 * change every pixel on every screen.
 */
export const sourcesFor = (screen) => {
    const isConfigDriven = CONFIG_SCREENS.includes(screen);
    return [
        screen.source,
        ...(isConfigDriven ? SHARED_CRUD_SOURCES : []),
        ...THEME_SOURCES,
        ...FIXTURE_SOURCES,
    ];
};

/**
 * The fingerprint for one screen: its file inputs plus its own manifest entry.
 *
 * The manifest entry is included because the prose and the capture settings
 * live there — changing a screen's path or adding a `listOnly` flag changes
 * what should be photographed without touching any of the files above.
 */
export const fingerprintScreen = (repoRoot, screen) => {
    const parts = sourcesFor(screen).map((file) => `${file}:${hashFile(repoRoot, file)}`);
    parts.push(`entry:${sha(JSON.stringify(screen))}`);
    return sha(parts.join("|"));
};

/** Reads the stored hashes. A missing or unreadable file means capture everything. */
export const readStored = (repoRoot) => {
    const full = path.join(repoRoot, MANIFEST_FILE);
    if (!fs.existsSync(full)) return {};
    try {
        return JSON.parse(fs.readFileSync(full, "utf8"));
    } catch {
        // A corrupt record is not worth failing over — recapturing everything
        // costs a few minutes and repairs it.
        console.warn("⚠️  Fingerprint record unreadable, recapturing everything");
        return {};
    }
};

export const writeStored = (repoRoot, fingerprints) => {
    const full = path.join(repoRoot, MANIFEST_FILE);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, `${JSON.stringify(fingerprints, null, 2)}\n`);
};

/**
 * Do all of a screen's images exist on disk?
 *
 * Checked separately from the hash because the two go out of step in a way that
 * matters: someone deletes a PNG, or a previous run died between writing an
 * image and writing the record. A matching hash with a missing file must still
 * recapture, or the page renders a broken image forever.
 */
export const imagesPresent = (repoRoot, screen) =>
    shotsFor(screen).every((view) =>
        THEMES.every((theme) =>
            fs.existsSync(
                path.join(repoRoot, SHOTS_DIR, `${shotName(screen.key, view, theme)}.png`),
            ),
        ),
    );

/**
 * Splits screens into those needing capture and those that can be reused.
 *
 * `force` recaptures everything, for when the record is not trusted.
 */
export const planCapture = (repoRoot, screens, { force = false } = {}) => {
    const stored = readStored(repoRoot);
    const capture = [];
    const reuse = [];
    const fingerprints = {};

    for (const screen of screens) {
        const current = fingerprintScreen(repoRoot, screen);
        fingerprints[screen.key] = current;

        const unchanged = stored[screen.key] === current;
        const present = imagesPresent(repoRoot, screen);

        if (!force && unchanged && present) reuse.push(screen);
        else capture.push({ screen, reason: force ? "forced" : !present ? "missing image" : "changed" });
    }

    return { capture, reuse, fingerprints };
};
