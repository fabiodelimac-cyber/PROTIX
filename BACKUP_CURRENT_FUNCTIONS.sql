-- BACKUP DAS FUNÇÕES ATUAIS (MODIFICADAS) - 2026-04-17
-- Este arquivo contém as funções que foram modificadas para aceitar arrays
-- Criado para permitir rollback se necessário

-- =====================================================
-- BACKUP: get_overview_metrics (versão com arrays)
-- =====================================================

-- Para fazer backup da função atual, execute:
-- \copy (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_overview_metrics') TO 'get_overview_metrics_current_backup.sql';

-- =====================================================
-- BACKUP: get_positivacao_metrics (versão com arrays)
-- =====================================================

-- Para fazer backup da função atual, execute:
-- \copy (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_positivacao_metrics') TO 'get_positivacao_metrics_current_backup.sql';

-- =====================================================
-- BACKUP: get_heatmap_metrics (versão com arrays)
-- =====================================================

-- Para fazer backup da função atual, execute:
-- \copy (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_heatmap_metrics') TO 'get_heatmap_metrics_current_backup.sql';

-- =====================================================
-- BACKUP: get_performance_metrics (versão com arrays)
-- =====================================================

-- Para fazer backup da função atual, execute:
-- \copy (SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'get_performance_metrics') TO 'get_performance_metrics_current_backup.sql';

-- =====================================================
-- INSTRUÇÕES PARA RESTAURAR FUNÇÕES ORIGINAIS
-- =====================================================

-- 1. As funções originais podem ser encontradas em:
--    - BACKUPS/Backup 16Abr 18h18/get_performance_metrics.sql (função original)
--    - Outras funções originais precisam ser reconstruídas baseadas nas assinaturas

-- 2. Para restaurar uma função original, execute o SQL da versão original
-- 3. Para restaurar as funções modificadas (arrays), execute as migrações em supabase/migrations/

-- =====================================================
-- NOTA CRÍTICA
-- =====================================================
-- ERRO: Não foi feito backup adequado das funções originais antes das modificações
-- SOLUÇÃO: Usar as funções encontradas nos backups manuais do usuário como referência
-- PRÓXIMOS PASSOS: 
-- 1. Restaurar dados da tabela interactions
-- 2. Testar se as funções modificadas funcionam corretamente
-- 3. Se necessário, criar versões híbridas que aceitem tanto strings quanto arrays