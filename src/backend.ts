import type { AuthSession } from "./auth.js";

const ALLOWED_PATHS = new Set(["invoice", "merchant", "merchant/brief", "organization", "organization/brief"]);

export function createBackendClient(input: {
  baseUrl: string;
  businessEntityId: string;
  auth: AuthSession;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;

  async function get(path: string, params: Record<string, unknown>): Promise<unknown> {
    if (!ALLOWED_PATHS.has(path)) throw new Error("Invalid Avand path");
    if (!input.baseUrl || !input.businessEntityId) throw new Error("Avand backend is not configured");
    const url = new URL(`${input.baseUrl.replace(/\/$/, "")}/${path}`);
    url.searchParams.set("query", Buffer.from(JSON.stringify(params)).toString("base64url"));

    async function attempt(token: string): Promise<{ response: Response; payload: unknown }> {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `bearer ${token}`,
          "business-entity-id": input.businessEntityId,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });
      let payload: unknown;
      try { payload = await response.json(); } catch { throw new Error("Invalid Avand response"); }
      return { response, payload };
    }

    let { response, payload } = await attempt(await input.auth.getAccessToken());
    if (response.status === 401 || (payload as { errorCode?: number })?.errorCode === 401) {
      ({ response, payload } = await attempt(await input.auth.refresh()));
    }
    if (!response.ok || (payload as { errorCode?: number })?.errorCode !== 200) {
      throw new Error("Avand request failed");
    }
    return payload;
  }

  return { get };
}
