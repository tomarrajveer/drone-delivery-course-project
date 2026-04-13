export function parseServerTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed) ? trimmed : `${trimmed}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatLocalDateTime(value: string | null | undefined, fallback = '—') {
  const parsed = parseServerTimestamp(value);
  return parsed ? parsed.toLocaleString() : fallback;
}

export function toCanonicalIso(value: string | null | undefined) {
  const parsed = parseServerTimestamp(value);
  return parsed ? parsed.toISOString() : null;
}
