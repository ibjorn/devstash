# Fix — current-feature.md History Bloat

Found 2026-10-02 from an openbao-k8s session while comparing session workflows. `CLAUDE.md` imports `@context/current-feature.md`, so the whole file loads at the start of every session. The file is now **~222 KB / 67 lines**, almost all of it the append-only `## History` section: each completed feature adds a multi-KB paragraph. That is roughly 50–60k tokens (chars ÷ 4) spent before the first prompt, and it grows with every `/feature complete`. Housekeeping only: no app code, no schema change, no new dependency.

## Goals

- **Move History out of the auto-loaded file:** move the existing `## History` entries, unchanged and oldest-first, into a new `context/feature-history.md` that **nothing `@`-imports**. Leave `current-feature.md` with Status / Goals / Notes only, plus a one-line pointer to the history file.
- **Update every place that writes or reads History** so new entries go to the new file:
  - `.claude/skills/feature/SKILL.md`: the "File Structure" section lists `## History`
  - `.claude/skills/feature/actions/complete.md` step 4: "Add feature summary to the END of History"
  - `.claude/skills/cleanup/SKILL.md` item 1: checks that the history in `current-feature.md` is ordered
  - `context/ai-interaction.md` workflow step 10: "Mark as completed … and add to history"
- **Keep new entries short:** change `complete.md` so a history entry is **one line** (date, **name**, a one-sentence summary). The detail already lives in the spec under `context/features/` / `context/fixes/` and in git history, so the entry should point there rather than repeat it.
- **Check:** `wc -c context/current-feature.md` is under ~1 KB afterwards, and `/feature load` → `complete` still works on a test run (or a careful read-through of the action files).

## Notes

- Don't summarise or rewrite the existing entries while moving them. A plain move is lossless and keeps the diff easy to review. Shortening older entries is optional and can be a separate pass.
- `@context/current-feature.md` is also imported inside the `feature` skill's `SKILL.md`. Once History is gone that costs very little, so leave it unless it turns out to load the file twice.
- Also look at the other `@`-imports in `CLAUDE.md` (`project-overview.md` ~13 KB and the rest) to check that each one needs to load in every session, but the history file is the main cost.
