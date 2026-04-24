CREATE OR REPLACE FUNCTION get_performance_metrics(
  p_shopping text DEFAULT NULL,
  p_rede text DEFAULT NULL,
  p_store_name text DEFAULT NULL,
  p_linha text DEFAULT NULL,
  p_regional text DEFAULT NULL,
  p_p8020 text DEFAULT NULL,
  p_visibilidade text DEFAULT NULL,
  p_dates text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  WITH filtered AS (
    SELECT 
      store_name,
      aparelho,
      device_code,
      sessions,
      pure_date
    FROM interactions
    WHERE
      (p_shopping IS NULL OR shopping = p_shopping)
      AND (p_rede IS NULL OR rede = p_rede)
      AND (p_store_name IS NULL OR store_name = p_store_name)
      AND (p_linha IS NULL OR linha_de_produto = p_linha)
      AND (p_regional IS NULL OR regional = p_regional)
      AND (p_p8020 IS NULL OR p8020 = p_p8020)
      AND (p_visibilidade IS NULL OR visibilidade = p_visibilidade)
      AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))
      AND aparelho IS NOT NULL
      AND store_name IS NOT NULL
      AND sessions IS NOT NULL
  ),
  
  -- TOP 10 LOJAS
  top10_agg AS (
    SELECT 
      store_name,
      SUM(sessions) AS total
    FROM filtered
    GROUP BY store_name
    ORDER BY total DESC
    LIMIT 10
  ),
  
  -- BOTTOM 10 LOJAS
  bottom10_agg AS (
    SELECT 
      store_name,
      SUM(sessions) AS total
    FROM filtered
    GROUP BY store_name
    ORDER BY total ASC
    LIMIT 10
  ),
  
  -- EFICIÊNCIA POR APARELHO
  efficiency_agg AS (
    SELECT 
      aparelho,
      COUNT(DISTINCT device_code) AS qtd_unidades,
      SUM(sessions) AS total_sessions,
      CASE 
        WHEN COUNT(DISTINCT device_code) > 0 
        THEN ROUND((SUM(sessions) / COUNT(DISTINCT device_code))::numeric, 2)
        ELSE 0 
      END AS efficiency
    FROM filtered
    GROUP BY aparelho
    HAVING COUNT(DISTINCT device_code) > 0
    ORDER BY efficiency DESC
  ),
  
  -- CRESCIMENTO POR APARELHO (simulado - últimos vs primeiros registros)
  growth_agg AS (
    SELECT 
      aparelho,
      CASE 
        WHEN COUNT(*) >= 2 THEN
          ROUND(
            ((
              COALESCE((SELECT SUM(sessions) FROM filtered f2 
               WHERE f2.aparelho = growth_base.aparelho 
               AND f2.pure_date >= (SELECT MAX(pure_date) - INTERVAL '15 days' FROM filtered)
              ), 0) - 
              COALESCE((SELECT SUM(sessions) FROM filtered f3 
               WHERE f3.aparelho = growth_base.aparelho 
               AND f3.pure_date <= (SELECT MIN(pure_date) + INTERVAL '15 days' FROM filtered)
              ), 0)
            ) / NULLIF(
              COALESCE((SELECT SUM(sessions) FROM filtered f3 
               WHERE f3.aparelho = growth_base.aparelho 
               AND f3.pure_date <= (SELECT MIN(pure_date) + INTERVAL '15 days' FROM filtered)
              ), 1), 0
            ) * 100)::numeric, 1
          )
        ELSE 0
      END AS growth_rate
    FROM (
      SELECT DISTINCT aparelho 
      FROM filtered
    ) growth_base
    GROUP BY aparelho
  ),
  
  -- SCORE DE SAÚDE POR LOJA
  health_base AS (
    SELECT 
      store_name,
      SUM(sessions) AS total_sessions,
      COUNT(DISTINCT aparelho) AS qtd_aparelhos,
      COUNT(DISTINCT pure_date) AS qtd_dias
    FROM filtered
    GROUP BY store_name
  ),
  
  health_stats AS (
    SELECT 
      MAX(total_sessions) AS max_sessions,
      MAX(qtd_aparelhos) AS max_aparelhos
    FROM health_base
  ),
  
  health_agg AS (
    SELECT 
      hb.store_name,
      LEAST(100, GREATEST(0, 
        ROUND(
          -- Volume (40 pontos)
          (hb.total_sessions::numeric / NULLIF(hs.max_sessions, 0) * 40) +
          -- Diversidade (30 pontos)
          (hb.qtd_aparelhos::numeric / NULLIF(hs.max_aparelhos, 0) * 30) +
          -- Consistência (30 pontos) - simplificado
          CASE 
            WHEN hb.qtd_dias >= 3 THEN 25  -- Assume boa consistência se tem dados de vários dias
            WHEN hb.qtd_dias >= 2 THEN 20
            ELSE 15
          END
        )::numeric, 0
      )) AS health_score
    FROM health_base hb
    CROSS JOIN health_stats hs
    ORDER BY health_score DESC
  )
  
  SELECT json_build_object(
    'top10', (SELECT json_agg(row_to_json(t)) FROM top10_agg t),
    'bottom10', (SELECT json_agg(row_to_json(b)) FROM bottom10_agg b),
    'efficiency', (SELECT json_agg(row_to_json(e)) FROM efficiency_agg e),
    'growth', (SELECT json_agg(row_to_json(g)) FROM growth_agg g),
    'health', (SELECT json_agg(row_to_json(h)) FROM health_agg h)
  ) INTO result;
  
  RETURN result;
END;
$$;