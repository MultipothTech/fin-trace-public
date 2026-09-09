-- ===================================================================
-- Projects + project_ids on subscriptions / transactions
-- Paste into Supabase SQL Editor
-- ===================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_th TEXT NOT NULL,
    color TEXT DEFAULT 'text-violet-400',
    bg TEXT DEFAULT 'bg-violet-500/10 border-violet-500/20',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
CREATE POLICY "Users can manage their own projects"
    ON projects FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS project_ids UUID[] DEFAULT '{}';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS project_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_subscriptions_project_ids ON subscriptions USING GIN (project_ids);
CREATE INDEX IF NOT EXISTS idx_transactions_project_ids ON transactions USING GIN (project_ids);
