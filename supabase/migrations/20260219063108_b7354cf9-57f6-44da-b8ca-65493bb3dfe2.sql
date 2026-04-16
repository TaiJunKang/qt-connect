
-- Create qt_plans table for admin-managed daily Bible passages
CREATE TABLE public.qt_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  commentary text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.qt_plans ENABLE ROW LEVEL SECURITY;

-- Everyone (including unauthenticated) can read plans (needed for home screen)
CREATE POLICY "Anyone can view qt_plans"
  ON public.qt_plans
  FOR SELECT
  USING (true);

-- Only authenticated users can insert/update/delete (admin gate is enforced on the client side)
CREATE POLICY "Authenticated users can insert qt_plans"
  ON public.qt_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update qt_plans"
  ON public.qt_plans
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete qt_plans"
  ON public.qt_plans
  FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_qt_plans_updated_at
  BEFORE UPDATE ON public.qt_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
