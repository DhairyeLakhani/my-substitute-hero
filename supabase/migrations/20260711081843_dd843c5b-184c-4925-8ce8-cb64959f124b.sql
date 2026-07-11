CREATE TABLE public.free_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.free_periods TO authenticated;
GRANT ALL ON public.free_periods TO service_role;
ALTER TABLE public.free_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own free periods select" ON public.free_periods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own free periods insert" ON public.free_periods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own free periods delete" ON public.free_periods FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Assigners can view all free periods" ON public.free_periods FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'assigner'));
CREATE INDEX free_periods_user_date_idx ON public.free_periods(user_id, date);