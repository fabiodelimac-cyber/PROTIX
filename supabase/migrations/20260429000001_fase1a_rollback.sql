-- ============================================================
-- FASE 1A — ROLLBACK COMPLETO
-- Data: 2026-04-29
-- Objetivo: Reverter o hardening RLS em < 2 minutos.
--           Restaura o estado anterior (anon com acesso total).
--
-- USE APENAS SE O HARDENING CAUSAR PROBLEMAS.
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- ============================================================
-- PASSO 1: RESTAURAR GRANTS DO anon NAS TABELAS
-- ============================================================

GRANT ALL ON TABLE public.interactions        TO anon;
GRANT ALL ON TABLE public.user_profiles       TO anon;
GRANT ALL ON TABLE public.performance_metrics TO anon;

-- ============================================================
-- PASSO 2: RESTAURAR EXECUÇÃO DAS FUNÇÕES RPC PARA anon
-- ============================================================

-- Restaura grants explícitos para anon
GRANT EXECUTE ON FUNCTION public.get_overview_metrics(text[], text[], text[], text[], text[], text[], text[], text[])     TO anon;
GRANT EXECUTE ON FUNCTION public.get_positivacao_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  TO anon;
GRANT EXECUTE ON FUNCTION public.get_heatmap_metrics(text[], text[], text[], text[], text[], text[], text[], text[], text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_performance_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_xray(text[], text[], text[], text[], text[], text[], text[], text[])           TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

-- Restaura grant para PUBLIC (herança padrão do PostgreSQL)
GRANT EXECUTE ON FUNCTION public.get_overview_metrics(text[], text[], text[], text[], text[], text[], text[], text[])     TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_positivacao_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_heatmap_metrics(text[], text[], text[], text[], text[], text[], text[], text[], text[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_performance_metrics(text[], text[], text[], text[], text[], text[], text[], text[])  TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_xray(text[], text[], text[], text[], text[], text[], text[], text[])           TO PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO PUBLIC;

-- ============================================================
-- PASSO 3: RECRIAR A POLICY "Permitir leitura para anon"
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interactions'
      AND policyname = 'Permitir leitura para anon'
  ) THEN
    CREATE POLICY "Permitir leitura para anon"
      ON public.interactions FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ============================================================
-- PASSO 4: RESTAURAR POLICIES DE performance_metrics PARA public
-- (estado anterior ao hardening)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own performance metrics"  ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can insert their own performance metrics" ON public.performance_metrics;

CREATE POLICY "Users can view their own performance metrics"
  ON public.performance_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FIM DO ROLLBACK
-- O sistema está restaurado ao estado anterior ao hardening.
-- ============================================================
