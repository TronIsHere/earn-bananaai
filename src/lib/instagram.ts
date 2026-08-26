const HANDLE_RE = /^[a-z0-9._]{2,30}$/i;

/** Strip @, profile URLs, trailing slashes. Returns lowercase handle or "". */
export function normalizeInstagramHandle(raw: string): string {
  let value = raw.trim();
  if (!value) return "";

  value = value.replace(/^@+/, "");
  value = value.replace(/^https?:\/\//i, "");
  value = value.replace(/^(www\.)?instagram\.com\//i, "");
  value = value.split(/[/?#]/)[0] ?? "";
  return value.replace(/\/+$/, "").toLowerCase();
}

export function isValidInstagramHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

export function instagramProfileUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}
