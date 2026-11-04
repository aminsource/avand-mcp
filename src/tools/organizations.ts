import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { proxyFetch } from "../proxyClient.js";
import { buildBackendPath } from "../url.js";
import { result, toText, unwrap, errResult, type ToolResult } from "./helpers.js";

const schema = z.object({
  action: z.literal("list"),
  pageNum: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(20).default(10),
  queryName: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  city: z.string().max(50).optional(),
  enabled: z.boolean().optional(),
  hasBroker: z.boolean().optional(),
  queryHasAgreement: z.boolean().optional(),
  fromCreatedAt: z.number().int().optional(),
  toCreatedAt: z.number().int().optional(),
});

type Params = z.infer<typeof schema>;

export async function handle(params: Params): Promise<ToolResult> {
  const searchParams: Record<string, string | number | boolean> = { pageNum: params.pageNum, pageSize: params.pageSize };
  for (const key of ["queryName", "state", "city", "enabled", "hasBroker", "queryHasAgreement", "fromCreatedAt", "toCreatedAt"] as const) {
    const value = params[key];
    if (value !== undefined) searchParams[key] = value;
  }
  // Full endpoint supports all filters; fall back to brief when no filter beyond pagination/queryName is set.
  const hasFullFilters = ["state", "city", "enabled", "hasBroker", "queryHasAgreement", "fromCreatedAt", "toCreatedAt"].some(
    (k) => params[k as keyof Params] !== undefined
  );
  const path = hasFullFilters ? "organization" : "organization/brief";
  const res = await proxyFetch(buildBackendPath(path), { searchParams });
  return res.ok ? result(toText(unwrap(res.data))) : errResult(res);
}

export function register(server: McpServer): void {
  server.registerTool("organizations", {
    description:
      "List Avand organizations. Full filters (state, city, enabled, hasBroker, queryHasAgreement, fromCreatedAt, toCreatedAt) use the detailed 'organization' endpoint; otherwise the brief endpoint is used.",
    inputSchema: schema,
  }, handle);
}
