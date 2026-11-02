// Avand MCP entry point: starts the local proxy then the MCP server.
// Load .env from the project directory (next to the compiled script), not the
// process cwd — MCP clients spawn this server with an arbitrary working dir.
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env"), quiet: true });

async function main(): Promise<void> {
  const [{ startProxy }, { runMcpServer }] = await Promise.all([
    import("./proxy.js"),
    import("./mcp-server.js"),
  ]);

  await startProxy();
  await runMcpServer();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
