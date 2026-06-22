
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('assigner', 'substitute');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Substitutions
CREATE TABLE public.substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  absent_teacher TEXT NOT NULL,
  class_name TEXT NOT NULL,
  period TEXT NOT NULL,
  subject TEXT NOT NULL,
  assigned_teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','received')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.substitutions TO authenticated;
GRANT ALL ON public.substitutions TO service_role;
ALTER TABLE public.substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assigners can view all subs" ON public.substitutions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'assigner'));
CREATE POLICY "Substitutes can view their subs" ON public.substitutions FOR SELECT TO authenticated
  USING (auth.uid() = assigned_teacher_id);
CREATE POLICY "Assigners can insert" ON public.substitutions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'assigner') AND auth.uid() = assigned_by);
CREATE POLICY "Assigners can update any" ON public.substitutions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'assigner'));
CREATE POLICY "Substitutes can update status of own" ON public.substitutions FOR UPDATE TO authenticated
  USING (auth.uid() = assigned_teacher_id) WITH CHECK (auth.uid() = assigned_teacher_id);
CREATE POLICY "Assigners can delete" ON public.substitutions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'assigner'));

-- Auto-create profile + role on signup using user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'substitute'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
