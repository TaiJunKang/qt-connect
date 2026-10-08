-- 월간 참여 랭킹: 비공개 QT도 집계에 포함 (내용은 노출하지 않고 참여일 수만 반환)
CREATE OR REPLACE FUNCTION public.get_monthly_ranking(p_year int, p_month int)
RETURNS TABLE (user_id uuid, user_name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Asia/Seoul') AS start_at,
           make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'Asia/Seoul') + interval '1 month' AS end_at
  )
  SELECT l.user_id,
         COALESCE(p.display_name, max(l.user_name)) AS user_name,
         count(DISTINCT l.date) AS count
  FROM qt_logs l
  CROSS JOIN bounds b
  LEFT JOIN profiles p ON p.user_id = l.user_id
  WHERE l.created_at >= b.start_at AND l.created_at < b.end_at
  GROUP BY l.user_id, p.display_name
  ORDER BY count DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_monthly_ranking(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_ranking(int, int) TO authenticated;
