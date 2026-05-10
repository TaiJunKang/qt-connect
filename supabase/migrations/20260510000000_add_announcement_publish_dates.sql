-- Add publish date range columns to announcements
ALTER TABLE public.announcements
  ADD COLUMN publish_start date,
  ADD COLUMN publish_end date;

-- Existing announcements: no date range = always visible (null means no restriction)
