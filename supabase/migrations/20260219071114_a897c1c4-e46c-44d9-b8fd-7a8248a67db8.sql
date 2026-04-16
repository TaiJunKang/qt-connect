
-- Create qt_drafts table for temporary AI-generated weekly plans
CREATE TABLE public.qt_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  commentary text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qt_drafts ENABLE ROW LEVEL SECURITY;

-- All authenticated users (admins) can read drafts
CREATE POLICY "Authenticated users can view qt_drafts"
  ON public.qt_drafts FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users (admins) can insert drafts
CREATE POLICY "Authenticated users can insert qt_drafts"
  ON public.qt_drafts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users (admins) can update drafts
CREATE POLICY "Authenticated users can update qt_drafts"
  ON public.qt_drafts FOR UPDATE
  TO authenticated
  USING (true);

-- All authenticated users (admins) can delete drafts
CREATE POLICY "Authenticated users can delete qt_drafts"
  ON public.qt_drafts FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_qt_drafts_updated_at
  BEFORE UPDATE ON public.qt_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
