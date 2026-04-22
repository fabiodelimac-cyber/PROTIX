-- Tabela para armazenar métricas de performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    session_id TEXT NOT NULL,
    avg_cpu INTEGER,
    avg_gpu INTEGER,
    session_duration_seconds INTEGER,
    device_info JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_email ON performance_metrics(user_email);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- RLS (Row Level Security) - Usuários só veem suas próprias métricas
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance metrics"
    ON performance_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics"
    ON performance_metrics
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
