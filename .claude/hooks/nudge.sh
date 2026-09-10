#!/usr/bin/env bash
# PostToolUse(Write|Edit) — non-blocking convention checks.
#
# Never denies. Injects context when a real, checkable convention looks unmet.
# Patterns match apps/*/ rather than a named app, so a second API or a ported
# workspace is covered with no change here. Everything is a check against the
# file just written, not a blanket reminder — judgement calls belong in
# docs/conventions/, not in a hook.
set -euo pipefail

input=$(cat)
path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[ -n "$path" ] && [ -f "$path" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
notes=""
add() { notes="${notes}${notes:+$'\n'}- $1"; }

case "$path" in
  # Mongoose model in any workspace.
  */apps/*/models/*.js)
    if ! grep -Eq '\.index\(|unique:[[:space:]]*true' "$path"; then
      add "$(basename "$path") declares no indexes. Every ref field, every field in the controller's \`filterable\` map, and every business-unique key needs one — and createdAt if the collection will grow. See the schema-design skill and docs/conventions/20-schema.md. Most existing models get this wrong; that is the gap, not the pattern."
    fi
    ;;

  # Entity config in any SPA workspace — every screen needs a seed menu row,
  # and an entry in the documentation manifest.
  */apps/*/src/entities/*)
    missing=""
    while IFS= read -r p; do
      [ -n "$p" ] || continue
      grep -qs "\"$p\"" "$root"/apps/*/seed/*.js || missing="${missing}${missing:+, }$p"
    done < <(grep -oE 'path:[[:space:]]*"[^"]+"' "$path" | sed -E 's/.*"(.*)"/\1/' | sort -u)
    [ -n "$missing" ] && add "No seed menu row found for: $missing. A screen with no MenuMaster row in the seed file is invisible to every non-admin user and resolves to all-false permissions — it will look fine to you as admin and be broken for everyone else. Add it to MENU_GROUPS and re-run \`npm run seed\`."

    # Every exported config should be documented. Checked by export name rather
    # than by screen path, because that is what the manifest references.
    if [ -f "$root/docs-src/manifest.js" ]; then
      undocumented=""
      while IFS= read -r cfg; do
        [ -n "$cfg" ] || continue
        grep -qs "\"$cfg\"" "$root/docs-src/manifest.js" \
          || undocumented="${undocumented}${undocumented:+, }$cfg"
      done < <(grep -oE '^export const [a-zA-Z]+Config' "$path" | awk '{print $3}' | sort -u)
      [ -n "$undocumented" ] && add "Not in docs-src/manifest.js: $undocumented. A screen missing from the manifest gets no end-user documentation page and no screenshot, and nothing else will warn you — the docs build simply skips it. Add an entry and run the client-docs skill (pipeline phase 7.5)."
    fi
    ;;

  # A hand-written admin page is a screen too, and the generator can say
  # nothing useful about one — these are the pages users most need explained.
  */apps/*/src/pages/*.jsx)
    case "$path" in
      # Login and the profile screen are not documented screens.
      */pages/Authentication/*) ;;
      *)
        if [ -f "$root/docs-src/manifest.js" ]; then
          page=$(basename "$path" .jsx)
          grep -qs "$page.jsx" "$root/docs-src/manifest.js" \
            || add "$page has no entry in docs-src/manifest.js. Custom pages have no entity config, so the documentation generator produces nothing for them at all — the whole page has to be written by hand in CUSTOM_SCREENS. See the client-docs skill."
        fi
        ;;
    esac
    ;;

  # Vendored UI source — wrap, do not edit.
  */src/components/base/*|*/src/components/application/*)
    add "$path is vendored Untitled UI source. Editing it makes future updates painful — wrap it in the workspace's components/ui/ instead. If it genuinely needs a fix here, tell the user why."
    ;;
esac

case "$path" in
  */apps/*/controllers/*)
    if grep -q 'filterable' "$path"; then
      add "This controller's \`filterable\` map must stay in sync with the matching entity config's \`filterFields\` — same names, same types. A field in one and not the other is either a UI control that 400s or a filter nobody can reach. Every filterable field also needs an index."
    fi
    ;;
esac

# A new workspace has to be registered, or no agent knows its rules.
case "$path" in
  */apps/*/package.json|*/packages/*/package.json)
    ws=$(sed -E 's|.*/(apps\|packages)/([^/]+)/package\.json|\1/\2|' <<<"$path")
    grep -qs "\`$ws\`" "$root/docs/conventions/10-architecture.md" \
      || add "$ws is not in the app registry in docs/conventions/10-architecture.md. An unregistered workspace has no conventions doc and no agent config, so every agent improvises on it. Run the add-app skill to register it properly."
    ;;
esac

[ -n "$notes" ] || exit 0

jq -n --arg ctx "Convention check:"$'\n'"$notes" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'
