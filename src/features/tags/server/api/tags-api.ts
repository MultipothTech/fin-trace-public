import { apiFetch } from '@/lib/http/axios-client';
import type { TagItem, TagInput } from '@/features/subscriptions/types/subscription.types';

export async function getTags(): Promise<TagItem[]> {
    return apiFetch<TagItem[]>('/tags');
}

/** Search tags with ILIKE (name_en / name_th) */
export async function searchTags(q: string): Promise<TagItem[]> {
    const query = q.trim();
    if (!query) return getTags();
    return apiFetch<TagItem[]>(`/tags?q=${encodeURIComponent(query)}`);
}

export async function createTag(input: TagInput): Promise<TagItem> {
    return apiFetch<TagItem>('/tags', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function updateTag(
    id: string,
    input: Partial<TagInput>
): Promise<TagItem> {
    return apiFetch<TagItem>(`/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export async function deleteTag(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/tags/${id}`, {
        method: 'DELETE',
    });
}
