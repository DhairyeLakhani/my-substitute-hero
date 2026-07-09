
-- Period schedule table
CREATE TABLE public.period_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL UNIQUE,
  start_time time NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.period_schedule TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.period_schedule TO authenticated;
GRANT ALL ON public.period_schedule TO service_role;
ALTER TABLE public.period_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read schedule"
  ON public.period_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Assigners can insert schedule"
  ON public.period_schedule FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'assigner'::app_role));
CREATE POLICY "Assigners can update schedule"
  ON public.period_schedule FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'assigner'::app_role));
CREATE POLICY "Assigners can delete schedule"
  ON public.period_schedule FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'assigner'::app_role));

-- Seed default periods
INSERT INTO public.period_schedule (period, start_time, sort_order) VALUES
  ('1','08:00',1),('2','09:00',2),('3','10:00',3),('4','11:00',4),
  ('5','12:30',5),('6','13:30',6),('7','14:30',7),('8','15:30',8);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Substitution reminder columns
ALTER TABLE public.substitutions
  ADD COLUMN reminder_sent_at timestamptz,
  ADD COLUMN reminder_ack boolean NOT NULL DEFAULT false,
  ADD COLUMN alarm_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN alarm_sent_at timestamptz;
