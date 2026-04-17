-- SCRIPT PARA RESTAURAR DADOS DA TABELA INTERACTIONS
-- Data: 2026-04-17
-- Fonte: BACKUPS/interactions 13abr 17h10.csv

-- PASSO 1: Limpar tabela atual (CUIDADO!)
-- TRUNCATE TABLE interactions;

-- PASSO 2: Restaurar dados do CSV
-- Você pode usar este comando no psql ou no Supabase Dashboard:

/*
COPY interactions (
    id, datetime, pure_date, faixa, store_code, store_name, 
    device_code, device_name, sessions, aparelho, tipo, rede, 
    p8020, shopping, visibilidade, regional, linha_de_produto, inserted_at
) 
FROM '/path/to/BACKUPS/interactions 13abr 17h10.csv' 
WITH (FORMAT csv, HEADER true);
*/

-- ALTERNATIVA: Inserir dados manualmente (primeiras linhas como exemplo)
-- Baseado no CSV backup:

INSERT INTO interactions (
    id, datetime, pure_date, faixa, store_code, store_name, 
    device_code, device_name, sessions, aparelho, tipo, rede, 
    p8020, shopping, visibilidade, regional, linha_de_produto, inserted_at
) VALUES 
('0002a7a5-499f-4e18-a005-bdade4a6702d', '2026-03-31 20:00', '2026-03-31', '20:00:00', 'SPC7614', 'LOJAS AMERICANAS - AVENIDA INTERLAGOS, 2255 - SHOPPING INTERLAGOS - SPC7614', 'G77256_SPC7614', 'G77256_SPC7614', 6, 'G77', '256 GB', 'LOJAS AMERICANAS', '80', 'Shopping Interlagos', '0', 'SPC', 'Moto G', '2026-04-09 18:30:47.565698+00'),
('0012878b-93a2-4f56-8f93-3167dd566eb4', '2026-04-08 11:00', '2026-04-08', '11:00:00', 'SPC7614', 'LOJAS AMERICANAS - AVENIDA INTERLAGOS, 2255 - SHOPPING INTERLAGOS - SPC7614', 'G17128_SPC7614', 'G17128_SPC7614', 5, 'G17', '128 GB', 'LOJAS AMERICANAS', '80', 'Shopping Interlagos', '0', 'SPC', 'Moto G', '2026-04-09 18:30:54.859885+00'),
('0015b2fc-32a1-4c9f-8e4e-22f2135c98d1', '2026-04-03 19:00', '2026-04-03', '19:00:00', 'SPC252260', 'CASAS BAHIA - AVENIDA EMBAIXADOR MACEDO SOARES, 9175 - SPC252260', 'G35256_SPC252260', 'G35256_SPC252260', 1, 'G35', '256 GB', 'CASAS BAHIA', '80', 'Loja De Rua', '0', 'SPC', 'Moto G', '2026-04-09 18:30:51.236979+00');

-- PASSO 3: Verificar se os dados foram inseridos
-- SELECT COUNT(*) FROM interactions;
-- SELECT * FROM interactions LIMIT 5;

-- PASSO 4: Testar as funções RPC
-- SELECT get_overview_metrics();
-- SELECT get_positivacao_metrics();
-- SELECT get_heatmap_metrics();
-- SELECT get_performance_metrics();