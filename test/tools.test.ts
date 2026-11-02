import { beforeEach, describe, expect, it, vi } from "vitest";
import { handle as transactions } from "../src/tools/transactions.js";
import { handle as merchants } from "../src/tools/merchants.js";
import { handle as organizations } from "../src/tools/organizations.js";
import { proxyFetch } from "../src/proxyClient.js";

vi.mock("../src/proxyClient.js", () => ({ proxyFetch: vi.fn() }));
const mockedFetch = vi.mocked(proxyFetch);

beforeEach(() => mockedFetch.mockReset());

describe("Avand MCP tools", () => {
  it("fetches transactions with bounded pagination", async () => {
    mockedFetch.mockResolvedValue({ ok: true, data: { errorCode: 200, data: { result: [{ id: 1 }], totalCount: 1 } }, status: 200 });
    const result = await transactions({ action: "list", pageNum: 0, pageSize: 10 });
    expect(mockedFetch).toHaveBeenCalledWith("/invoice", { searchParams: { pageNum: 0, pageSize: 10 } });
    expect(result.content[0].text).toContain('"totalCount": 1');
  });

  it("fetches merchant and organization briefs", async () => {
    mockedFetch.mockResolvedValue({ ok: true, data: { errorCode: 200, data: { result: [], totalCount: 0 } }, status: 200 });
    await merchants({ action: "list", pageNum: 0, pageSize: 5, queryName: "Acme" });
    await organizations({ action: "list", pageNum: 0, pageSize: 5, queryName: "Acme" });
    expect(mockedFetch.mock.calls.map(([path]) => path)).toEqual(["/merchant/brief", "/organization/brief"]);
  });
});
