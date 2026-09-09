-- ===================================================================
-- Cascade cleanup when deleting categories / tags / projects
-- Run once in Supabase SQL Editor
-- ===================================================================

-- 1) Category FK: เมื่อลบหมวดหมู่ → ตั้ง category_id = NULL อัตโนมัติ
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_category_id_fkey;
ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE transactions
    ADD CONSTRAINT transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- 2) ฟังก์ชัน + trigger: เมื่อลบแท็ก → เอา id ออกจาก tag_ids[]
CREATE OR REPLACE FUNCTION public.strip_deleted_tag_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE subscriptions
    SET tag_ids = array_remove(COALESCE(tag_ids, '{}'), OLD.id)
    WHERE user_id = OLD.user_id
      AND OLD.id = ANY(COALESCE(tag_ids, '{}'));

    UPDATE transactions
    SET tag_ids = array_remove(COALESCE(tag_ids, '{}'), OLD.id)
    WHERE user_id = OLD.user_id
      AND OLD.id = ANY(COALESCE(tag_ids, '{}'));

    RETURN OLD;
END;
$$;

-- 3) ฟังก์ชัน + trigger: เมื่อลบโปรเจกต์ → เอา id ออกจาก project_ids[]
CREATE OR REPLACE FUNCTION public.strip_deleted_project_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE subscriptions
    SET project_ids = array_remove(COALESCE(project_ids, '{}'), OLD.id)
    WHERE user_id = OLD.user_id
      AND OLD.id = ANY(COALESCE(project_ids, '{}'));

    UPDATE transactions
    SET project_ids = array_remove(COALESCE(project_ids, '{}'), OLD.id)
    WHERE user_id = OLD.user_id
      AND OLD.id = ANY(COALESCE(project_ids, '{}'));

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_strip_deleted_tag_id ON tags;
CREATE TRIGGER trg_strip_deleted_tag_id
    BEFORE DELETE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION public.strip_deleted_tag_id();

DROP TRIGGER IF EXISTS trg_strip_deleted_project_id ON projects;
CREATE TRIGGER trg_strip_deleted_project_id
    BEFORE DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION public.strip_deleted_project_id();

-- ===================================================================
-- 4) One-time cleanup: ลบ id ที่ไม่มีในตารางต้นทางออกจากข้อมูลที่มีอยู่แล้ว
-- ===================================================================

-- category_id ที่ชี้ไปหมวดหมู่ที่ไม่มีแล้ว → NULL
UPDATE subscriptions s
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = s.category_id);

UPDATE transactions t
SET category_id = NULL
WHERE category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_id);

-- tag_ids[] ค้างจากแท็กที่ถูกลบแล้ว → เหลือเฉพาะ id ที่มีจริง
UPDATE subscriptions s
SET tag_ids = COALESCE((
    SELECT array_agg(x ORDER BY ord)
    FROM unnest(COALESCE(s.tag_ids, '{}'::uuid[])) WITH ORDINALITY AS u(x, ord)
    WHERE EXISTS (SELECT 1 FROM tags tg WHERE tg.id = u.x)
), '{}'::uuid[])
WHERE COALESCE(cardinality(s.tag_ids), 0) > 0;

UPDATE transactions t
SET tag_ids = COALESCE((
    SELECT array_agg(x ORDER BY ord)
    FROM unnest(COALESCE(t.tag_ids, '{}'::uuid[])) WITH ORDINALITY AS u(x, ord)
    WHERE EXISTS (SELECT 1 FROM tags tg WHERE tg.id = u.x)
), '{}'::uuid[])
WHERE COALESCE(cardinality(t.tag_ids), 0) > 0;

-- project_ids[] ค้างจากโปรเจกต์ที่ถูกลบแล้ว → เหลือเฉพาะ id ที่มีจริง
UPDATE subscriptions s
SET project_ids = COALESCE((
    SELECT array_agg(x ORDER BY ord)
    FROM unnest(COALESCE(s.project_ids, '{}'::uuid[])) WITH ORDINALITY AS u(x, ord)
    WHERE EXISTS (SELECT 1 FROM projects p WHERE p.id = u.x)
), '{}'::uuid[])
WHERE COALESCE(cardinality(s.project_ids), 0) > 0;

UPDATE transactions t
SET project_ids = COALESCE((
    SELECT array_agg(x ORDER BY ord)
    FROM unnest(COALESCE(t.project_ids, '{}'::uuid[])) WITH ORDINALITY AS u(x, ord)
    WHERE EXISTS (SELECT 1 FROM projects p WHERE p.id = u.x)
), '{}'::uuid[])
WHERE COALESCE(cardinality(t.project_ids), 0) > 0;
