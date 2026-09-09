import { apiFetch } from '@/lib/http/axios-client';
import type { ProjectItem, ProjectInput } from '@/features/subscriptions/types/subscription.types';

export async function getProjects(): Promise<ProjectItem[]> {
    return apiFetch<ProjectItem[]>('/projects');
}

export async function searchProjects(q: string): Promise<ProjectItem[]> {
    const query = q.trim();
    if (!query) return getProjects();
    return apiFetch<ProjectItem[]>(`/projects?q=${encodeURIComponent(query)}`);
}

export async function createProject(input: ProjectInput): Promise<ProjectItem> {
    return apiFetch<ProjectItem>('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

export async function updateProject(
    id: string,
    input: Partial<ProjectInput>
): Promise<ProjectItem> {
    return apiFetch<ProjectItem>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/projects/${id}`, {
        method: 'DELETE',
    });
}
