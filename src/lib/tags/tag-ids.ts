import { normalizeUuidIds, readUuidIdsFromRow } from '@/lib/ids/uuid-list';

/** @deprecated use normalizeUuidIds — kept for tag call sites */
export function normalizeTagIds(tagIds?: unknown, tagId?: unknown): string[] {
    return normalizeUuidIds(tagIds, tagId);
}

export function readTagIdsFromRow(item: Record<string, unknown>): string[] {
    return readUuidIdsFromRow(item, 'tag_ids');
}

export function normalizeProjectIds(projectIds?: unknown, projectId?: unknown): string[] {
    return normalizeUuidIds(projectIds, projectId);
}

export function readProjectIdsFromRow(item: Record<string, unknown>): string[] {
    return readUuidIdsFromRow(item, 'project_ids');
}
