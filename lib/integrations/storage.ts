const SIGNED_URL_SECONDS = 900;

export function storageObjectPath(keys: unknown, bookId: string): string {
  const map = (keys ?? {}) as Record<string, string>;
  return (map.a5 ?? `playbooks/${bookId}-a5.pdf`).replace(/^\/+/, "");
}

export async function signedPdfUrl(objectPath: string): Promise<string | null> {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "playbooks";
  if (!base || !key) return null;
  const response = await fetch(`${base}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }), signal: AbortSignal.timeout(10000), cache: "no-store",
  });
  if (!response.ok) return null;
  const json = await response.json() as { signedURL?: string };
  if (!json.signedURL) return null;
  const url = new URL(json.signedURL.startsWith("http") ? json.signedURL : `${base}/storage/v1${json.signedURL}`);
  return url.origin === new URL(base).origin && url.protocol === "https:" ? url.toString() : null;
}
