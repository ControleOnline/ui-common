export function normalizeId(value) {
  if (value == null) return null;

  const match = String(value).match(/\d+/);
  return match?.[0] || null;
}

export function normalizeLanguageCode(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/_/g, "-").toLowerCase();
}

export function formatMessage(key) {
  if (!key) return "";

  return key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function resolveReferenceId(value) {
  if (value == null) return null;
  if (typeof value === "object") {
    return normalizeId(value.id ?? value["@id"] ?? value.iri);
  }
  return normalizeId(value);
}

export function isNonEmptyMessage(value) {
  return value != null && String(value).trim() !== "";
}
