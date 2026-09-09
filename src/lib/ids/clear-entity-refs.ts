import type { SupabaseClient } from '@supabase/supabase-js';

type ArrayColumn = 'tag_ids' | 'project_ids';

async function stripIdFromArrayColumn(
    supabase: SupabaseClient,
    table: 'subscriptions' | 'transactions',
    userId: string,
    column: ArrayColumn,
    id: string
): Promise<void> {
    const { data, error } = await supabase
        .from(table)
        .select('id, tag_ids, project_ids')
        .eq('user_id', userId)
        .contains(column, [id]);

    if (error) {
        throw new Error(error.message);
    }
    if (!data?.length) return;

    for (const row of data as Array<{ id: string; tag_ids?: string[] | null; project_ids?: string[] | null }>) {
        const current = Array.isArray(row[column]) ? row[column]! : [];
        const next = current.filter((value) => value !== id);
        const { error: updateError } = await supabase
            .from(table)
            .update({ [column]: next })
            .eq('id', row.id)
            .eq('user_id', userId);

        if (updateError) {
            throw new Error(updateError.message);
        }
    }
}

/** Null out category_id on subscriptions / transactions before deleting a category. */
export async function clearCategoryReferences(
    supabase: SupabaseClient,
    userId: string,
    categoryId: string
): Promise<void> {
    for (const table of ['subscriptions', 'transactions'] as const) {
        const { error } = await supabase
            .from(table)
            .update({ category_id: null })
            .eq('user_id', userId)
            .eq('category_id', categoryId);

        if (error) {
            throw new Error(error.message);
        }
    }
}

/** Remove tag id from tag_ids arrays on subscriptions / transactions. */
export async function clearTagReferences(
    supabase: SupabaseClient,
    userId: string,
    tagId: string
): Promise<void> {
    await stripIdFromArrayColumn(supabase, 'subscriptions', userId, 'tag_ids', tagId);
    await stripIdFromArrayColumn(supabase, 'transactions', userId, 'tag_ids', tagId);
}

/** Remove project id from project_ids arrays on subscriptions / transactions. */
export async function clearProjectReferences(
    supabase: SupabaseClient,
    userId: string,
    projectId: string
): Promise<void> {
    await stripIdFromArrayColumn(supabase, 'subscriptions', userId, 'project_ids', projectId);
    await stripIdFromArrayColumn(supabase, 'transactions', userId, 'project_ids', projectId);
}
