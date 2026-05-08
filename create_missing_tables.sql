-- ============================================
-- QT Connect: 누락 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================

-- 1. sermons 테이블
CREATE TABLE IF NOT EXISTS public.sermons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sermon_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sermons" ON public.sermons FOR SELECT TO authenticated USING (true);

-- 2. prayer_requests 테이블
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  is_anonymous boolean NOT NULL DEFAULT false,
  is_answered boolean NOT NULL DEFAULT false,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view prayer_requests" ON public.prayer_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own prayer_requests" ON public.prayer_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prayer_requests" ON public.prayer_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prayer_requests" ON public.prayer_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created_at ON public.prayer_requests(created_at DESC);

-- 3. prayer_responses 테이블
CREATE TABLE IF NOT EXISTS public.prayer_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prayer_id, user_id)
);
ALTER TABLE public.prayer_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view prayer_responses" ON public.prayer_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own prayer_responses" ON public.prayer_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prayer_responses" ON public.prayer_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_responses_prayer_id ON public.prayer_responses(prayer_id);

-- 4. likes 테이블
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, user_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view likes" ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own likes" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_likes_content ON public.likes(content_type, content_id);

-- 5. comments 테이블
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_comments_content ON public.comments(content_type, content_id, created_at);

-- 6. bible_readings 테이블
CREATE TABLE IF NOT EXISTS public.bible_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book text NOT NULL,
  chapter int NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, book, chapter)
);
ALTER TABLE public.bible_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own readings" ON public.bible_readings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own readings" ON public.bible_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own readings" ON public.bible_readings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_bible_readings_user ON public.bible_readings(user_id);

-- 7. announcements 테이블
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(is_pinned DESC, created_at DESC);

-- 8. qt_plans에 sermon_id 컬럼 추가 (이미 있으면 무시)
DO $$ BEGIN
  ALTER TABLE public.qt_plans ADD COLUMN sermon_id uuid REFERENCES public.sermons(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 9. is_admin 헬퍼 함수
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 10. 관리자 전용 RLS (announcements, sermons)
CREATE POLICY "Admins can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can insert sermons" ON public.sermons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update sermons" ON public.sermons FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete sermons" ON public.sermons FOR DELETE TO authenticated USING (public.is_admin());
