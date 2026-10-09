-- 한 사람이 여러 공동체에 속할 수 있게: 멤버십 + 공동체별 관리자
-- profiles.community_id는 '지금 보고 있는 공동체'(전환 가능)로 사용

CREATE TABLE public.community_members (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
-- 내 멤버십만 조회 (가입/변경은 관리자가 DB에서, 또는 가입 트리거)
CREATE POLICY "Users can view their memberships" ON public.community_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 기존 소속을 멤버십으로. 기존 관리자(role=admin)는 그 공동체의 관리자
INSERT INTO public.community_members (user_id, community_id, role)
SELECT user_id, community_id, CASE WHEN role = 'admin' THEN 'admin' ELSE 'member' END
FROM public.profiles WHERE community_id IS NOT NULL;

-- 강태준(c010707@naver.com): 태준's 지인 관리자로도 추가
INSERT INTO public.community_members (user_id, community_id, role)
SELECT u.id, c.id, 'admin'
FROM auth.users u, public.communities c
WHERE u.email = 'c010707@naver.com' AND c.name = '태준''s 지인'
ON CONFLICT (user_id, community_id) DO UPDATE SET role = 'admin';

-- 같은 공동체 = 상대가 내가 지금 보고 있는 공동체의 멤버
CREATE OR REPLACE FUNCTION public.same_community(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members WHERE user_id = p_user AND community_id = public.my_community()
  );
$$;

-- 지금 공동체의 관리자인지
CREATE OR REPLACE FUNCTION public.is_community_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE user_id = auth.uid() AND community_id = public.my_community() AND role = 'admin'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_community_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_community_admin() TO authenticated;

-- 보고 있는 공동체 전환 (내가 속한 공동체로만)
CREATE OR REPLACE FUNCTION public.switch_community(p_community uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM community_members WHERE user_id = auth.uid() AND community_id = p_community) THEN
    RAISE EXCEPTION '속하지 않은 공동체입니다';
  END IF;
  UPDATE profiles SET community_id = p_community WHERE user_id = auth.uid();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.switch_community(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_community(uuid) TO authenticated;

-- 내 공동체 목록 (전환 메뉴용)
CREATE OR REPLACE FUNCTION public.get_my_communities()
RETURNS TABLE (id uuid, name text, role text, is_current boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, m.role, c.id = public.my_community()
  FROM community_members m JOIN communities c ON c.id = m.community_id
  WHERE m.user_id = auth.uid()
  ORDER BY c.sort_order;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_communities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_communities() TO authenticated;

-- 가입 시: 프로필 + 멤버십
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_community uuid := (SELECT id FROM public.communities WHERE id::text = NEW.raw_user_meta_data->>'community_id');
BEGIN
  INSERT INTO public.profiles (user_id, display_name, community_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), v_community);
  IF v_community IS NOT NULL THEN
    INSERT INTO public.community_members (user_id, community_id) VALUES (NEW.id, v_community);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 프로필: 본인 + 지금 공동체 멤버
DROP POLICY "Members can view community profiles" ON public.profiles;
CREATE POLICY "Members can view community profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.same_community(user_id));

-- 공지: 지금 공동체 것만 보고, 그 공동체 관리자만 관리
DROP POLICY "Members can view community announcements" ON public.announcements;
CREATE POLICY "Members can view community announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (community_id = public.my_community());
DROP POLICY "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Community admins can insert announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_community_admin() AND community_id = public.my_community());
DROP POLICY "Admins can update announcements" ON public.announcements;
CREATE POLICY "Community admins can update announcements"
  ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_community_admin() AND community_id = public.my_community());
DROP POLICY "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Community admins can delete announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (public.is_community_admin() AND community_id = public.my_community());

-- 랭킹·나눔·기도제목: 지금 공동체의 멤버가 쓴 것 (여러 곳에 속한 사람은 양쪽에 다 보임)
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
  JOIN community_members m ON m.user_id = l.user_id AND m.community_id = public.my_community()
  LEFT JOIN profiles p ON p.user_id = l.user_id
  WHERE l.date >= to_char(make_date(p_year, p_month, 1), 'YYYY-MM-DD')
    AND l.date <  to_char(make_date(p_year, p_month, 1) + interval '1 month', 'YYYY-MM-DD')
  GROUP BY l.user_id, p.display_name
  ORDER BY count DESC;
$$;

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
  JOIN community_members m ON m.user_id = l.user_id AND m.community_id = public.my_community()
  LEFT JOIN profiles p ON p.user_id = l.user_id
  WHERE auth.uid() IS NOT NULL AND l.is_public AND l.date >= p_from AND l.date <= p_to
  ORDER BY l.created_at DESC;
$$;

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
  JOIN community_members m ON m.user_id = r.user_id AND m.community_id = public.my_community()
  WHERE auth.uid() IS NOT NULL
  ORDER BY r.created_at DESC;
$$;
