export type AuthSession = {
  getAccessToken(): Promise<string>;
  refresh(): Promise<string>;
};

export function createAuthSession(input: {
  baseUrl: string;
  refreshToken: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}): AuthSession {
  const fetchImpl = input.fetchImpl ?? fetch;
  let refreshToken = input.refreshToken;
  let accessToken = input.accessToken ?? "";
  let pending: Promise<string> | undefined;

  async function performRefresh(): Promise<string> {
    if (!input.baseUrl || !refreshToken) throw new Error("Avand authentication is not configured");
    const url = new URL(`${input.baseUrl.replace(/\/$/, "")}/auth/refresh-access-token`);
    url.searchParams.set("query", Buffer.from(JSON.stringify({ refreshToken })).toString("base64url"));
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("refresh failed");
      const body = await response.json() as Record<string, unknown>;
      if (body.errorCode !== undefined && body.errorCode !== 200) throw new Error("refresh failed");
      if (typeof body.access_token !== "string" || !body.access_token ||
          typeof body.refresh_token !== "string" || !body.refresh_token) throw new Error("invalid refresh response");
      accessToken = body.access_token;
      refreshToken = body.refresh_token;
      return accessToken;
    } catch {
      throw new Error("Avand authentication failed");
    }
  }

  function refresh(): Promise<string> {
    if (!pending) pending = performRefresh().finally(() => { pending = undefined; });
    return pending;
  }

  return {
    getAccessToken: () => accessToken ? Promise.resolve(accessToken) : refresh(),
    refresh,
  };
}
