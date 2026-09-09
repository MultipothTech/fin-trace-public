-- ===================================================================
-- Paste into Supabase SQL Editor (existing DB)
-- tags table + tag_ids UUID[] (no single tag_id)
-- ===================================================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_th TEXT NOT NULL,
    color TEXT DEFAULT 'text-sky-400',
    bg TEXT DEFAULT 'bg-sky-500/10 border-sky-500/20',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own tags" ON tags;
CREATE POLICY "Users can manage their own tags"
    ON tags FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';

-- If old tag TEXT / tag_id existed, migrate then drop
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'tag_id'
  ) THEN
    UPDATE subscriptions
    SET tag_ids = ARRAY[tag_id]
    WHERE tag_id IS NOT NULL
      AND (tag_ids IS NULL OR cardinality(tag_ids) = 0);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'tag_id'
  ) THEN
    UPDATE transactions
    SET tag_ids = ARRAY[tag_id]
    WHERE tag_id IS NOT NULL
      AND (tag_ids IS NULL OR cardinality(tag_ids) = 0);
  END IF;
END $$;

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tag_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tag_id_fkey;
DROP INDEX IF EXISTS idx_subscriptions_tag_id;
DROP INDEX IF EXISTS idx_transactions_tag_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS tag_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS tag_id;

ALTER TABLE subscriptions DROP COLUMN IF EXISTS tag;
ALTER TABLE transactions DROP COLUMN IF EXISTS tag;

CREATE INDEX IF NOT EXISTS idx_subscriptions_tag_ids ON subscriptions USING GIN (tag_ids);
CREATE INDEX IF NOT EXISTS idx_transactions_tag_ids ON transactions USING GIN (tag_ids);
