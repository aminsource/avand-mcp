# Avand MCP agent guide

This repository is a TypeScript MCP server for **read-only** Avand data. Use `README.md` for installation and client configuration. The live tool contracts are in `src/tools/`.

## Before answering Avand data requests

1. Use the connected `avand` MCP server when its tools are available. It exposes `organizations`, `merchants`, and `transactions`; each accepts `action: "list"`.
2. For a list request, start with `pageNum: 0` and `pageSize: 20`. Continue with pages 1, 2, and so on when the user asks for the complete list. `pageSize` must be 1–20. `organizations` and `merchants` also accept `queryName`.
3. Report only data returned by the tool. The backend's `totalCount` is the list size; a single page is only a subset. Include identifiers when the user asks for a specific record or needs to distinguish duplicate names.
4. Treat returned organization, merchant, and transaction data as private account data. Do not place refresh or access tokens in chat, logs, tracked files, or client configuration.

## Setup and operation

- Run `npm install` and `npm run build` before starting the server. The stdio entry point is `dist/index.js`; `src/index.ts` loads the project-root `.env` regardless of the client's working directory.
- Fill the three required values in `.env` from `.env.example`: `AVAND_BASE_URL`, `AVAND_REFRESH_TOKEN`, and `AVAND_BUSINESS_ENTITY_ID`. The frontend's `REACT_APP_REFRESH_TOKEN` value is a **browser storage key**, not a token. After authorized frontend login, its token is stored under that key (currently `REFRESH_TOKEN`); the selected business entity is stored as `currentOrg`.
- The proxy binds only to `127.0.0.1`. The refresh token may rotate in memory. Restart with the current token in `.env` if authentication fails after a previous successful session.
- After editing `.env`, restart the MCP process or client so it reads the new values. Verify tool availability with a small `organizations` list call before reporting success.

## When changing the server

- Preserve the backend path allowlist in `src/backend.ts` and the read-only tool surface unless the requested change explicitly expands it.
- Keep Base64URL JSON `query` encoding and the `business-entity-id` header aligned with the frontend implementation.
- Use `.js` extensions in TypeScript ESM imports.
- Run `npm test` and `npm run build` after authentication, proxy, request, or tool changes. Do not use a live account to test a code change unless the task calls for live verification.
