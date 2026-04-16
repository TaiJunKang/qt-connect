-- 기도 제목 테이블
CREATE TABLE public.prayer_requests (
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

-- RLS: 모든 인증 사용자 조회, 본인만 수정/삭제
CREATE POLICY "Authenticated can view prayer_requests"
  ON public.prayer_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own prayer_requests"
  ON public.prayer_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prayer_requests"
  ON public.prayer_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prayer_requests"
  ON public.prayer_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 기도 응답 테이블 (누가 기도했는지)
CREATE TABLE public.prayer_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prayer_id, user_id)
);

ALTER TABLE public.prayer_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view prayer_responses"
  ON public.prayer_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own prayer_responses"
  ON public.prayer_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prayer_responses"
  ON public.prayer_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 인덱스: 조회 성능
CREATE INDEX idx_prayer_responses_prayer_id ON public.prayer_responses(prayer_id);
CREATE INDEX idx_prayer_requests_created_at ON public.prayer_requests(created_at DESC);
