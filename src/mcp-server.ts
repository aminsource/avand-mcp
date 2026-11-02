import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { register as registerTransactions } from "./tools/transactions.js";
import { register as registerMerchants } from "./tools/merchants.js";
import { register as registerOrganizations } from "./tools/organizations.js";

export async function runMcpServer(): Promise<void> {
  const server = new McpServer({ name: "avand-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });
  registerTransactions(server);
  registerMerchants(server);
  registerOrganizations(server);
  await server.connect(new StdioServerTransport());
  if (process.env.NODE_ENV !== "test") console.error("[avand-mcp] MCP server running on stdio");
}
