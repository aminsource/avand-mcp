import { describe, expect, it, vi } from "vitest";
import { createAuthSession } from "../src/auth.js";

const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("Avand token refresh", () => {
  it("encodes refresh token as the frontend query and caches the access token", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const requestUrl = new URL(String(url));
      expect(requestUrl.pathname).toBe("/api/auth/refresh-access-token");
      expect(JSON.parse(Buffer.from(requestUrl.searchParams.get("query")!, "base64url").toString())).toEqual({ refreshToken: "refresh-1" });
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("{}");
      return reply({ errorCode: 200, access_token: "access-1", refresh_token: "refresh-2" });
    });
    const auth = createAuthSession({ baseUrl: "https://example.test/api", refreshToken: "refresh-1", fetchImpl: fetchImpl as typeof fetch });
    expect(await auth.getAccessToken()).toBe("access-1");
    expect(await auth.getAccessToken()).toBe("access-1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("shares concurrent refresh and uses the rotated refresh token next time", async () => {
    const used: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const token = JSON.parse(Buffer.from(new URL(String(url)).searchParams.get("query")!, "base64url").toString()).refreshToken;
      used.push(token);
      return reply({ errorCode: 200, access_token: `access-${used.length}`, refresh_token: `refresh-${used.length + 1}` });
    });
    const auth = createAuthSession({ baseUrl: "https://example.test/api", refreshToken: "refresh-1", fetchImpl: fetchImpl as typeof fetch });
    expect(await Promise.all([auth.getAccessToken(), auth.getAccessToken()])).toEqual(["access-1", "access-1"]);
    expect(await auth.refresh()).toBe("access-2");
    expect(used).toEqual(["refresh-1", "refresh-2"]);
  });

  it("rejects a failed refresh without exposing the token", async () => {
    const auth = createAuthSession({ baseUrl: "https://example.test/api", refreshToken: "private", fetchImpl: async () => reply({ message: "private" }, 401) });
    await expect(auth.getAccessToken()).rejects.toThrow("Avand authentication failed");
  });
});
