-- 묵상 '익명 공개' 지원 + 나눔 피드 RPC

ALTER TABLE public.qt_logs ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

-- 익명 글은 테이블 직접 조회로 작성자가 드러나지 않도록 피드는 RPC로만 제공
DROP POLICY "Members can view public logs" ON public.qt_logs;
CREATE POLICY "Members can view public logs"
  ON public.qt_logs FOR SELECT TO authenticated USING (is_public = true AND is_anonymous = false);

-- 댓글/좋아요 대상 확인용: 공개(익명 포함)이거나 본인 글
CREATE OR REPLACE FUNCTION public.can_view_qt_log(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qt_logs WHERE id = p_id AND (is_public OR user_id = auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_qt_log(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_qt_log(uuid) TO authenticated;

DROP POLICY "Authenticated can view comments" ON public.comments;
CREATE POLICY "Authenticated can view comments"
  ON public.comments FOR SELECT TO authenticated
  USING (content_type <> 'qt_log' OR public.can_view_qt_log(content_id));
DROP POLICY "Users can insert their own comments" ON public.comments;
CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (content_type <> 'qt_log' OR public.can_view_qt_log(content_id)));

DROP POLICY "Authenticated can view likes" ON public.likes;
CREATE POLICY "Authenticated can view likes"
  ON public.likes FOR SELECT TO authenticated
  USING (content_type <> 'qt_log' OR public.can_view_qt_log(content_id));
DROP POLICY "Users can insert their own likes" ON public.likes;
CREATE POLICY "Users can insert their own likes"
  ON public.likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (content_type <> 'qt_log' OR public.can_view_qt_log(content_id)));

-- 나눔 피드: 기간 내 공개 묵상 + 좋아요/댓글 수. 익명 글은 본인 외에는 작성자를 가림
CREATE OR REPLACE FUNCTION public.get_shared_logs(p_from text, p_to text)
RETURNS TABLE (
  id uuid, user_id uuid, user_name text, avatar_url text, date text,
  meditation text, application text, created_at timestamptz,
  is_anonymous boolean, is_mine boolean, like_count bigint, comment_count bigint, liked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id,
         CASE WHEN l.is_anonymous AND l.user_id <> auth.uid() THEN NULL ELSE l.user_id END,
         CASE WHEN l.is_anonymous AND l.user_id <> auth.uid() THEN '' ELSE COALESCE(p.display_name, l.user_name) END,
         CASE WHEN l.is_anonymous AND l.user_id <> auth.uid() THEN NULL ELSE p.avatar_url END,
         l.date, l.meditation, l.application, l.created_at,
         l.is_anonymous, l.user_id = auth.uid(),
         (SELECT count(*) FROM likes k WHERE k.content_type = 'qt_log' AND k.content_id = l.id),
         (SELECT count(*) FROM comments c WHERE c.content_type = 'qt_log' AND c.content_id = l.id),
         EXISTS (SELECT 1 FROM likes k WHERE k.content_type = 'qt_log' AND k.content_id = l.id AND k.user_id = auth.uid())
  FROM qt_logs l
  LEFT JOIN profiles p ON p.user_id = l.user_id
  WHERE auth.uid() IS NOT NULL AND l.is_public AND l.date >= p_from AND l.date <= p_to
  ORDER BY l.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_shared_logs(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_logs(text, text) TO authenticated;
