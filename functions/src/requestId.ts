function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractRequestId(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const requestId = extractRequestId(item, depth + 1);
      if (requestId) return requestId;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const key of ["requestId", "request_id"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(value)) {
    const requestId = extractRequestId(nestedValue, depth + 1);
    if (requestId) return requestId;
  }

  return null;
}
