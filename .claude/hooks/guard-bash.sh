#!/usr/bin/env bash
# PreToolUse(Bash) — deny irreversible git and filesystem commands.
#
# Deny only what cannot be undone. Committing on main is this repo's actual
# history, so that warns rather than blocks.
set -euo pipefail

input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
[ -n "$cmd" ] || exit 0

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

warn() {
  jq -n --arg ctx "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: $ctx
    }
  }'
  exit 0
}

if grep -Eq 'git[[:space:]]+push\b.*(--force-with-lease|--force|[[:space:]]-f\b)' <<<"$cmd"; then
  deny "Force-pushing rewrites published history. If this is genuinely needed, ask the user to run it."
fi

if grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard' <<<"$cmd"; then
  deny "'git reset --hard' discards uncommitted work irreversibly. Use 'git stash' or ask the user."
fi

if grep -Eq 'git[[:space:]]+(clean[[:space:]]+-[a-z]*f|checkout[[:space:]]+--[[:space:]]+\.)' <<<"$cmd"; then
  deny "This discards uncommitted changes irreversibly. Show the user 'git status' and let them decide."
fi

# rm -rf is fine in the scratchpad and /tmp, nowhere else.
if grep -Eq '\brm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)' <<<"$cmd"; then
  if ! grep -Eq '(/tmp/|/private/tmp/|scratchpad)' <<<"$cmd"; then
    deny "Recursive force-delete outside the scratchpad. Delete specific files, or ask the user to confirm this path."
  fi
fi

if grep -Eq 'git[[:space:]]+(commit|push|merge)\b' <<<"$cmd"; then
  branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  case "$branch" in
    development|staging|production)
      deny "'$branch' is a protected branch — everything reaches it by pull request. Work on a feature branch instead:
  git switch -c feat/<issue>-<slug> origin/development
To merge or promote, use the integrate skill; to resolve conflicts, merge development INTO your feature branch, never the reverse." ;;
    main|master)
      warn "Note: you are on '$branch'. If this project has a team, work belongs on a feature branch off 'development' — see the git-flow skill. If it is solo and pre-team-setup, this is fine, but confirm the user asked for a commit." ;;
  esac
fi

exit 0
