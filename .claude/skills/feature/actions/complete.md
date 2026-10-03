# Complete Action

1. Stage all changes and commit with a descriptive message
2. Switch to main and merge the feature branch (no push yet)
3. Delete the local feature branch
4. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear the Status, Goals and Notes sections; leave the `## History` pointer line as it is
   - Append ONE line to the END of `context/feature-history.md` (never to current-feature.md):
     `- YYYY-MM-DD: **Feature Name** - one-sentence summary (spec: context/features/<file>.md)`
     Keep it to a single sentence. The detail is in the spec and in git history, so don't repeat it; mention anything left open or deferred in a few words at most. Omit the spec reference for an inline feature that had no spec file
5. Commit the reset: `chore: reset current-feature.md after completing [feature]`
6. Push main to origin ONCE (single push with all changes)
7. If feature branch was previously pushed, delete it from origin