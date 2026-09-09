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
    category TEXT NOT NULL DEFAULT 'entertainment',
    payment_method TEXT DEFAULT 'Credit Card',
    reminder_days INT NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    icon TEXT DEFAULT '',
    color TEXT DEFAULT '',
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
    category TEXT NOT NULL DEFAULT 'other',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT DEFAULT '',
    payment_channel TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. สร้าง Indexes สำหรับเพิ่มความเร็วในการ Query
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date ASC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 7. ลบ Policies เก่า (ถ้ามี)
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can manage their own user_settings" ON user_settings;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;

-- 8. กำหนด Supabase Authorization RLS Policies
CREATE POLICY "Users can manage their own categories"
    ON categories FOR ALL
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
-- 1. อัปเดต CHECK constraint ของ billing_cycle ให้รองรับทุกประเภท ('daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly')
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_cycle_check 
    CHECK (billing_cycle IN ('daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'));

-- 2. เพิ่ม column ใหม่หากยังไม่มี
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_interval_days INT DEFAULT 1;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- 3. ลบ column user_email ออกจากทุกตารางเนื่องจากใช้อ้างอิง user_id (UUID)
ALTER TABLE IF EXISTS categories DROP COLUMN IF EXISTS user_email;
ALTER TABLE IF EXISTS subscriptions DROP COLUMN IF EXISTS user_email;
ALTER TABLE IF EXISTS transactions DROP COLUMN IF EXISTS user_email;
ALTER TABLE IF EXISTS user_settings DROP COLUMN IF EXISTS user_email;
ALTER TABLE IF EXISTS user_settings DROP COLUMN IF EXISTS display_name;
