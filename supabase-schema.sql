-- ==========================================
-- 我们的旅行足迹 - 数据库 Schema
-- 在 Supabase SQL Editor 中执行
-- ==========================================

-- 1. 城市表
CREATE TABLE IF NOT EXISTS cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  color TEXT DEFAULT '#FF6B9D',
  description TEXT,
  main_image TEXT DEFAULT '',
  departure TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 城市图片表
CREATE TABLE IF NOT EXISTS city_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 开启 RLS（行级安全）
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_images ENABLE ROW LEVEL SECURITY;

-- 4. 允许匿名读写（个人项目，公开版）
CREATE POLICY "Allow all access to cities" ON cities
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to city_images" ON city_images
  USING (true) WITH CHECK (true);

-- ==========================================
-- Supabase Storage 配置（需手动操作）
-- ==========================================
-- 1. 在 Supabase Dashboard -> Storage 创建一个 bucket，名称为：city-images
-- 2. 将该 bucket 设置为 Public
-- 3. 在 bucket 的 RLS 策略中，允许匿名上传和读取
