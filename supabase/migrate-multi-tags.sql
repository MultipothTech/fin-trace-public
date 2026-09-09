-- ===================================================================
-- Multi-tags only: tag_ids UUID[] — drop legacy tag_id
-- Paste into Supabase SQL Editor
-- ===================================================================

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';

-- Migrate legacy single tag_id → tag_ids (if column still exists)
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_tag_ids ON subscriptions USING GIN (tag_ids);
CREATE INDEX IF NOT EXISTS idx_transactions_tag_ids ON transactions USING GIN (tag_ids);

-- Drop legacy tag_id
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tag_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tag_id_fkey;
DROP INDEX IF EXISTS idx_subscriptions_tag_id;
DROP INDEX IF EXISTS idx_transactions_tag_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS tag_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS tag_id;
