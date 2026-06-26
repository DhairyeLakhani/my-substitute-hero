
-- Add availability and account status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Validation trigger for status values
CREATE OR REPLACE FUNCTION public.validate_profile_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.availability_status NOT IN ('available','unavailable','on_leave') THEN
    RAISE EXCEPTION 'Invalid availability_status: %', NEW.availability_status;
  END IF;
  IF NEW.account_status NOT IN ('active','inactive') THEN
    RAISE EXCEPTION 'Invalid account_status: %', NEW.account_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_status_trg ON public.profiles;
CREATE TRIGGER validate_profile_status_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_status();

-- Allow assigners to view all user_roles (so they can list every registered substitute)
DROP POLICY IF EXISTS "Assigners can view all roles" ON public.user_roles;
CREATE POLICY "Assigners can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'assigner'::public.app_role));
