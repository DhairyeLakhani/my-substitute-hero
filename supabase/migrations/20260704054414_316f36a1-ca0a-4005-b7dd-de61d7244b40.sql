CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Assigners can view all roles" ON public.user_roles;
CREATE POLICY "Assigners can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'assigner'::public.app_role));

DROP POLICY IF EXISTS "Assigners can view all subs" ON public.substitutions;
CREATE POLICY "Assigners can view all subs"
ON public.substitutions
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'assigner'::public.app_role));

DROP POLICY IF EXISTS "Assigners can insert" ON public.substitutions;
CREATE POLICY "Assigners can insert"
ON public.substitutions
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'assigner'::public.app_role) AND auth.uid() = assigned_by);

DROP POLICY IF EXISTS "Assigners can update any" ON public.substitutions;
CREATE POLICY "Assigners can update any"
ON public.substitutions
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'assigner'::public.app_role));

DROP POLICY IF EXISTS "Assigners can delete" ON public.substitutions;
CREATE POLICY "Assigners can delete"
ON public.substitutions
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'assigner'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;