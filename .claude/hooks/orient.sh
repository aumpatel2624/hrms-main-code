#!/usr/bin/env bash
# SessionStart — orient the agent: where the project is, what changed since
# last time, and what to do next.
#
# The three things a returning session cannot know on its own:
#   1. client documents that arrived or changed since they were last read
#   2. modules left half-finished
#   3. what is blocked
set -euo pipefail
cat >/dev/null 2>&1 || true

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"
kb="$root/docs/knowledge"
state="$kb/STATE.md"
branch=$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

out="demo-panel starter. Read AGENTS.md before your first edit — it defines the pipeline every change follows and the conventions in docs/conventions/.
Branch: $branch"

# --- whose agent am I? --------------------------------------------------------
email=$(git -C "$root" config user.email 2>/dev/null || echo "")
if [ -f "$kb/TEAM.md" ] && ! grep -q "_not set up yet_" "$kb/TEAM.md" 2>/dev/null; then
  row=$(grep -F "$email" "$kb/TEAM.md" 2>/dev/null | head -1 || true)
  if [ -n "$row" ]; then
    who=$(awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/,"",$2); gsub(/^[ \t]+|[ \t]+$/,"",$3); print $2" ("$3")"}' <<<"$row")
    out="$out
You are $who's agent — commit, comment and open PRs as them, never as yourself.
Your tasks: gh issue list --assignee @me --state open"
  else
    out="$out
⚠ git user.email is '$email', which is not in docs/knowledge/TEAM.md. Ask the user who they are
before any git or issue operation — mis-assigned work means two people build the same thing."
  fi
fi

case "$branch" in
  development|staging|production)
    out="$out
⚠ You are on the protected branch '$branch'. Everything reaches it by pull request — start a feature
branch before making changes: git switch -c feat/<issue>-<slug> origin/development" ;;
esac

# --- 1. project specified yet? ------------------------------------------------
if [ -f "$kb/PRD.md" ] && grep -q "TEMPLATE — not filled in yet" "$kb/PRD.md"; then
  out="$out

⚠ This project has not been specified yet — docs/knowledge/ is still templates.
Start with the grill-me skill. If the client's material is in docs/knowledge/input/, read that first."
  jq -n --arg c "$out" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
  exit 0
fi

# --- 2. unparsed or changed client documents ----------------------------------
if [ -d "$kb/input" ]; then
  known=""
  [ -f "$state" ] && known=$(grep -oE '\b[0-9a-f]{8}\b' "$state" || true)
  new=""
  while IFS= read -r f; do
    base=$(basename "$f")
    case "$base" in README.md|.gitkeep) continue ;; esac
    h=$(shasum -a 256 "$f" 2>/dev/null | cut -c1-8) || continue
    if ! grep -qx "$h" <<<"$known" 2>/dev/null; then
      if grep -q "| $base " "$state" 2>/dev/null; then
        new="${new}
  • $base  (CHANGED since it was parsed — hash $h)"
      else
        new="${new}
  • $base  (new — never parsed, hash $h)"
      fi
    fi
  done < <(find "$kb/input" -maxdepth 1 -type f 2>/dev/null | sort)

  if [ -n "$new" ]; then
    out="$out

⚠ UNPARSED CLIENT DOCUMENTS in docs/knowledge/input/:$new

Tell the user these arrived, and offer to run grill-me on them. Read only what is new or changed and
ask only about what it adds or contradicts — do not re-interrogate settled ground. Register any new
modules in STATE.md and record each document's hash there once parsed."
  fi
fi

# --- 3. modules in flight, and blockers ---------------------------------------
if [ -f "$state" ]; then
  wip=$(awk -F'|' '/^## Modules/{m=1;next} /^## Log/{m=0}
    m && /^\|/ && !/^\|[ -]*\|/ && !/Module/ && !/no modules yet/ && /wip/{
      s=$2; gsub(/^[ \t]+|[ \t]+$/,"",s); print "  • " s }' "$state" || true)
  [ -n "$wip" ] && out="$out

▶ MODULE(S) IN PROGRESS (finish these before starting anything new):
$wip
Read docs/knowledge/STATE.md for which phase each stopped at, then continue from there."

  blocked=$(awk -F'|' '/^## Blocked/{b=1;next}
    b && /^\|/ && !/^\|[ -]*\|/ && !/Module/ && NF>2 && $2 !~ /^ *$/{
      m=$2; r=$3; gsub(/^[ \t]+|[ \t]+$/,"",m); gsub(/^[ \t]+|[ \t]+$/,"",r);
      print "  • " m ": " r }' "$state" || true)
  [ -n "$blocked" ] && out="$out

⛔ BLOCKED:
$blocked"

  last=$(awk '/^## Log/{l=1;next} l && /^\|/ && !/^\|[ -]*\|/ && !/^\| Date/ && NF>2 {print; exit}' "$state" || true)
  [ -n "$last" ] && out="$out

Last session: $(sed 's/^| *//; s/ *|$//; s/ *| */ → /g' <<<"$last")"
fi

out="$out

The user may not be a software engineer. Explain in plain language, tell them what you are doing and
why, and ask before deciding anything they should own. If they seem unsure what to do next, run the
whats-next skill."

jq -n --arg c "$out" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
