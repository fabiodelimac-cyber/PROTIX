-- RT1.0 — Item 2.2: Substituir performance_metrics por usage_stats
-- Remove: tabela performance_metrics (CPU/GPU — análise concluída)
-- Cria:   tabela usage_stats (login, duração de sessão, aba mais usada)
-- Data: 2026-05-06

-- Drop da tabela antiga (dados de CPU/GPU não são mais necessários)
DROP TABLE IF EXISTS "public"."performance_metrics";

-- Nova tabela de uso
CREATE TABLE IF NOT EXISTS "public"."usage_stats" (
    "id"                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id"           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "user_email"        text,
    "session_start"     timestamptz NOT NULL,
    "session_end"       timestamptz,
    "session_duration"  interval GENERATED ALWAYS AS (session_end - session_start) STORED,
    "most_used_tab"     text,
    "tab_times"         jsonb DEFAULT '{}'::jsonb,
    "created_at"        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE "public"."usage_stats" ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado pode inserir e ler apenas seus próprios registros
CREATE POLICY "usage_stats_insert" ON "public"."usage_stats"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_stats_select" ON "public"."usage_stats"
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Índice para queries por usuário
CREATE INDEX IF NOT EXISTS "idx_usage_stats_user_id" ON "public"."usage_stats" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_usage_stats_session_start" ON "public"."usage_stats" ("session_start" DESC);

COMMENT ON TABLE "public"."usage_stats" IS
'Registra sessões de uso: login, duração e aba mais utilizada por sessão.
Substitui performance_metrics (CPU/GPU) removida em 2026-05-06.';
