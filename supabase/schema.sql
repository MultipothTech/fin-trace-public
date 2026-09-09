-- ===================================================================
-- FinTrace Database Schema for Subscriptions & Categories (Supabase)
-- รันสคริปต์นี้ใน Supabase SQL Editor เพื่อสร้างตารางและ RLS Policies ทั้งหมด
-- ===================================================================

-- 1. สร้างตาราง categories สำหรับเก็บหมวดหมู่ที่ผู้ใช้สามารถ CRUD เองได้
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_th TEXT NOT NULL,
    icon TEXT DEFAULT 'MoreHorizontal',
    color TEXT DEFAULT 'text-zinc-400',
    bg TEXT DEFAULT 'bg-zinc-500/10',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.1 ตาราง tags สำหรับเก็บแท็กที่ผู้ใช้สร้างเอง
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

-- 1.2 ตาราง projects สำหรับเก็บโปรเจคที่ผู้ใช้สร้างเอง
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

-- 2. สร้างตาราง subscriptions สำหรับเก็บข้อมูลแพ็กเกจ/บิล
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'THB',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly')),
    custom_interval_days INT DEFAULT 1,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_billing_date DATE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tag_ids UUID[] DEFAULT '{}',
    project_ids UUID[] DEFAULT '{}',
    payment_method TEXT DEFAULT 'Credit Card',
    reminder_days INT NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. สร้างตาราง user_settings สำหรับเก็บข้อมูลการตั้งค่าแจ้งเตือน, ภาษา และ Dashboard Layout
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_enabled BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'th',
    dashboard_layout JSONB DEFAULT '[{"id":"urgent_banner","visible":true},{"id":"stat_cards","visible":true},{"id":"upcoming_renewals","visible":true},{"id":"category_breakdown","visible":true},{"id":"recent_history","visible":true}]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- 4. ตาราง transactions สำหรับเก็บบันทึกประวัติการจ่ายเงินบิล
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tag_ids UUID[] DEFAULT '{}',
    project_ids UUID[] DEFAULT '{}',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT DEFAULT '',
    payment_channel TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. สร้าง Indexes สำหรับเพิ่มความเร็วในการ Query
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date ASC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_category_id ON subscriptions(category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tag_ids ON subscriptions USING GIN (tag_ids);
CREATE INDEX IF NOT EXISTS idx_subscriptions_project_ids ON subscriptions USING GIN (project_ids);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tag_ids ON transactions USING GIN (tag_ids);
CREATE INDEX IF NOT EXISTS idx_transactions_project_ids ON transactions USING GIN (project_ids);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 7. ลบ Policies เก่า (ถ้ามี)
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own tags" ON tags;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can manage their own user_settings" ON user_settings;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;

-- 8. กำหนด Supabase Authorization RLS Policies
CREATE POLICY "Users can manage their own categories"
    ON categories FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own tags"
    ON tags FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own projects"
    ON projects FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own subscriptions"
    ON subscriptions FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own user_settings"
    ON user_settings FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own transactions"
    ON transactions FOR ALL
    USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- ===================================================================
-- Migration Helper: รันส่วนนี้หากมีตารางเดิมอยู่แล้วและต้องการอัปเดต
-- ===================================================================

-- A) สร้างตาราง tags + RLS
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

-- B) subscriptions / transactions: tag_ids only (no tag_id / tag TEXT)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tag_ids UUID[] DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'tag_id'
  ) THEN
    UPDATE subscriptions
    SET tag_ids = ARRAY[tag_id]
    WHERE tag_id IS NOT NULL AND (tag_ids IS NULL OR cardinality(tag_ids) = 0);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'tag_id'
  ) THEN
    UPDATE transactions
    SET tag_ids = ARRAY[tag_id]
    WHERE tag_id IS NOT NULL AND (tag_ids IS NULL OR cardinality(tag_ids) = 0);
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

-- C) category_id (ถ้ายังไม่ได้ย้าย)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'category'
  ) THEN
    UPDATE subscriptions s
    SET category_id = c.id
    FROM categories c
    WHERE s.category_id IS NULL
      AND s.category IS NOT NULL
      AND c.key = s.category
      AND (c.user_id = s.user_id OR c.user_id IS NULL OR c.is_system = true);
    ALTER TABLE subscriptions DROP COLUMN category;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'category'
  ) THEN
    UPDATE transactions t
    SET category_id = c.id
    FROM categories c
    WHERE t.category_id IS NULL
      AND t.category IS NOT NULL
      AND c.key = t.category
      AND (c.user_id = t.user_id OR c.user_id IS NULL OR c.is_system = true);
    ALTER TABLE transactions DROP COLUMN category;
  END IF;
END $$;

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_category_id_fkey;
ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE transactions
    ADD CONSTRAINT transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE subscriptions DROP COLUMN IF EXISTS icon;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS color;
