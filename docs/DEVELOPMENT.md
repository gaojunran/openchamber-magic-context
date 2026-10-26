# Development

## Layout

```text
panel/          Solid 2 guest UI, bundled as one classic IIFE
  main.tsx      connectHost, ready/session/directory handshake
  App.tsx       chrome, tabs, banners, global keys
  state/        polling, request coalescing, selection, typed service calls
  views/        Overview, Memories, Notes
  components/   kit primitives, rows, filter popover, rich text
  i18n/         en + zh-CN dictionaries
  styles/       panel.css; app.css only holds #root/host glue
service/        host-managed ESM service
  main.ts       binds 127.0.0.1:$OPENCHAMBER_SERVICE_PORT
  server.ts     bearer auth, routing, source states
  db.ts         read-only node:sqlite queries
  project.ts    session_projects lookup + git-root fallback
  rpc.ts        Magic Context RPC discovery and allowlisted calls
```

`panel/main.js` and `service/main.js` are build artifacts and are committed so a git install works without running a build on the host.

## Build

```sh
bun install
bun run build       # panel IIFE + service ESM
bun run type-check
```

The panel needs Solid 2 RC and Vite 8. The service targets Node 22.5+ / Bun and imports `node:sqlite`.

## Data contract

The service exposes four read-only endpoints over the host's `serviceRequest` proxy:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | `{ ok, schema: { dbVersion, pluginSupportedVersion, compatible } }` |
| `GET /snapshot?sessionId&directory` | composition, usage, thresholds, cache, counts, per-source state |
| `GET /memories?projectPath&search&status&category&limit&offset` | paginated inventory; `status=active\|archived\|all` |
| `GET /notes?sessionId&projectPath&includeDismissed` | session and smart notes; dismissed only when asked |

`MAGIC_CONTEXT_DB` overrides the database path. Otherwise the service uses `~/.local/share/cortexkit/magic-context/context.db`.

Live data comes from Magic Context's private loopback RPC. Discovery reads its port file under the project hash directory, checks `/health` for a matching `pid` and `instance_id`, and allows only `status-detail` and `sidebar-snapshot`. Requests time out after 2s and responses are capped at 512 KB.

`session_meta` is a fallback only. It can lag the RPC, so its values are returned with `source: "session-meta"` and `stale: true`; the panel labels them as a last sample.

## Invariants

- `composition` fields add up to `inputTokens`; `server.ts` asserts this before responding.
- A failed source is `partial`/`unavailable` with a reason, never an empty list or zero.
- Memory counts distinguish `total`, `active`, and `archived`; `liveCounts.memories` is active-only.
- Notes counts always include `{ total, active, dismissed }`, even when a group is empty.
- The service never writes: SQLite is opened with `readOnly: true`, and only `GET` reaches the RPC.

## Verification

There is no test runner in this repository yet. The development checkout used three levels:

1. Service API: install, grant `service`, call `/health`, `/snapshot`, `/memories`, `/notes`; check the composition sum and the degraded states.
2. Panel runtime: a fake host frame answers the SDK handshake and proxies service calls to the running server; checks tabs, counts, filters, load more, dismissed reveal, keyboard, and zero console exceptions.
3. Real rail: install the folder, open a project session, click the rail icon, and compare the rendered text with the API payload. The guest iframe is an out-of-process iframe, so the panel is inspected through CDP's target session.

When changing the service contract, update `README.md`, `docs/DESIGN.md`, and this file together.
