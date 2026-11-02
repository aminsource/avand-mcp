export type ToolResult = { content: Array<{ type: "text"; text: string }> };

export function result(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function toText(content: unknown): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  return JSON.stringify(content, null, 2);
}

export function unwrap(data: unknown): unknown {
  return (data as { data?: unknown })?.data ?? data;
}

export function errResult(res: { error: string; status?: number; body?: unknown }): ToolResult {
  return result(toText({ error: res.error, status: res.status, body: res.body }));
}
