-- Migration: Restaurar trigger de autenticação e RLS policies
-- Motivo: O supabase db reset --linked apagou o trigger handle_new_user,
-- as RLS policies e os grants necessários para o fluxo de login funcionar.
-- Data: 2026-04-17

-- ============================================================
-- 1. FUNÇÃO handle_new_user (trigger function)
-- Quando um novo usuário se cadastra via Google/Microsoft/Email,
-- esta função insere automaticamente na user_profiles com status 'pending'
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, status)
  VALUES (new.id, new.email, 'pending');
  RETURN new;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- ============================================================
-- 2. TRIGGER no auth.users
-- Dispara handle_new_user() após cada INSERT em auth.users
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- interactions: leitura para autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interactions' AND policyname = 'Permitir leitura para autenticados'
  ) THEN
    CREATE POLICY "Permitir leitura para autenticados" 
      ON public.interactions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- interactions: leitura para anon (necessário porque createFreshClient usa anon key para RPCs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interactions' AND policyname = 'Permitir leitura para anon'
  ) THEN
    CREATE POLICY "Permitir leitura para anon" 
      ON public.interactions FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- interactions: inserção via service_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interactions' AND policyname = 'Permitir inserção via Service Role'
  ) THEN
    CREATE POLICY "Permitir inserção via Service Role" 
      ON public.interactions FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;

-- user_profiles: leitura do próprio perfil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" 
      ON public.user_profiles FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- 4. GRANTS (permissões de acesso)
-- ============================================================
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

GRANT ALL ON TABLE public.interactions TO anon;
GRANT ALL ON TABLE public.interactions TO authenticated;
GRANT ALL ON TABLE public.interactions TO service_role;

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;
