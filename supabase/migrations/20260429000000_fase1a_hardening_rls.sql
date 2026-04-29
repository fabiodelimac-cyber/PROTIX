-- ============================================================
-- FASE 1A — HARDENING RLS
-- Data: 2026-04-29
-- Objetivo: Revogar acesso anon às tabelas e funções RPC.
--           Apenas usuários autenticados e aprovados podem acessar dados.
--
-- ATENÇÃO: Execute este script no SQL Editor do Supabase.
-- NÃO execute se não tiver o script de rollback em mãos.
-- ============================================================

-- ============================================================
-- PASSO 1: REVOGAR GRANTS DO ROLE anon NAS TABELAS
-- Remove SELECT, INSERT, UPDATE, DELETE do anon nas 3 tabelas.
-- O service_role e authenticated NÃO são afetados.
-- ============================================================

REVOKE ALL ON TABLE public.interactions       FROM anon;
REVOKE ALL ON TABLE public.user_profiles      FROM anon;
REVOKE ALL ON TABLE public.performance_metrics FROM anon;

-- ============================================================
-- PASSO 2: REVOGAR EXECUÇÃO DAS FUNÇÕES RPC PARA anon
-- Apenas authenticated poderá chamar as RPCs.
-- ============================================================

-- Revoga grants explícitos do anon (caso existam)
REVOKE EXECUTE ON FUNCTION public.get_overview_metrics(text[], text[], text[], text[], text[], text[], text[], text[])     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_positivacao_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_heatmap_metrics(text[], text[], text[], text[], text[], text[], text[], text[], text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_performance_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_store_xray(text[], text[], text[], text[], text[], text[], text[], text[])           FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;

-- Revoga do role PUBLIC (herança que permite anon acessar mesmo sem grant direto)
REVOKE EXECUTE ON FUNCTION public.get_overview_metrics(text[], text[], text[], text[], text[], text[], text[], text[])     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_positivacao_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_heatmap_metrics(text[], text[], text[], text[], text[], text[], text[], text[], text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_performance_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_store_xray(text[], text[], text[], text[], text[], text[], text[], text[])           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ============================================================
-- PASSO 3: REMOVER A POLICY "Permitir leitura para anon" DA interactions
-- Esta policy foi criada como workaround para o createFreshClient operar
-- como anon. Com a correção do frontend (token injetado), ela não é mais
-- necessária e representa uma brecha de segurança.
-- ============================================================

DROP POLICY IF EXISTS "Permitir leitura para anon" ON public.interactions;

-- ============================================================
-- PASSO 4: CORRIGIR POLICIES DE performance_metrics (role public → authenticated)
-- As policies atuais usam {public}, o que inclui anon.
-- Recriamos explicitamente para authenticated.
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own performance metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own performance metrics" ON public.performance_metrics;

CREATE POLICY "Users can view their own performance metrics"
  ON public.performance_metrics FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics"
  ON public.performance_metrics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PASSO 5: GARANTIR QUE AS POLICIES CORRETAS EXISTEM PARA authenticated
-- (idempotente — não recria se já existir)
-- ============================================================

-- interactions: leitura para authenticated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interactions'
      AND policyname = 'Permitir leitura para autenticados'
  ) THEN
    CREATE POLICY "Permitir leitura para autenticados"
      ON public.interactions FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- interactions: inserção via service_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interactions'
      AND policyname = 'Permitir inserção via Service Role'
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
    WHERE tablename = 'user_profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.user_profiles FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- PASSO 5: CONFIRMAR QUE RLS ESTÁ HABILITADO NAS TABELAS
-- (idempotente — não causa erro se já estiver habilitado)
-- ============================================================

ALTER TABLE public.interactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIM DO SCRIPT DE HARDENING
-- Execute o script de validação após aplicar este.
-- ============================================================
