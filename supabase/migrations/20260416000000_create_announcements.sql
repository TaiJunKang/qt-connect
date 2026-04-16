-- 공지사항 테이블
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',  -- general/event/urgent
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 조회 가능, 인증된 사용자만 작성/수정/삭제 (관리자 체크는 클라이언트)
CREATE POLICY "Anyone can view announcements"
  ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert announcements"
  ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update announcements"
  ON public.announcements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete announcements"
  ON public.announcements FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_announcements_pinned ON public.announcements(is_pinned DESC, created_at DESC);
