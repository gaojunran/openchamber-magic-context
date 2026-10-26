# Design notes

The panel is an inspector for one session's Magic Context state, not a dashboard clone. The rules below are what the implementation follows. The development checkout keeps a full mock and screenshot set; they are not published because they were generated from a real local database.

## One number per view

The context window is the only hero number: `22.5%`, with the used and total tokens beside it. Everything else is a 13px label/value row or a 12px mono number. Token counts are quantities; memory and note counts are cardinalities. They do not share a column, a type size, or a badge style.

## Composition is data, not decoration

The nine RPC components are shown as six readable rows; `Conversation & tools` expands into conversation, tool calls, and tool definitions. The three-band bar is a regrouping of those rows, not a ninth source of truth. The sum is asserted in the service, so a mismatch is a bug, not a rounding artifact.

The Magic Context share is the only accented segment because it is the part a user can act on.

## Flat surfaces, host type

There is no second palette. The panel uses the host tokens injected by `applyHostReady` and the `@openchamber/sdk/ui` primitives for tabs, search, banners, empty states, and separators. Custom CSS is limited to layout, the composition bar, list rows, and the detail pane.

Rows are flat: 1px hairline at 12% of `--surface-foreground`, 10px vertical padding in Memories, 14px group spacing in Notes. No cards, shadows, or per-row backgrounds.

## Width ladder

- `≤ 419px`: the header wraps; the source word and refresh stay visible. Tab counts are hidden, labels remain.
- `420–639px`: single column, master/detail replaces the list.
- `≥ 640px`: two columns; the list keeps a stable width and the detail gets the rest.

Filter buttons collapse to icons only in the split view, where a labelled button would eat the search field. The accessible name keeps the full label.

## States are part of the contract

Every source has `ready`, `partial`, `stale`, or `unavailable` with a reason. The panel never renders a failed source as zero or as an empty success.

- **No project session** — an explanatory empty state, not an error.
- **No usage sample** — the composition can still render; the hero says there is no current sample.
- **Stale `session_meta`** — labelled as `Last sample`, with its age.
- **Schema drift** — affected sources become `partial`; the footer shows both versions.
- **Missing database / unreachable RPC** — a banner with the reason and a retry.

## Notes are not a filter dimension

Dismissed notes are a different status, not a query filter. They live behind `Show N dismissed notes` inside the Notes view, so the active list never mixes with retired content. Smart notes show their condition; session notes show their session.

## Text

The body parser handles only `#` headings, `**bold**`, and `` `code` ``. Real memory text often contains other markdown; rendering it literally is better than emitting half-parsed HTML. Everything is escaped first.

All user-facing strings live in `panel/i18n/{en,zh-CN}.ts` with the same key set. The panel picks `zh-CN` for any `zh*` locale and falls back to English.
