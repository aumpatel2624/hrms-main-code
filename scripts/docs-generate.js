/**
 * Documentation generator (ADR-011).
 *
 * Turns each screen in `docs-src/manifest.js` into a markdown page under
 * `apps/admin/src/docs/pages/`, which the admin SPA imports at build time.
 *
 * The split of labour matters and is the whole reason this file is short:
 *
 * - The **entity config** supplies structure — what the screen is called, what
 *   its sections are, every field with its label, hint and whether it is
 *   required, and what can be filtered. That material was written for humans
 *   already; restating it in prose would only let the two drift apart.
 * - The **manifest** supplies what a config cannot know — why the screen
 *   exists, what someone is usually trying to do, and what will surprise them.
 *
 * Generated pages are overwritten every run. Nothing here should be edited by
 * hand; edit `docs-src/manifest.js` instead.
 */
import fs from "fs";
import path from "path";

import { PERMISSION_KEYS } from "../packages/shared/src/permissions.js";
import { CONFIG_SCREENS, CUSTOM_SCREENS } from "../docs-src/manifest.js";
import { shotName, shotsFor, SHOTS_DIR, THEMES } from "./docs-fingerprint.js";

export const PAGES_DIR = "apps/admin/src/docs/pages";

/** Plain-English names for the permission flags on the User Roles grid. */
const PERMISSION_LABELS = {
    read: "see this screen at all",
    write: "add new records",
    edit: "change existing records",
    delete: "remove records",
    print: "print or export",
    mail: "send email from this screen",
};

/**
 * Loads the entity configs.
 *
 * They are JSX modules importing React components and icons, so they cannot be
 * imported by plain Node. Rather than standing up a build step for the
 * generator, the config is read as text and the few fields the documentation
 * needs are pulled out — see `extractConfig`. Fragile in principle; in practice
 * these are hand-written object literals in a consistent house style, and the
 * alternative is bundling the whole admin app to print a field list.
 */
const readSource = (repoRoot, relativePath) =>
    fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

/**
 * Pulls one config object's text out of its module.
 *
 * Matches from `export const <name> = {` to the line that closes it at column
 * zero — the house style indents every nested brace, so a `};` at the start of
 * a line is unambiguous.
 */
export const sliceConfig = (source, exportName) => {
    const start = source.indexOf(`export const ${exportName} = {`);
    if (start === -1) return null;
    const end = source.indexOf("\n};", start);
    if (end === -1) return null;
    return source.slice(start, end + 3);
};

/** `key: "value"` or `key: 'value'` at any depth. */
const stringProp = (text, key) => {
    const match = text.match(new RegExp(`\\b${key}:\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`));
    return match ? match[2].replace(/\\(["'])/g, "$1") : null;
};

/** Every `{ ... }` object literal inside a named array property. */
const arrayProp = (text, key) => {
    const start = text.indexOf(`${key}: [`);
    if (start === -1) return [];
    let depth = 0;
    let index = text.indexOf("[", start);
    const from = index;
    for (; index < text.length; index += 1) {
        if (text[index] === "[") depth += 1;
        else if (text[index] === "]") {
            depth -= 1;
            if (depth === 0) break;
        }
    }
    const body = text.slice(from + 1, index);

    // Split on top-level `},` boundaries so nested objects stay with their
    // parent. Bare identifiers between those objects — `ACTIVE,` on its own
    // line — are entries too, and are collected rather than discarded: missing
    // one silently drops a field from the documentation, which is exactly what
    // happened to the Active flag in the first version of this.
    const items = [];
    let braces = 0;
    let current = "";
    let between = "";
    for (const char of body) {
        if (char === "{") {
            if (braces === 0) {
                const bare = between.replace(/[,\s]/g, "");
                if (bare) items.push(bare);
                between = "";
            }
            braces += 1;
        }
        if (braces === 0) between += char;
        else current += char;
        if (char === "}") {
            braces -= 1;
            if (braces === 0) {
                items.push(current);
                current = "";
            }
        }
    }
    const trailing = between.replace(/[,\s]/g, "");
    if (trailing) items.push(trailing);
    return items;
};

/**
 * The shared Active flag, spread into nearly every config as `ACTIVE` or
 * `{ ...ACTIVE, default: true }`.
 *
 * Reading it by text alone yields nothing, and dropping it would quietly lose
 * the one field every screen has — which is how the first draft of this
 * generator produced pages with no Status section at all. Its shape is fixed at
 * the single definition in the entity modules, so it is restated here.
 */
const ACTIVE_FIELD = Object.freeze({
    name: "isActive",
    label: "Is Active",
    type: "checkbox",
    section: "status",
    hint: "Inactive records stay in the system and keep their history, but stop being offered " +
        "in dropdowns on other screens.",
});

/**
 * The subset of an entity config the documentation needs.
 */
export const extractConfig = (source, exportName) => {
    const text = sliceConfig(source, exportName);
    if (!text) throw new Error(`Config ${exportName} not found — did it get renamed?`);

    const fields = arrayProp(text, "fields").map((item) => {
        if (/\.\.\.ACTIVE/.test(item) || /^\s*ACTIVE\s*,?\s*$/.test(item)) return { ...ACTIVE_FIELD };
        return {
            name: stringProp(item, "name"),
            label: stringProp(item, "label"),
            hint: stringProp(item, "hint"),
            placeholder: stringProp(item, "placeholder"),
            type: stringProp(item, "type") ?? "text",
            section: stringProp(item, "section"),
            required: /\brequired:\s*true/.test(item),
        };
    });

    return {
        singular: stringProp(text, "singular"),
        plural: stringProp(text, "plural"),
        description: stringProp(text, "description"),
        path: stringProp(text, "path"),
        sections: arrayProp(text, "sections").map((item) => ({
            id: stringProp(item, "id"),
            title: stringProp(item, "title"),
            description: stringProp(item, "description"),
        })),
        fields: fields.filter((field) => field.name),
        filterFields: arrayProp(text, "filterFields")
            .map((item) => stringProp(item, "label"))
            .filter(Boolean),
        columns: arrayProp(text, "columns")
            .map((item) => stringProp(item, "name"))
            .filter(Boolean),
    };
};

/** How a field type reads to someone who has never seen a form config. */
const TYPE_NOTES = {
    select: "chosen from a list",
    checkbox: "a yes/no tick box",
    date: "a date",
    number: "a number",
    email: "an email address",
    password: "a password",
    textarea: "free text",
    icon: "an icon picker",
};

/**
 * A Material-style admonition.
 *
 * Emitted as a blockquote whose first line is a `[!TYPE]` marker — the syntax
 * GitHub uses — so the markdown stays readable as plain text and degrades to an
 * ordinary quote anywhere that does not understand it. The renderer turns it
 * into a coloured callout.
 */
const admonition = (type, title, body) =>
    [`> [!${type.toUpperCase()}] ${title}`, ...body.map((line) => `> ${line}`)].join("\n");

/**
 * A record's name as it reads mid-sentence.
 *
 * The configs title-case their `singular` because it is button and heading
 * text — "Department", "Email Setup". Dropped into a sentence that reads as a
 * proper noun, so it is lowercased. Words that are entirely capitals are
 * acronyms and keep their case: "this SEO page", not "this seo page".
 */
const inSentence = (singular) =>
    singular
        .split(" ")
        .map((word) => (word === word.toUpperCase() ? word : word.toLowerCase()))
        .join(" ");

/**
 * "a" or "an", chosen by how the name is *said* rather than how it is spelt.
 *
 * Two cases spelling alone gets wrong, and both occur in this repo:
 *
 * - A leading acronym is read letter by letter, so "SEO Page" is "an S-E-O
 *   page" despite starting with a consonant.
 * - "User" is said "yoo-zer" — a consonant sound behind a vowel letter — so it
 *   takes "a". Same for "Unit", "European".
 *
 * Not a general solution to English articles; it covers the shapes an entity
 * `singular` actually takes, and anything else falls back to the letter.
 */
const article = (name) => {
    const trimmed = name.trim();
    const first = trimmed[0] ?? "";

    // An acronym only if the *whole* first word is capitals — "SEO", not "User".
    const firstWord = trimmed.split(" ")[0];
    if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) {
        // Letters whose name begins with a vowel sound: A, E, F, H, I, L, M,
        // N, O, R, S, X.
        return /[AEFHILMNORSX]/.test(first) ? "an" : "a";
    }

    // "u" is usually "yoo" in these names, which takes "a".
    if (/^u/i.test(trimmed)) return "a";
    return /[aeiou]/i.test(first) ? "an" : "a";
};

/**
 * The four things a user can do to a record, written from what the shared CRUD
 * components actually do rather than from what a config declares.
 *
 * Every config-driven screen renders the same `crud-list`, `crud-form` and
 * `crud-view`, so the steps are identical everywhere and belong here once. What
 * differs per screen — which fields are required, which delete guard bites — is
 * already covered by "What you fill in" and the manifest's `gotchas`, so these
 * sections deliberately describe the mechanics and nothing else.
 *
 * Each returns the body lines for one section; the caller supplies the heading
 * so it can name the record type ("Adding a department").
 */
const OPERATION_SECTIONS = [
    {
        id: "create",
        view: "add",
        heading: (name) => `Adding ${article(name)} ${name}`,
        permission: "write",
        body: (config) => [
            `Press **Add ${config.singular}** at the top right of the list. That opens a blank form.`,
            "",
            "1. Fill in the fields described above. Required ones are marked with an asterisk.",
            // Both button labels are quoted exactly as the app renders them —
            // `crud-list` capitalises the singular, `crud-form` lowercases it.
            // Prettying either one up here sends someone hunting for a button
            // that does not say that.
            `2. Press **Create ${config.singular.toLowerCase()}** at the bottom of the form.`,
            "",
            "Anything missing or invalid is flagged underneath the field it belongs to, and nothing " +
                "is saved until every one of those is cleared. Once it saves you are returned to the " +
                "list with the new record in it.",
            "",
            "**Cancel** leaves without saving. Nothing is kept, so a half-filled form is not waiting " +
                "for you when you come back.",
        ],
    },
    {
        id: "read",
        view: "view",
        heading: (name) => `Viewing ${article(name)} ${name}`,
        permission: "read",
        body: (config, screen) => [
            "Press the view icon on a row to open the record on its own screen. It shows the same " +
                "fields in the same order as the form, but read-only, with related records shown by " +
                "name rather than as a reference.",
            "",
            "At the bottom you get when the record was created and when it was last changed, and a " +
                "badge at the top shows whether it is active." +
                (screen.listOnly ? "" : " **Edit** takes you straight into changing it."),
            "",
            "**Back** returns to the list. Passwords are never shown here, on any record.",
        ],
    },
    {
        id: "update",
        view: "edit",
        heading: (name) => `Editing ${article(name)} ${name}`,
        permission: "edit",
        body: () => [
            "Press the edit icon on a row, or **Edit** while viewing a record. The form opens with " +
                "the current values already in it.",
            "",
            "Change what you need and press **Save changes**. The same checks as adding apply, and " +
                "you are returned to the list once it saves.",
            "",
            "Every change is recorded — who made it, when, and what each value was before. You can " +
                "read that back on the **Audit Log** screen.",
        ],
    },
    {
        id: "delete",
        heading: (name) => `Deleting ${article(name)} ${name}`,
        permission: "delete",
        body: (config) => [
            "Press the delete icon on a row. You are asked to confirm first, and nothing is removed " +
                "until you do.",
            "",
            `If something else in the system still refers to this ${inSentence(config.singular)}, ` +
                "the deletion is refused and you are told what is using it. Clear or reassign those " +
                "first, then try again.",
            "",
            "Deleting hides the record rather than destroying it, so history and past reports stay " +
                "intact. If you only want it out of the dropdowns on other screens, untick **Is " +
                "Active** instead — that keeps it available to look up.",
        ],
    },
];

/**
 * The "what you can do" half of a page.
 *
 * `listOnly` screens have no add/edit form — they list records and hand off to
 * a separate editor — so they get no create/update sections rather than
 * instructions for buttons that are not there.
 */
const operationSections = (screen, config) => {
    const lines = [];
    const wanted = screen.listOnly
        ? OPERATION_SECTIONS.filter((op) => op.id === "read")
        : OPERATION_SECTIONS;
    // The record's own name, cased as the app cases it — "SEO Page", not
    // "seo page". Only the quoted button labels inside a body get lowercased,
    // and only because the button itself is.
    const name = config.singular ?? "record";

    const available = new Set(shotsFor(screen));

    for (const op of wanted) {
        lines.push(`## ${op.heading(name)}`, "");
        const override = screen.operations?.[op.id];
        lines.push(...(override ? [override] : op.body(config, screen)), "");
        // The screen the steps describe, where one was captured. Delete has no
        // shot of its own — its dialog is a small modal over the list, which the
        // list screenshot at the top of the page already shows.
        if (op.view && available.has(op.view)) {
            lines.push(screenshotBlock(screen.key, `${op.heading(name)}`, op.view), "");
        }
        // One italic line rather than a callout per section: four identical
        // warning boxes on one page train people to skip all of them, and
        // "What your role controls" below explains the flags properly.
        lines.push(
            `*Needs the **${op.permission}** permission — without it the button is not shown.*`,
            "",
        );
    }
    return lines;
};

/**
 * Both themes' images, one of which the renderer shows.
 *
 * A reader on the light theme has no use for a picture of the dark one, and
 * emitting both inline doubled the length of every page. They are still both
 * emitted here — the markdown has no way to know which theme is active — but
 * each is tagged so `documentation.css` can show only the matching one, which
 * also means switching theme swaps the pictures with no re-render.
 */
const screenshotBlock = (key, title, view = "list") =>
    THEMES.map(
        (theme) =>
            `![${title}](../screenshots/${shotName(key, view, theme)}.png "${theme}")`,
    ).join("\n\n");

/** Markdown for one config-driven screen. */
export const renderConfigPage = (screen, config) => {
    const title = config.plural ?? screen.key;
    const lines = [`# ${title}`, ""];

    if (screen.intro) lines.push(screen.intro, "");
    else if (config.description) lines.push(config.description, "");

    lines.push(screenshotBlock(screen.key, title), "");

    if (screen.when) lines.push("## When you would use this", "", screen.when, "");

    // Fields, grouped the way the form groups them, so the page reads in the
    // same order as the screen it describes.
    if (config.fields.length) {
        lines.push("## What you fill in", "");
        const bySection = new Map();
        for (const field of config.fields) {
            const key = field.section ?? "other";
            if (!bySection.has(key)) bySection.set(key, []);
            bySection.get(key).push(field);
        }

        const sections = config.sections.length
            ? config.sections
            : [...bySection.keys()].map((id) => ({ id, title: null }));

        for (const section of sections) {
            const fields = bySection.get(section.id) ?? [];
            if (!fields.length) continue;
            if (section.title) lines.push(`### ${section.title}`, "");
            if (section.description) lines.push(section.description, "");
            for (const field of fields) {
                const notes = [];
                if (field.required) notes.push("required");
                if (TYPE_NOTES[field.type]) notes.push(TYPE_NOTES[field.type]);
                const suffix = notes.length ? ` *(${notes.join(", ")})*` : "";
                const explanation = field.hint ? ` — ${field.hint}` : "";
                lines.push(`- **${field.label ?? field.name}**${suffix}${explanation}`);
            }
            lines.push("");
        }
    }

    if (config.filterFields.length) {
        lines.push(
            "## Finding a record",
            "",
            "Use the search box for a quick look-up, or open the filter panel to narrow the list by:",
            "",
            ...config.filterFields.map((label) => `- ${label}`),
            "",
            "Your filters and column layout are remembered, so the list looks the same next time you " +
                "open it.",
            "",
        );
    }

    // How to actually do the four things. These come after the field list so a
    // reader has met the fields before being told to fill them in, and before
    // the gotchas, which are mostly about what goes wrong while doing them.
    lines.push(...operationSections(screen, config));

    // Each gotcha is its own callout rather than a bullet list: they are the
    // things people get wrong, and a warning box is read where a fourth bullet
    // is skimmed.
    if (screen.gotchas?.length) {
        lines.push("## Things worth knowing", "");
        for (const gotcha of screen.gotchas) {
            lines.push(admonition("warning", "Worth knowing", [gotcha]), "");
        }
    }

    lines.push(
        "## What your role controls",
        "",
        "Each of these is granted separately for this screen on the **User Roles** screen:",
        "",
        ...PERMISSION_KEYS.map((key) => `- **${key}** — ${PERMISSION_LABELS[key]}`),
        "",
        admonition("note", "Missing a button?", [
            "A button you cannot see is a permission your role has not been granted. Ask whoever " +
                "manages roles to grant it on the User Roles screen.",
        ]),
        "",
    );
    if (screen.roles) lines.push(admonition("info", "What you can see", [screen.roles]), "");

    return `${lines.join("\n").trimEnd()}\n`;
};

/** Markdown for a hand-written screen. */
export const renderCustomPage = (screen) => {
    const lines = [`# ${screen.title}`, ""];
    if (screen.intro) lines.push(screen.intro, "");
    lines.push(screenshotBlock(screen.key, screen.title), "");
    for (const block of screen.body ?? []) {
        lines.push(`## ${block.heading}`, "", block.text, "");
    }
    return `${lines.join("\n").trimEnd()}\n`;
};

/** The index the documentation sidebar is built from. */
const renderIndex = (entries) => {
    const lines = [
        "# Documentation",
        "",
        "How to use this panel, screen by screen. Pick a screen from the list to read about it.",
        "",
    ];
    for (const [section, items] of entries) {
        lines.push(`## ${section}`, "");
        for (const item of items) lines.push(`- [${item.title}](${item.key})`);
        lines.push("");
    }
    return `${lines.join("\n").trimEnd()}\n`;
};

export const generate = (repoRoot) => {
    const outDir = path.join(repoRoot, PAGES_DIR);
    fs.mkdirSync(outDir, { recursive: true });

    const written = [];

    for (const screen of CONFIG_SCREENS) {
        const source = readSource(repoRoot, screen.source);
        const config = extractConfig(source, screen.config);
        fs.writeFileSync(path.join(outDir, `${screen.key}.md`), renderConfigPage(screen, config));
        written.push({ key: screen.key, title: config.plural ?? screen.key, group: "Screens" });
    }

    for (const screen of CUSTOM_SCREENS) {
        fs.writeFileSync(path.join(outDir, `${screen.key}.md`), renderCustomPage(screen));
        written.push({ key: screen.key, title: screen.title, group: "Tools and logs" });
    }

    const grouped = new Map();
    for (const item of written) {
        if (!grouped.has(item.group)) grouped.set(item.group, []);
        grouped.get(item.group).push(item);
    }
    fs.writeFileSync(path.join(outDir, "index.md"), renderIndex([...grouped]));

    return written;
};

// Run directly for generation without capture — useful while writing prose.
if (process.argv[1] && process.argv[1].endsWith("docs-generate.js")) {
    const repoRoot = path.join(import.meta.dirname, "..");
    const written = generate(repoRoot);
    console.log(`✅ Generated ${written.length} pages + index into ${PAGES_DIR}`);
}
