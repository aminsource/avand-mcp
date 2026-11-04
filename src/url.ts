const PATHS = new Set(["invoice", "merchant", "merchant/brief", "organization", "organization/brief"]);

export function buildBackendPath(path: string): string {
  if (!PATHS.has(path)) throw new Error("Invalid Avand path");
  return `/${path}`;
}
