import { describe, expect, it, vi } from "vitest";
import { createBackendClient } from "../src/backend.js";

const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

const auth = () => ({ getAccessToken: vi.fn(async () => "old"), refresh: vi.fn(async () => "new") });

describe("Avand backend requests", () => {
  it("sends encoded filters and organization header", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/api/invoice");
      expect(JSON.parse(Buffer.from(u.searchParams.get("query")!, "base64url").toString())).toEqual({ pageNum: 1, pageSize: 10 });
      expect(init?.headers).toMatchObject({ Authorization: "bearer old", "business-entity-id": "org-1" });
      return reply({ errorCode: 200, data: { result: [] } });
    });
    const backend = createBackendClient({ baseUrl: "https://example.test/api", businessEntityId: "org-1", auth: auth(), fetchImpl: fetchImpl as typeof fetch });
    expect(await backend.get("invoice", { pageNum: 1, pageSize: 10 })).toEqual({ errorCode: 200, data: { result: [] } });
  });

  it("refreshes and retries after body-level 401", async () => {
    const session = auth();
    const fetchImpl = vi.fn().mockResolvedValueOnce(reply({ errorCode: 401 })).mockResolvedValueOnce(reply({ errorCode: 200, data: { result: [] } }));
    const backend = createBackendClient({ baseUrl: "https://example.test/api", businessEntityId: "org-1", auth: session, fetchImpl });
    await backend.get("invoice", {});
    expect(session.refresh).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe("bearer new");
  });

  it("rejects unapproved paths", async () => {
    const backend = createBackendClient({ baseUrl: "https://example.test/api", businessEntityId: "org-1", auth: auth(), fetchImpl: vi.fn() });
    await expect(backend.get("https://evil.test", {})).rejects.toThrow("Invalid Avand path");
  });
});
