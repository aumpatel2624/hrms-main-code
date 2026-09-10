# CLAUDE.md

@AGENTS.md

Everything for this repo lives in `AGENTS.md` above and the docs it links to, so every agent reads
the same source. Nothing project-specific belongs in this file.

Claude-specific notes:

- Skills are auto-loaded from `.claude/skills/`. `.agents/skills` is a symlink to that same
  directory so Codex and Gemini CLI find them too — add new skills to `.claude/skills/` only.
- Hooks in `.claude/settings.json` block writes to generated files and destructive git commands,
  and warn about missing indexes, filter-parity drift, missing menu rows and screens absent from the
  documentation manifest. They are guardrails, not the process — the process is the pipeline in
  `AGENTS.md`.
