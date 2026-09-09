/** Normalize / read UUID[] id lists (tags, projects, …) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeUuidIds(
    ids?: unknown,
    legacySingleId?: unknown
): string[] {
    const fromArray = Array.isArray(ids)
        ? ids.map((id) => String(id)).filter((id) => UUID_RE.test(id))
        : [];
    const fromSingle =
        legacySingleId && UUID_RE.test(String(legacySingleId))
            ? [String(legacySingleId)]
            : [];
    return [...new Set([...fromArray, ...fromSingle])];
}

export function readUuidIdsFromRow(
    item: Record<string, unknown>,
    column: string
): string[] {
    return normalizeUuidIds(item[column]);
}
