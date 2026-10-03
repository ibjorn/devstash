# Current Feature: Fix — current-feature.md History Bloat

## Status

In Progress

## Goals

- **Move History out of the auto-loaded file:** move every existing `## History` entry, unchanged and oldest-first, into a new `context/feature-history.md` that nothing `@`-imports. `current-feature.md` keeps only Status / Goals / Notes plus a one-line pointer to the history file.
- **Update everything that writes or reads History** so new entries land in the new file:
  - `.claude/skills/feature/SKILL.md` — "File Structure" lists `## History`
  - `.claude/skills/feature/actions/complete.md` step 4 — "Add feature summary to the END of History"
  - `.claude/skills/cleanup/SKILL.md` item 1 — checks the history in `current-feature.md` is ordered
  - `context/ai-interaction.md` workflow step 10 — "Mark as completed … and add to history"
- **Keep new entries short:** `complete.md` writes a history entry as **one line** (date, **name**, one-sentence summary), pointing at the spec under `context/features/` / `context/fixes/` and git history rather than repeating them.
- **Check:** `wc -c context/current-feature.md` is under ~1 KB afterwards, and `/feature load` → `complete` still works (test run or careful read-through of the action files).

## Notes

- Spec: context/fixes/current-feature-history-bloat.md. Housekeeping only — no app code, no schema change, no new dependency.
- Plain lossless move of the existing entries — no summarising or rewriting, so the diff stays reviewable. Shortening old entries is an optional separate pass.
- Current size measured at load: **224,183 bytes** (~56k tokens) — the four other `@`-imported context files total ~20 KB together, `project-overview.md` being the largest at ~13 KB.
- `@context/current-feature.md` is also imported in the feature skill's `SKILL.md`; cheap once History is gone, so leave it unless it turns out to load the file twice.
- Review whether each other `CLAUDE.md` `@`-import needs to load every session, but the history file is the main cost.
- The new file must not be `@`-referenced anywhere (skills included) or the cost just moves — refer to it by plain path.

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
