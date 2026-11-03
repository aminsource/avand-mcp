# Avand MCP Server

A standalone TypeScript MCP server that exposes a small set of read-only Avand APIs to MCP clients. It follows the `podicom-mcp` layout: one process runs a local authentication proxy and an MCP server over stdio. API paths and request encoding come from `new-avand-frontend`.

## Requirements

- Node.js 18 or newer
- Authorized Avand refresh token and business entity ID
- Avand backend URL (`REACT_APP_SERVER_ADDRESS` in the frontend)

## Setup

```bash
npm install
cp .env.example .env
npm run build
npm start
```

Set `AVAND_BASE_URL`, `AVAND_REFRESH_TOKEN`, and `AVAND_BUSINESS_ENTITY_ID` in `.env`. You can also set `AVAND_ACCESS_TOKEN` to use an existing access token until it expires. `AVAND_PROXY_PORT` is optional; the default chooses a free local port. Keep `.env` out of version control.

For development, run `npm run dev`. Run tests with `npm test`.

## Tools

| Tool | Action | Parameters | Avand endpoint |
| --- | --- | --- | --- |
| `transactions` | `list` | `pageNum`, `pageSize` | `GET invoice` |
| `merchants` | `list` | `pageNum`, `pageSize`, optional `queryName` | `GET merchant/brief` |
| `organizations` | `list` | `pageNum`, `pageSize`, optional `queryName` | `GET organization/brief` |

Pages start at 0 and `pageSize` is limited to 20. The server returns the Avand response's `data` field when present, or the full response otherwise, as MCP text.

## Authentication and request flow

1. `src/index.ts` loads `.env` and starts `src/proxy.ts`, then `src/mcp-server.ts`.
2. A tool in `src/tools/` calls `proxyFetch()` in `src/proxyClient.ts`.
3. The proxy asks `src/auth.ts` for an access token. Without an initial access token, it posts `{}` to `auth/refresh-access-token` with the refresh token in a Base64URL encoded JSON `query` parameter, matching the frontend.
4. `src/backend.ts` sends the request with a bearer token and `business-entity-id` header. It sends tool parameters in the same encoded `query` format as the frontend.
5. On HTTP 401 or Avand `errorCode: 401`, it refreshes the access token and retries the read request once. A rotated refresh token is retained in memory until the process exits.

The proxy listens only on `127.0.0.1`. On restart, supply the current refresh token if Avand rotated it. The three endpoints and response shapes are covered by local tests with sample responses; confirm them against an authorized development API before relying on live data.

## Agent setup: Codex and Hermes

Build first, then point the client at the absolute path to `dist/index.js`. The server loads the project-root `.env` itself, so credentials do not need to be repeated in client configuration. `AGENTS.md` contains the shared usage and development instructions for agents working in this repository.

### Codex

Run from this project directory:

```bash
codex mcp add avand -- node "$(pwd)/dist/index.js"
codex mcp get avand
```

Or add the equivalent entry to `~/.codex/config.toml`:

```toml
[mcp_servers.avand]
command = "node"
args = ["/absolute/path/to/avand-mcp/dist/index.js"]
```

Restart Codex after changing the configuration. The tools appear as `organizations`, `merchants`, and `transactions` under the Avand MCP server.

### Hermes Agent

Add this entry under `mcp_servers` in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  avand:
    command: node
    args:
      - /absolute/path/to/avand-mcp/dist/index.js
    enabled: true
```

Merge this with an existing `mcp_servers` section rather than adding a second one. Restart Hermes after changing the configuration. Hermes exposes the deferred tools as `mcp__avand__organizations`, `mcp__avand__merchants`, and `mcp__avand__transactions`.

### Example tool calls

List the first page of organizations:

```json
{"action":"list","pageNum":0,"pageSize":20}
```

Pass that object to the `organizations` tool. For a name search, pass `queryName` to `organizations` or `merchants`. Continue with subsequent page numbers when `totalCount` exceeds the returned page size. The `transactions` tool accepts only pagination. These tools read data; they do not create or update records.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Server fails at startup | `dist/index.js` exists and all three required `.env` values are set. |
| No tools appear | Rebuild, check the absolute path in client configuration, and restart the client. |
| Authentication fails | Use a current refresh token from an authorized Avand login; restart after updating `.env`. |
| Empty or unexpected results | Check the selected `AVAND_BUSINESS_ENTITY_ID`, filter, and page number. |
| Only part of a list appears | Fetch pages until the returned count reaches `totalCount`. |
