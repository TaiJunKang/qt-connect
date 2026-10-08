-- 1. profiles.role 자가 변경(관리자 권한 탈취) 차단: 사용자가 수정 가능한 컬럼만 허용
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (user_id, display_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- 2. SECURITY DEFINER 함수의 RPC 직접 호출 차단
--    트리거 함수는 EXECUTE 권한 없이도 트리거로 동작함
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_confirm_email() FROM PUBLIC, anon, authenticated;
--    is_admin()은 RLS 정책에서 쓰이므로 authenticated는 유지
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. qt_logs: 사용자당 날짜별 1건 + 날짜 형식 보장 (랭킹 조작/중복 방지)
ALTER TABLE public.qt_logs ADD CONSTRAINT qt_logs_user_id_date_key UNIQUE (user_id, date);
ALTER TABLE public.qt_logs ADD CONSTRAINT qt_logs_date_format CHECK (date ~ '^\d{4}-\d{2}-\d{2}$');

-- 4. 랭킹: 작성 시각이 아니라 QT 날짜 기준으로 해당 월 집계
CREATE OR REPLACE FUNCTION public.get_monthly_ranking(p_year int, p_month int)
RETURNS TABLE (user_id uuid, user_name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.user_id,
         COALESCE(p.display_name, max(l.user_name)) AS user_name,
         count(DISTINCT l.date) AS count
  FROM qt_logs l
  LEFT JOIN profiles p ON p.user_id = l.user_id
  WHERE l.date >= to_char(make_date(p_year, p_month, 1), 'YYYY-MM-DD')
    AND l.date <  to_char(make_date(p_year, p_month, 1) + interval '1 month', 'YYYY-MM-DD')
  GROUP BY l.user_id, p.display_name
  ORDER BY count DESC;
$$;

-- 5. 익명 기도제목 작성자 비노출: 목록은 RPC로만 조회, 테이블 직접 조회는 본인 글만
CREATE OR REPLACE FUNCTION public.get_prayer_requests()
RETURNS TABLE (
  id uuid, user_id uuid, user_name text, title text, content text, category text,
  is_anonymous boolean, is_answered boolean, answered_at timestamptz, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         CASE WHEN r.is_anonymous AND r.user_id <> auth.uid() THEN NULL ELSE r.user_id END,
         CASE WHEN r.is_anonymous AND r.user_id <> auth.uid() THEN '' ELSE r.user_name END,
         r.title, r.content, r.category, r.is_anonymous, r.is_answered, r.answered_at, r.created_at
  FROM prayer_requests r
  WHERE auth.uid() IS NOT NULL
  ORDER BY r.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_prayer_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prayer_requests() TO authenticated;

DROP POLICY "Authenticated can view prayer_requests" ON public.prayer_requests;
CREATE POLICY "Users can view their own prayer_requests"
  ON public.prayer_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. 비공개 전환된 묵상의 댓글/좋아요는 조회·작성 불가 (qt_logs RLS를 그대로 따름)
DROP POLICY "Authenticated can view comments" ON public.comments;
CREATE POLICY "Authenticated can view comments"
  ON public.comments FOR SELECT TO authenticated
  USING (content_type <> 'qt_log' OR EXISTS (SELECT 1 FROM public.qt_logs q WHERE q.id = content_id));
DROP POLICY "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND (content_type <> 'qt_log' OR EXISTS (SELECT 1 FROM public.qt_logs q WHERE q.id = content_id)));

DROP POLICY "Authenticated can view likes" ON public.likes;
CREATE POLICY "Authenticated can view likes"
  ON public.likes FOR SELECT TO authenticated
  USING (content_type <> 'qt_log' OR EXISTS (SELECT 1 FROM public.qt_logs q WHERE q.id = content_id));
DROP POLICY "Users can insert their own likes" ON public.likes;
CREATE POLICY "Users can insert their own likes"
  ON public.likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND (content_type <> 'qt_log' OR EXISTS (SELECT 1 FROM public.qt_logs q WHERE q.id = content_id)));

-- 7. 공지 게시 종료일이 시작일보다 앞서지 않도록
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_publish_range CHECK (publish_end IS NULL OR publish_start IS NULL OR publish_end >= publish_start);
