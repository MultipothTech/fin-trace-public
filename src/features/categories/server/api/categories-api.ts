import { apiFetch } from '@/lib/http/axios-client';
import type { CategoryItem, CategoryInput } from '@/features/subscriptions/types/subscription.types';

/**
 * ดึงรายการหมวดหมู่ทั้งหมด
 */
export async function getCategories(): Promise<CategoryItem[]> {
    return apiFetch<CategoryItem[]>('/categories');
}

/**
 * สร้างหมวดหมู่ใหม่
 */
export async function createCategory(input: CategoryInput): Promise<CategoryItem> {
    return apiFetch<CategoryItem>('/categories', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

/**
 * แก้ไขหมวดหมู่
 */
export async function updateCategory(
    id: string,
    input: Partial<CategoryInput>
): Promise<CategoryItem> {
    return apiFetch<CategoryItem>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
}

/**
 * ลบหมวดหมู่
 */
export async function deleteCategory(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/categories/${id}`, {
        method: 'DELETE',
    });
}
