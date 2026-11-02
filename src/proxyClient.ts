import { getProxyBaseUrl } from "./proxy.js";

export type ProxyResponse<T = unknown> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status?: number; body?: unknown };

export async function proxyFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; searchParams?: Record<string, string | number> } = {}
): Promise<ProxyResponse<T>> {
  const { method = "GET", body, searchParams } = options;
  const url = new URL(`${getProxyBaseUrl()}/proxy${path.startsWith("/") ? path : `/${path}`}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url.toString(), init);
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      return {
        ok: false,
        error: (data as { message?: string; error?: string })?.message ?? (data as { error?: string })?.error ?? res.statusText,
        status: res.status,
        body: data,
      };
    }
    return { ok: true, data: data as T, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
