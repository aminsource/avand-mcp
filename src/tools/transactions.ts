import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { proxyFetch } from "../proxyClient.js";
import { buildBackendPath } from "../url.js";
import { result, toText, unwrap, errResult, type ToolResult } from "./helpers.js";

const schema = z.object({
  action: z.literal("list"),
  pageNum: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(20).default(10),
  fromDate: z.string().max(30).optional(),
  toDate: z.string().max(30).optional(),
  isPayed: z.boolean().optional(),
  isCanceled: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  organizationId: z.string().max(50).optional(),
  merchantId: z.string().max(50).optional(),
  brokerId: z.string().max(50).optional(),
  fromAmount: z.string().max(20).optional(),
  toAmount: z.string().max(20).optional(),
  transactionType: z.string().max(30).optional(),
  customerNationalCode: z.string().max(15).optional(),
  cardNumber: z.string().max(25).optional(),
  customerFirstName: z.string().max(60).optional(),
  customerLastName: z.string().max(60).optional(),
  merchantCode: z.string().max(20).optional(),
  terminalId: z.string().max(20).optional(),
  billNumber: z.string().max(20).optional(),
  id: z.string().max(20).optional(),
  state: z.string().max(50).optional(),
  city: z.string().max(50).optional(),
});

type Params = z.infer<typeof schema>;

const FILTER_KEYS = [
  "fromDate", "toDate", "isPayed", "isCanceled", "isClosed",
  "organizationId", "merchantId", "brokerId", "fromAmount", "toAmount",
  "transactionType", "customerNationalCode", "cardNumber",
  "customerFirstName", "customerLastName", "merchantCode", "terminalId",
  "billNumber", "id", "state", "city",
] as const;

export async function handle(params: Params): Promise<ToolResult> {
  const searchParams: Record<string, string | number | boolean> = { pageNum: params.pageNum, pageSize: params.pageSize };
  for (const key of FILTER_KEYS) {
    const value = params[key];
    if (value !== undefined) searchParams[key] = value;
  }
  const res = await proxyFetch(buildBackendPath("invoice"), { searchParams });
  return res.ok ? result(toText(unwrap(res.data))) : errResult(res);
}

export function register(server: McpServer): void {
  server.registerTool("transactions", {
    description:
      "List Avand transactions with optional filters: fromDate/toDate (Jalali 'YYYY/MM/DD HH:mm' as sent by the Avand frontend), isPayed, isCanceled, isClosed, fromAmount/toAmount, organizationId, merchantId, brokerId, transactionType, cardNumber, customerNationalCode, customerFirstName/customerLastName, merchantCode, terminalId, billNumber, id (invoice number), state, city.",
    inputSchema: schema,
  }, handle);
}
