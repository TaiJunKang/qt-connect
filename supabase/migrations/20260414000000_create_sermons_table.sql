-- sermons 테이블: 목사님 설교문 저장
CREATE TABLE public.sermons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sermon_date text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

-- RLS: 인증된 사용자(관리자)만 접근
CREATE POLICY "Authenticated can view sermons"
  ON public.sermons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sermons"
  ON public.sermons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sermons"
  ON public.sermons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete sermons"
  ON public.sermons FOR DELETE TO authenticated USING (true);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_sermons_updated_at
  BEFORE UPDATE ON public.sermons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- qt_drafts, qt_plans에 sermon_id FK 추가
ALTER TABLE public.qt_drafts ADD COLUMN sermon_id uuid REFERENCES public.sermons(id) ON DELETE SET NULL;
ALTER TABLE public.qt_plans ADD COLUMN sermon_id uuid REFERENCES public.sermons(id) ON DELETE SET NULL;
