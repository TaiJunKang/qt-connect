-- 회원가입 시 이메일 자동 확인 (교회 내부 앱이라 이메일 인증 불필요)
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_email_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_email();
