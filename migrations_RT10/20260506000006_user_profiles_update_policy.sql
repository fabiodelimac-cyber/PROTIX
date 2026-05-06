-- RT1.0 — Adiciona policy de UPDATE segura na user_profiles
-- Permite que o próprio usuário atualize APENAS campos não-críticos do seu perfil.
-- A WITH CHECK garante que status e email não podem ser alterados pelo próprio usuário,
-- prevenindo escalada de privilégio (ex: auto-aprovação).
-- Data: 2026-05-06

-- Remove a policy irrestrita anterior, se existir
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Cria a policy segura, restringindo alterações nos campos críticos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can update own safe fields'
  ) THEN
    CREATE POLICY "Users can update own safe fields"
      ON public.user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id
        AND status = (SELECT status FROM public.user_profiles WHERE id = auth.uid())
        AND email  = (SELECT email  FROM public.user_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;
