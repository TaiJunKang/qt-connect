-- profiles 테이블에 role 컬럼 추가
ALTER TABLE public.profiles ADD COLUMN role text NOT NULL DEFAULT 'user';

-- 기존 관리자 계정에 admin 역할 부여
UPDATE public.profiles SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('admin@test.com', 'pastor@test.com')
);

-- 관리자 여부를 RLS에서 체크하는 헬퍼 함수
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

-- ─── qt_plans: 관리자만 쓰기 ───────────────────────────
DROP POLICY IF EXISTS "Authenticated users can insert qt_plans" ON public.qt_plans;
DROP POLICY IF EXISTS "Authenticated users can update qt_plans" ON public.qt_plans;
DROP POLICY IF EXISTS "Authenticated users can delete qt_plans" ON public.qt_plans;

CREATE POLICY "Admins can insert qt_plans"
  ON public.qt_plans FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update qt_plans"
  ON public.qt_plans FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete qt_plans"
  ON public.qt_plans FOR DELETE TO authenticated USING (public.is_admin());

-- ─── qt_drafts: 관리자만 쓰기 ──────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view qt_drafts" ON public.qt_drafts;
DROP POLICY IF EXISTS "Authenticated users can insert qt_drafts" ON public.qt_drafts;
DROP POLICY IF EXISTS "Authenticated users can update qt_drafts" ON public.qt_drafts;
DROP POLICY IF EXISTS "Authenticated users can delete qt_drafts" ON public.qt_drafts;

CREATE POLICY "Admins can view qt_drafts"
  ON public.qt_drafts FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert qt_drafts"
  ON public.qt_drafts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update qt_drafts"
  ON public.qt_drafts FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete qt_drafts"
  ON public.qt_drafts FOR DELETE TO authenticated USING (public.is_admin());

-- ─── announcements: 관리자만 쓰기, 모두 읽기 ────────────
DROP POLICY IF EXISTS "Authenticated can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated can delete announcements" ON public.announcements;

CREATE POLICY "Admins can insert announcements"
  ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE TO authenticated USING (public.is_admin());

-- ─── sermons: 관리자만 쓰기 ─────────────────────────────
DROP POLICY IF EXISTS "Authenticated can insert sermons" ON public.sermons;
DROP POLICY IF EXISTS "Authenticated can update sermons" ON public.sermons;
DROP POLICY IF EXISTS "Authenticated can delete sermons" ON public.sermons;

CREATE POLICY "Admins can insert sermons"
  ON public.sermons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update sermons"
  ON public.sermons FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete sermons"
  ON public.sermons FOR DELETE TO authenticated USING (public.is_admin());
