-- 공감(좋아요) 테이블 — content_type + content_id로 확장 가능
CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,              -- 'qt_log' | 'prayer_request' | (future)
  content_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view likes"
  ON public.likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own likes"
  ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes"
  ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_likes_content ON public.likes(content_type, content_id);

-- 댓글 테이블
CREATE TABLE public.comments (
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

CREATE POLICY "Authenticated can view comments"
  ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_comments_content ON public.comments(content_type, content_id, created_at);
