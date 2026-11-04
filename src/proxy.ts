import express, { type Request, type Response } from "express";
import { createAuthSession } from "./auth.js";
import { createBackendClient } from "./backend.js";

let proxyPort: number | null = null;

function getConfig() {
  const baseUrl = process.env.AVAND_BASE_URL;
  const refreshToken = process.env.AVAND_REFRESH_TOKEN;
  const businessEntityId = process.env.AVAND_BUSINESS_ENTITY_ID;
  if (!baseUrl || !refreshToken || !businessEntityId) {
    throw new Error("AVAND_BASE_URL, AVAND_REFRESH_TOKEN, and AVAND_BUSINESS_ENTITY_ID are required");
  }
  const configuredPort = Number(process.env.AVAND_PROXY_PORT ?? "0");
  if (!Number.isInteger(configuredPort) || configuredPort < 0 || configuredPort > 65535) {
    throw new Error("AVAND_PROXY_PORT must be an integer from 0 to 65535");
  }
  return { baseUrl, refreshToken, businessEntityId, configuredPort };
}

export function startProxy(): Promise<{ port: number; close: () => Promise<void> }> {
  const config = getConfig();
  const auth = createAuthSession({
    baseUrl: config.baseUrl,
    refreshToken: config.refreshToken,
    accessToken: process.env.AVAND_ACCESS_TOKEN,
  });
  const backend = createBackendClient({ baseUrl: config.baseUrl, businessEntityId: config.businessEntityId, auth });
  const app = express();
  app.get("/proxy/*path", async (req: Request, res: Response) => {
    try {
      const path = req.path.replace(/^\/proxy\//, "");
      const params: Record<string, unknown> = {
        pageNum: Number(req.query.pageNum ?? 0),
        pageSize: Number(req.query.pageSize ?? 10),
      };
      if (typeof req.query.queryName === "string") params.queryName = req.query.queryName;
      if (!Number.isInteger(params.pageNum) || (params.pageNum as number) < 0 ||
          !Number.isInteger(params.pageSize) || (params.pageSize as number) < 1 || (params.pageSize as number) > 20 ||
          (typeof params.queryName === "string" && params.queryName.length > 100)) {
        res.status(400).json({ error: "Invalid pagination or filter" });
        return;
      }
      // Forward all additional filter query params (validated allowlist) to the Avand backend.
      const BOOL_FILTERS = new Set(["enabled", "hasBroker", "queryHasAgreement", "isPayed", "isCanceled", "isClosed"]);
      const ALLOWED_FILTERS = new Set([
        "state", "city", "enabled", "hasBroker", "queryHasAgreement", "fromCreatedAt", "toCreatedAt",
        "fromDate", "toDate", "isPayed", "isCanceled", "isClosed", "organizationId", "merchantId",
        "brokerId", "fromAmount", "toAmount", "transactionType", "customerNationalCode", "cardNumber",
        "customerFirstName", "customerLastName", "merchantCode", "terminalId", "billNumber", "id",
      ]);
      for (const [key, value] of Object.entries(req.query)) {
        if (!ALLOWED_FILTERS.has(key)) continue;
        if (value === undefined) continue;
        if (BOOL_FILTERS.has(key)) {
          // The backend receives params as base64-encoded JSON, so booleans must be real booleans.
          if (value === "true") params[key] = true;
          else if (value === "false") params[key] = false;
          continue;
        }
        if (typeof value === "string") {
          if (value.length > 100) { res.status(400).json({ error: `Filter ${key} too long` }); return; }
          params[key] = value;
        } else if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
          params[key] = value.filter((v) => v.length <= 100);
        }
      }
      res.json(await backend.get(path, params));
    } catch (error) {
      res.status(502).json({ error: "Avand request failed" });
    }
  });
  return new Promise((resolve, reject) => {
    const server = app.listen(config.configuredPort, "127.0.0.1");
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Cannot determine proxy port"));
      proxyPort = address.port;
      resolve({ port: address.port, close: () => new Promise<void>((done, fail) => server.close((error) => error ? fail(error) : done())) });
    });
  });
}

export function getProxyBaseUrl(): string {
  if (proxyPort === null) throw new Error("Avand proxy has not started");
  return `http://127.0.0.1:${proxyPort}`;
}
