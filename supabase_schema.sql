-- =============================================================================
-- QuickNote – Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Phong cách: Sổ Ghi chú & Checklist Cá nhân (Stationery Checklist Paper)
-- =============================================================================

-- 1. Kích hoạt extension tạo UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Bảng users (Hồ sơ người dùng đồng bộ với auth.users của Supabase)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng notes (Lưu các tờ giấy ghi chú checklist của từng người dùng)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('TO_DO', 'TO_BUY', 'OTHERS')),
  title VARCHAR(100) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index tối ưu truy vấn lọc theo người dùng, phân loại nhóm và sắp xếp thời gian
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_category ON public.notes(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes(updated_at DESC);

-- =============================================================================
-- 4. Bật Row Level Security (RLS) bảo vệ dữ liệu cá nhân
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policy cho bảng users: Người dùng chỉ xem và cập nhật thông tin của chính mình
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy cho bảng notes: Người dùng chỉ được Xem / Tạo / Sửa / Xóa tờ ghi chú của chính mình
DROP POLICY IF EXISTS "Users can select own notes" ON public.notes;
CREATE POLICY "Users can select own notes"
  ON public.notes
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes"
  ON public.notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes"
  ON public.notes
  FOR DELETE
  USING (auth.uid() = user_id);
