# Current Feature

Language Dropdown

## Status

In Progress

## Goals

- Replace the free-text Language input with a dropdown of the languages the code editor can highlight
- Move the Language field above the Content editor
- Selecting a language switches the editor's syntax highlighting immediately, while typing
- Applies to both the New Item dialog and the drawer's edit mode (shared `ItemFormFields`)

## Notes

- Code types only (Snippet, Command) — same rule as today's language field
- Options come from the Monaco ids already listed in `src/lib/code-language.ts`, with display labels; "Plain text" clears the language (stored as null)
- Existing items keep working: a stored alias (e.g. `bash`) preselects its option (`Shell`); an unknown stored value (e.g. `elixir`) is shown as its own option so editing an item never silently drops it
- The stored value is only rewritten when the user picks a different option
- No schema change — `Item.language` stays a free-text column

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
