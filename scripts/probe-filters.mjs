import "dotenv/config";
import { createAuthSession } from "../dist/auth.js";
import { createBackendClient } from "../dist/backend.js";

const baseUrl = process.env.AVAND_BASE_URL;
const auth = createAuthSession({ baseUrl, refreshToken: process.env.AVAND_REFRESH_TOKEN, accessToken: process.env.AVAND_ACCESS_TOKEN });
const backend = createBackendClient({ baseUrl, businessEntityId: process.env.AVAND_BUSINESS_ENTITY_ID, auth });

for (const [label, path, params] of [
  ["org full enabled=false", "organization", { pageNum: 0, pageSize: 5, enabled: false }],
  ["org full no filter", "organization", { pageNum: 0, pageSize: 5 }],
  ["org brief enabled=false", "organization/brief", { pageNum: 0, pageSize: 5, enabled: false }],
]) {
  try {
    const r = await backend.get(path, params);
    const s = JSON.stringify(r);
    console.log(label, "=>", s.slice(0, 200));
  } catch (e) {
    console.log(label, "=> ERROR:", e && e.message ? e.message : String(e).slice(0, 300));
    if (e && e.status) console.log("  status:", e.status);
    if (e && e.body) console.log("  body:", JSON.stringify(e.body).slice(0, 300));
  }
}
process.exit(0);
