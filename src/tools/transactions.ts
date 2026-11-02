import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { proxyFetch } from "../proxyClient.js";
import { buildBackendPath } from "../url.js";
import { result, toText, unwrap, errResult, type ToolResult } from "./helpers.js";

const schema = z.object({
  action: z.literal("list"),
  pageNum: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(20).default(10),
});

type Params = z.infer<typeof schema>;

export async function handle(params: Params): Promise<ToolResult> {
  const res = await proxyFetch(buildBackendPath("invoice"), { searchParams: { pageNum: params.pageNum, pageSize: params.pageSize } });
  return res.ok ? result(toText(unwrap(res.data))) : errResult(res);
}

export function register(server: McpServer): void {
  server.registerTool("transactions", { description: "List Avand transactions.", inputSchema: schema }, handle);
}
