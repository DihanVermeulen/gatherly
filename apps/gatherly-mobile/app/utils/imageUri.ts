/**
 * Returns true only for URIs that are safe to render in a React Native Image.
 * Allowed schemes: https:// and data:image/ (base64 embedded images)
 * Rejects: http://, file://, javascript:, content://, and anything else.
 */
export function isSafeImageUri(uri: string | null | undefined): uri is string {
  if (!uri || typeof uri !== "string") return false;
  return uri.startsWith("https://") || uri.startsWith("data:image/");
}
