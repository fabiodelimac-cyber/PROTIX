-- ============================================================
-- FASE 1A — SCRIPT DE VALIDAÇÃO
-- Data: 2026-04-29
-- Objetivo: Confirmar que o hardening foi aplicado corretamente.
--
-- Execute no SQL Editor do Supabase APÓS o script de hardening.
-- Todos os resultados devem estar de acordo com o esperado
-- descrito nos comentários de cada bloco.
-- ============================================================

-- ============================================================
-- VERIFICAÇÃO 1: Grants nas tabelas
-- Esperado: anon NÃO deve aparecer com privilégios nas tabelas abaixo.
--           authenticated e service_role devem aparecer normalmente.
-- ============================================================

SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('interactions', 'user_profiles', 'performance_metrics')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- ============================================================
-- VERIFICAÇÃO 2: Grants nas funções RPC
-- Esperado: anon NÃO deve ter EXECUTE nas funções listadas.
--           authenticated deve ter EXECUTE.
-- ============================================================

SELECT
  r.rolname        AS grantee,
  p.proname        AS function_name,
  'EXECUTE'        AS privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON has_function_privilege(r.oid, p.oid, 'EXECUTE')
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_overview_metrics',
    'get_positivacao_metrics',
    'get_heatmap_metrics',
    'get_performance_metrics',
    'get_store_xray',
    'handle_new_user'
  )
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY p.proname, r.rolname;

-- ============================================================
-- VERIFICAÇÃO 3: Policies ativas nas tabelas
-- Esperado:
--   interactions    → "Permitir leitura para autenticados" (authenticated, SELECT)
--                  → "Permitir inserção via Service Role"  (service_role, INSERT)
--                  → NÃO deve existir "Permitir leitura para anon"
--   user_profiles   → "Users can view own profile"         (SELECT, auth.uid() = id)
-- ============================================================

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('interactions', 'user_profiles', 'performance_metrics')
ORDER BY tablename, policyname;

-- ============================================================
-- VERIFICAÇÃO 4: RLS habilitado nas tabelas
-- Esperado: rowsecurity = true para as 3 tabelas.
-- ============================================================

SELECT
  relname   AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND relname IN ('interactions', 'user_profiles', 'performance_metrics');

-- ============================================================
-- FIM DA VALIDAÇÃO
-- Se anon não aparece com grants nas tabelas/funções → hardening OK.
-- Se "Permitir leitura para anon" não aparece nas policies → OK.
-- Se rowsecurity = true nas 3 tabelas → OK.
-- ============================================================
