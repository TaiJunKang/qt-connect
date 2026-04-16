-- 성경 통독 체크 테이블 — 한 사용자가 어떤 장을 읽었는지
CREATE TABLE public.bible_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book text NOT NULL,          -- "창" "출" "마" 등 성경 약어
  chapter int NOT NULL,        -- 장 번호
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, book, chapter)
);

ALTER TABLE public.bible_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own readings"
  ON public.bible_readings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own readings"
  ON public.bible_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own readings"
  ON public.bible_readings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_bible_readings_user ON public.bible_readings(user_id);
