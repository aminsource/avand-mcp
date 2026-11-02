# CLAUDE.md

This TypeScript MCP server exposes a small, read-only subset of Avand APIs. See `README.md` for setup, client configuration, and tool parameters.

## Commands

```bash
npm run dev
npm run build
npm start
npm test
```

## Request flow

1. `src/index.ts` loads `.env` and starts the local proxy, then the MCP stdio server.
2. `src/mcp-server.ts` registers domain tools from `src/tools/`.
3. Tools use `src/url.ts` and `src/proxyClient.ts` to call the local proxy.
4. `src/proxy.ts` forwards allowed GET requests through `src/backend.ts`.
5. `src/auth.ts` obtains and caches a bearer access token from the Avand refresh endpoint. It keeps a rotated refresh token in memory and refreshes after a body-level or HTTP 401.

## Conventions

- The API base URL corresponds to the frontend's `REACT_APP_SERVER_ADDRESS`. Request filters use Base64URL encoded JSON in the `query` parameter.
- Keep the proxy bound to `127.0.0.1` and the endpoint allowlist in `src/backend.ts` aligned with registered tools.
- Keep credentials out of source control and logs. Use `.env.example` as the configuration template.
- Use `.js` extensions in local ESM imports from TypeScript files.
- Run `npm test` and `npm run build` after changing authentication, request handling, or tools.
