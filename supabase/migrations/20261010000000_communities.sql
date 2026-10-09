-- 공동체(교회/모임)별 분리: 한 사이트에서 여러 공동체가 각자 나눔·기도·랭킹·공지를 따로 씀
-- 매일의 말씀(qt_plans)은 모든 공동체가 공유

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
-- 가입 화면에서 목록을 보여줘야 하므로 누구나 조회 가능 (쓰기는 정책 없음 = 불가)
CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.communities (name, sort_order) VALUES
  ('홍제감리교회 청년부', 1),
  ('태준''s 지인', 2);

-- 프로필에 소속. 기존 사용자는 모두 홍제감리교회 청년부
ALTER TABLE public.profiles ADD COLUMN community_id uuid REFERENCES public.communities(id);
UPDATE public.profiles SET community_id = (SELECT id FROM public.communities WHERE name = '홍제감리교회 청년부');

-- 내 공동체 (RLS·RPC에서 사용)
CREATE OR REPLACE FUNCTION public.my_community()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT community_id FROM profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.my_community() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_community() TO authenticated;

-- 같은 공동체 사람인지
CREATE OR REPLACE FUNCTION public.same_community(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = p_user AND community_id IS NOT NULL AND community_id = public.my_community()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.same_community(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.same_community(uuid) TO authenticated;

-- 가입 시 고른 공동체를 프로필에 저장 (없는 id면 비워 둠)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, community_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    (SELECT id FROM public.communities WHERE id::text = NEW.raw_user_meta_data->>'community_id')
  );
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 프로필: 본인 + 같은 공동체만 조회. 소속 변경은 관리자만 (컬럼 권한 미부여)
DROP POLICY "Members can view all profiles" ON public.profiles;
CREATE POLICY "Members can view community profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (community_id IS NOT NULL AND community_id = public.my_community()));

-- 공개 묵상: 같은 공동체만
DROP POLICY "Members can view public logs" ON public.qt_logs;
CREATE POLICY "Members can view public logs"
  ON public.qt_logs FOR SELECT TO authenticated
  USING (is_public = true AND is_anonymous = false AND public.same_community(user_id));

-- 댓글/좋아요 대상: 본인 글 또는 같은 공동체의 공개 글
CREATE OR REPLACE FUNCTION public.can_view_qt_log(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qt_logs
    WHERE id = p_id AND (user_id = auth.uid() OR (is_public AND public.same_community(user_id)))
  );
$$;

-- 공지: 공동체별. 새 공지는 작성한 관리자의 공동체로
ALTER TABLE public.announcements ADD COLUMN community_id uuid REFERENCES public.communities(id) DEFAULT public.my_community();
UPDATE public.announcements SET community_id = (SELECT id FROM public.communities WHERE name = '홍제감리교회 청년부');
DROP POLICY "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Members can view community announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (community_id = public.my_community() OR public.is_admin());

-- 월간 참여: 내 공동체만
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
  JOIN profiles p ON p.user_id = l.user_id
  WHERE p.community_id = public.my_community()
    AND l.date >= to_char(make_date(p_year, p_month, 1), 'YYYY-MM-DD')
    AND l.date <  to_char(make_date(p_year, p_month, 1) + interval '1 month', 'YYYY-MM-DD')
  GROUP BY l.user_id, p.display_name
  ORDER BY count DESC;
$$;

-- 나눔 피드: 내 공동체만
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
  JOIN profiles p ON p.user_id = l.user_id
  WHERE auth.uid() IS NOT NULL AND l.is_public AND l.date >= p_from AND l.date <= p_to
    AND p.community_id = public.my_community()
  ORDER BY l.created_at DESC;
$$;

-- 기도제목: 내 공동체만
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
  JOIN profiles p ON p.user_id = r.user_id
  WHERE auth.uid() IS NOT NULL AND p.community_id = public.my_community()
  ORDER BY r.created_at DESC;
$$;
