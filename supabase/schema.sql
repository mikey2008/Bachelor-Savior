-- Bachelor Savior - Supabase Schema
-- Run this in the Supabase SQL Editor

-- 1. Create Recipes Table
CREATE TABLE IF NOT EXISTS public.recipes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Users can only see their own recipes
DROP POLICY IF EXISTS "Users can view their own recipes" ON public.recipes;
CREATE POLICY "Users can view their own recipes"
ON public.recipes FOR SELECT
TO authenticated, anon
USING (auth.uid() = user_id);

-- Users can only insert their own recipes
DROP POLICY IF EXISTS "Users can insert their own recipes" ON public.recipes;
CREATE POLICY "Users can insert their own recipes"
ON public.recipes FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own recipes
DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.recipes;
CREATE POLICY "Users can delete their own recipes"
ON public.recipes FOR DELETE
TO authenticated, anon
USING (auth.uid() = user_id);

-- 4. Enable Anonymous Sign-ins in the Dashboard
-- (Go to Authentication -> Settings -> Enable Anonymous Sign-ins)
