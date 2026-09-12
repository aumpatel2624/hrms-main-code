/**
 * Tests for the documentation generator and its incremental capture logic.
 *
 * Two things are worth testing here and they are both "fails silently"
 * problems:
 *
 * 1. **The capture plan.** Skipping a screen that changed puts a stale picture
 *    in front of the client's staff and nothing complains. Every case below
 *    that asserts a recapture is guarding against that.
 * 2. **The config extractor.** It reads entity configs as text, so a config
 *    written in a slightly different style silently yields fewer fields — which
 *    is exactly how the Active flag went missing from every page in the first
 *    draft. The last group asserts against the real configs, not fixtures, so
 *    the test breaks if the house style moves.
 *
 *   node scripts/docs-fingerprint.test.js
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    fingerprintScreen,
    imagesPresent,
    planCapture,
    shotName,
    shotsFor,
    sourcesFor,
    SHOTS_DIR,
    THEMES,
} from "./docs-fingerprint.js";
import { extractConfig, renderConfigPage, renderCustomPage } from "./docs-generate.js";
import { CONFIG_SCREENS, CUSTOM_SCREENS, ALL_SCREENS } from "../docs-src/manifest.js";

const REPO_ROOT = path.join(import.meta.dirname, "..");

/** A throwaway repo shape: one config file, one page file, theme and fixture. */
const makeFakeRepo = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-fingerprint-"));
    const write = (relative, contents) => {
        const full = path.join(root, relative);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, contents);
    };
    write("apps/admin/src/entities/index.js", "export const thingConfig = {\n    path: \"/thing\",\n};\n");
    write("apps/admin/src/components/crud/crud-list.jsx", "list v1");
    write("apps/admin/src/components/crud/crud-form.jsx", "form v1");
    write("apps/admin/src/components/crud/crud-view.jsx", "view v1");
    write("apps/admin/src/components/crud/index.jsx", "index v1");
    write("apps/admin/src/styles/globals.css", "theme v1");
    write("apps/admin/src/styles/theme.css", "theme v1");
    write("apps/admin/src/styles/typography.css", "type v1");
    write("apps/server/seed/fixtures.js", "fixtures v1");
    return { root, write };
};

/** Puts both themes' images on disk so `imagesPresent` is satisfied. */
/** Every image the screen expects — all its views, in both themes. */
const placeImages = (root, screen) => {
    for (const view of shotsFor(screen)) {
        for (const theme of THEMES) {
            const file = path.join(root, SHOTS_DIR, `${shotName(screen.key, view, theme)}.png`);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, "png");
        }
    }
};

const storeFingerprints = (root, fingerprints) => {
    const file = path.join(root, SHOTS_DIR, "fingerprints.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(fingerprints));
};

// A screen shaped like a real config-driven entry. Identity matters: sourcesFor
// checks membership in CONFIG_SCREENS, so this is pushed on for the duration.
const screen = {
    key: "thing",
    config: "thingConfig",
    source: "apps/admin/src/entities/index.js",
    intro: "A thing.",
};
CONFIG_SCREENS.push(screen);

// ---- what counts as an input -------------------------------------------

{
    const sources = sourcesFor(screen);
    assert.ok(sources.includes("apps/admin/src/entities/index.js"), "own config is an input");
    assert.ok(sources.includes("apps/admin/src/components/crud/crud-list.jsx"), "shared CRUD is an input");
    assert.ok(sources.includes("apps/admin/src/styles/globals.css"), "theme is an input");
    assert.ok(sources.includes("apps/server/seed/fixtures.js"), "fixture data is an input");
}

{
    // A custom page must NOT depend on the shared CRUD components; if it did,
    // every list-component tweak would pointlessly recapture the Audit Log.
    const custom = CUSTOM_SCREENS[0];
    assert.ok(
        !sourcesFor(custom).includes("apps/admin/src/components/crud/crud-list.jsx"),
        "custom pages do not depend on the CRUD components",
    );
}

// ---- the capture plan ---------------------------------------------------

{
    const { root } = makeFakeRepo();
    const first = planCapture(root, [screen]);
    assert.equal(first.capture.length, 1, "nothing stored yet, so capture");
    assert.equal(first.capture[0].reason, "missing image");

    // Store the hashes and the images: now it should be reused.
    storeFingerprints(root, first.fingerprints);
    placeImages(root, screen);
    const second = planCapture(root, [screen]);
    assert.equal(second.capture.length, 0, "unchanged and present, so reuse");
    assert.equal(second.reuse.length, 1);
}

{
    // Changing the shared table component must recapture a config screen.
    const { root, write } = makeFakeRepo();
    const before = planCapture(root, [screen]);
    storeFingerprints(root, before.fingerprints);
    placeImages(root, screen);

    write("apps/admin/src/components/crud/crud-list.jsx", "list v2");
    const after = planCapture(root, [screen]);
    assert.equal(after.capture.length, 1, "shared component change recaptures");
    assert.equal(after.capture[0].reason, "changed");
}

{
    // Changing the fixture data must recapture — the picture is of that data.
    const { root, write } = makeFakeRepo();
    const before = planCapture(root, [screen]);
    storeFingerprints(root, before.fingerprints);
    placeImages(root, screen);

    write("apps/server/seed/fixtures.js", "fixtures v2");
    assert.equal(planCapture(root, [screen]).capture.length, 1, "fixture change recaptures");
}

{
    // A deleted image must recapture even though every hash still matches.
    const { root } = makeFakeRepo();
    const before = planCapture(root, [screen]);
    storeFingerprints(root, before.fingerprints);
    placeImages(root, screen);
    fs.unlinkSync(path.join(root, SHOTS_DIR, `${screen.key}-${THEMES[0]}.png`));

    const after = planCapture(root, [screen]);
    assert.equal(after.capture.length, 1, "a missing image recaptures");
    assert.equal(after.capture[0].reason, "missing image");
}

{
    // --force ignores everything.
    const { root } = makeFakeRepo();
    const before = planCapture(root, [screen]);
    storeFingerprints(root, before.fingerprints);
    placeImages(root, screen);
    const forced = planCapture(root, [screen], { force: true });
    assert.equal(forced.capture.length, 1, "force recaptures regardless");
    assert.equal(forced.capture[0].reason, "forced");
}

{
    // Editing the prose in the manifest changes what the page says but not what
    // it looks like — still, the entry is part of the fingerprint, so it
    // recaptures. Asserting the direction deliberately: over-capture is fine.
    const { root } = makeFakeRepo();
    const a = fingerprintScreen(root, screen);
    const b = fingerprintScreen(root, { ...screen, intro: "Different words." });
    assert.notEqual(a, b, "the manifest entry is part of the fingerprint");
}

{
    // A corrupt record must not throw — it recaptures everything instead.
    const { root } = makeFakeRepo();
    const file = path.join(root, SHOTS_DIR, "fingerprints.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{ not json");
    placeImages(root, screen);
    assert.equal(planCapture(root, [screen]).capture.length, 1, "corrupt record recaptures");
}

CONFIG_SCREENS.pop();

// ---- the config extractor, against the real configs ---------------------

{
    const uniform = fs.readFileSync(path.join(REPO_ROOT, "apps/admin/src/entities/index.js"), "utf8");
    const advanced = fs.readFileSync(path.join(REPO_ROOT, "apps/admin/src/entities/advanced.jsx"), "utf8");

    // departmentConfig moved to entities/advanced.jsx (ADR-017 — it needs a
    // companyId lookup now); companyConfig is the fixture for this block's
    // assertions instead, same uniform-tier shape (required first field,
    // bare ACTIVE last).
    const company = extractConfig(uniform, "companyConfig");
    assert.equal(company.plural, "Companies");
    assert.ok(company.description, "the entity description is read");
    assert.deepEqual(
        company.fields.map((f) => f.name),
        ["companyName", "companyCode", "basicComponentId", "hraComponentId", "isActive"],
        "the bare ACTIVE entry is not dropped",
    );
    assert.equal(
        company.fields.at(-1).section,
        "status",
        "the Active flag lands in the Status section",
    );
    assert.ok(company.fields[0].required, "required is detected");

    // `{ ...ACTIVE, default: true }` — the spread form.
    const role = extractConfig(uniform, "roleConfig");
    assert.ok(
        role.fields.some((f) => f.name === "isActive"),
        "the spread ACTIVE entry is not dropped either",
    );

    // Hints are the sentences that make a generated page worth reading.
    const redirect = extractConfig(uniform, "seoRedirectConfig");
    const fromPath = redirect.fields.find((f) => f.name === "fromPath");
    assert.ok(fromPath.hint?.length, "field hints are read");

    // A config in the other file, with more sections.
    const user = extractConfig(advanced, "userConfig");
    assert.ok(user.fields.length >= 10, "a large config reads all its fields");
    assert.ok(user.sections.length >= 3, "sections are read");

    assert.throws(() => extractConfig(uniform, "noSuchConfig"), /not found/, "a renamed config fails loudly");
}

// ---- rendering ----------------------------------------------------------

{
    const advanced = fs.readFileSync(path.join(REPO_ROOT, "apps/admin/src/entities/advanced.jsx"), "utf8");
    const entry = CONFIG_SCREENS.find((s) => s.key === "department");
    const page = renderConfigPage(entry, extractConfig(advanced, "departmentConfig"));

    assert.match(page, /^# Departments/, "starts with the plural title");
    assert.ok(page.includes(entry.intro), "the manifest intro is used over the config description");
    for (const theme of THEMES) {
        assert.ok(
            page.includes(`../screenshots/department-${theme}.png`),
            `references its ${theme} screenshot`,
        );
    }
    assert.ok(page.includes("## What your role controls"), "explains the permission flags");
    assert.ok(page.includes("Department Code"), "lists the fields");

    const custom = renderCustomPage(CUSTOM_SCREENS[0]);
    assert.match(custom, /^# Dashboard/, "custom pages render their title");
    assert.ok(custom.includes("## "), "custom pages render their sections");
}

// ---- which views get photographed ---------------------------------------
//
// The operation sections are illustrated by the screen their steps describe, so
// a screen losing a shot silently ships instructions with no picture of the form
// they refer to.

{
    const ordinary = CONFIG_SCREENS.find((s) => s.key === "department");
    assert.deepEqual(
        shotsFor(ordinary),
        ["list", "add", "view", "edit"],
        "an ordinary screen photographs the list and the three form views",
    );

    // A list-only screen hands off to its own editor: there is no shared add or
    // edit form to photograph, and documenting one would be a picture of a
    // screen the user cannot reach that way.
    const listOnly = CONFIG_SCREENS.find((s) => s.key === "seo-page");
    assert.deepEqual(shotsFor(listOnly), ["list"], "a list-only screen photographs only its list");

    assert.deepEqual(shotsFor({ key: "x", shots: ["list"] }), ["list"], "an explicit shots list wins");

    // The list keeps its original name so the images already committed stay
    // valid rather than all being rewritten under new ones.
    assert.equal(shotName("department", "list", "dark"), "department-dark", "list keeps its name");
    assert.equal(shotName("department", "add", "dark"), "department-add-dark", "other views are suffixed");

    // A screen whose extra views have not been captured yet must not count as
    // present, or the incremental plan would skip it forever.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-shots-"));
    fs.mkdirSync(path.join(dir, SHOTS_DIR), { recursive: true });
    const write = (name) => fs.writeFileSync(path.join(dir, SHOTS_DIR, `${name}.png`), "x");
    for (const theme of THEMES) write(shotName("department", "list", theme));
    assert.equal(imagesPresent(dir, ordinary), false, "a missing add/view/edit shot is not 'present'");
    for (const view of ["add", "view", "edit"]) {
        for (const theme of THEMES) write(shotName("department", view, theme));
    }
    assert.equal(imagesPresent(dir, ordinary), true, "all four views present counts as present");
    fs.rmSync(dir, { recursive: true, force: true });
}

// ---- the four operations ------------------------------------------------
//
// These sections are the how-to half of every page. The risks are that a
// screen silently loses one, that a `listOnly` screen grows instructions for
// buttons it does not have, or that a button label drifts from what the app
// actually renders.

{
    const uniform = fs.readFileSync(path.join(REPO_ROOT, "apps/admin/src/entities/index.js"), "utf8");
    const advanced = fs.readFileSync(path.join(REPO_ROOT, "apps/admin/src/entities/advanced.jsx"), "utf8");

    const department = renderConfigPage(
        CONFIG_SCREENS.find((s) => s.key === "department"),
        extractConfig(advanced, "departmentConfig"),
    );
    for (const heading of [
        "## Adding a Department",
        "## Viewing a Department",
        "## Editing a Department",
        "## Deleting a Department",
    ]) {
        assert.ok(department.includes(heading), `an ordinary screen documents "${heading}"`);
    }

    // Quoted verbatim from crud-list (`Add ${singular}`) and crud-form
    // (`Create ${singular.toLowerCase()}`). If either component's label
    // changes, this is the assertion that should fail.
    assert.ok(department.includes("**Add Department**"), "the add button is named as it renders");
    assert.ok(department.includes("**Create department**"), "the submit button keeps its lowercase");
    assert.ok(department.includes("**Save changes**"), "the edit submit button is named");

    // Every operation says which permission hides its button.
    for (const flag of ["write", "read", "edit", "delete"]) {
        assert.ok(
            department.includes(`Needs the **${flag}** permission`),
            `the ${flag} operation states its permission`,
        );
    }

    // A screen whose singular is title-cased still reads as a noun mid-sentence.
    assert.ok(
        department.includes("refers to this department,"),
        "the record name is lowercased inside a sentence",
    );

    // `listOnly`: lists records, hands off to its own editor. Documenting an
    // add or delete button here sends someone looking for one that is absent.
    const seoPage = renderConfigPage(
        CONFIG_SCREENS.find((s) => s.key === "seo-page"),
        extractConfig(advanced, "seoPageConfig"),
    );
    assert.ok(seoPage.includes("## Viewing an SEO Page"), "a list-only screen documents viewing");
    for (const heading of ["## Adding", "## Editing", "## Deleting"]) {
        assert.ok(!seoPage.includes(heading), `a list-only screen omits "${heading}"`);
    }
    assert.ok(
        !seoPage.includes("**Edit** takes you straight"),
        "a list-only view section does not promise an Edit button",
    );

    // An acronym is read letter by letter ("an S-E-O page"); "User" is said
    // "yoo-zer" and takes "a" despite the vowel.
    const user = renderConfigPage(
        CONFIG_SCREENS.find((s) => s.key === "user"),
        extractConfig(advanced, "userConfig"),
    );
    assert.ok(user.includes("## Adding a User"), '"User" takes "a", not "an"');

    // The override hook, so a screen that genuinely differs can replace one
    // section without the generator being edited.
    const overridden = renderConfigPage(
        { ...CONFIG_SCREENS.find((s) => s.key === "role"), operations: { delete: "Ask an administrator." } },
        extractConfig(uniform, "roleConfig"),
    );
    assert.ok(overridden.includes("Ask an administrator."), "an operations override replaces the body");
    assert.ok(
        !overridden.includes("Press the delete icon on a row. You are asked to confirm"),
        "an overridden operation drops the generated body",
    );
}

// ---- the manifest itself ------------------------------------------------

{
    const keys = ALL_SCREENS.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length, "screen keys are unique");

    for (const entry of ALL_SCREENS) {
        assert.ok(
            fs.existsSync(path.join(REPO_ROOT, entry.source)),
            `${entry.key}: source file ${entry.source} exists`,
        );
    }
}

console.log("docs fingerprint + generator: all checks passed");
