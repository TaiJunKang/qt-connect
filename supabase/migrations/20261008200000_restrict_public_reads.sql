-- 공개 묵상과 프로필은 로그인한 멤버만 조회 가능 (공개 anon 키로 외부인이 읽지 못하도록)
DROP POLICY "Users can view public logs" ON public.qt_logs;
CREATE POLICY "Members can view public logs"
  ON public.qt_logs FOR SELECT TO authenticated USING (is_public = true);

DROP POLICY "Users can view all profiles" ON public.profiles;
CREATE POLICY "Members can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
