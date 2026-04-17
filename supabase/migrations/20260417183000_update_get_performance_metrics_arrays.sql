-- Migration: Update get_performance_metrics to accept array parameters
-- Purpose: Enable multiple selection filtering while maintaining backward compatibility
-- Date: 2026-04-17
-- CRITICAL: This function is used for calculations throughout the dashboard

-- Update get_performance_metrics to accept array parameters
CREATE OR REPLACE FUNCTION public.get_performance_metrics(
    p_shopping text[] DEFAULT NULL,
    p_rede text[] DEFAULT NULL,
    p_store_name text[] DEFAULT NULL,
    p_linha text[] DEFAULT NULL,
    p_regional text[] DEFAULT NULL,
    p_p8020 text[] DEFAULT NULL,
    p_visibilidade text[] DEFAULT NULL,
    p_dates text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  result json;
  -- Normalized parameters
  p_shopping_norm text[];
  p_rede_norm text[];
  p_store_name_norm text[];
  p_linha_norm text[];
  p_regional_norm text[];
  p_p8020_norm text[];
  p_visibilidade_norm text[];
BEGIN
  -- Normalize all filter parameters using our helper function
  p_shopping_norm := normalize_filter_param(p_shopping);
  p_rede_norm := normalize_filter_param(p_rede);
  p_store_name_norm := normalize_filter_param(p_store_name);
  p_linha_norm := normalize_filter_param(p_linha);
  p_regional_norm := normalize_filter_param(p_regional);
  p_p8020_norm := normalize_filter_param(p_p8020);
  p_visibilidade_norm := normalize_filter_param(p_visibilidade);

  WITH filtered AS (
    SELECT 
      store_name,
      aparelho,
      linha_de_produto,
      device_code,
      sessions,
      pure_date
    FROM interactions
    WHERE
      (p_shopping_norm IS NULL OR shopping = ANY(p_shopping_norm))
      AND (p_rede_norm IS NULL OR rede = ANY(p_rede_norm))
      AND (p_store_name_norm IS NULL OR store_name = ANY(p_store_name_norm))
      AND (p_linha_norm IS NULL OR linha_de_produto = ANY(p_linha_norm))
      AND (p_regional_norm IS NULL OR regional = ANY(p_regional_norm))
      AND (p_p8020_norm IS NULL OR p8020 = ANY(p_p8020_norm))
      AND (p_visibilidade_norm IS NULL OR visibilidade = ANY(p_visibilidade_norm))
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
      linha_de_produto,
      COUNT(DISTINCT device_code) AS qtd_unidades,
      SUM(sessions) AS total_sessions,
      CASE 
        WHEN COUNT(DISTINCT device_code) > 0 
        THEN ROUND((SUM(sessions) / COUNT(DISTINCT device_code))::numeric, 2)
        ELSE 0 
      END AS efficiency
    FROM filtered
    GROUP BY aparelho, linha_de_produto
    HAVING COUNT(DISTINCT device_code) > 0
    ORDER BY efficiency DESC
  ),
  
  -- CRESCIMENTO POR APARELHO (corrigindo nested aggregates)
  growth_base AS (
    SELECT 
      aparelho,
      linha_de_produto,
      pure_date,
      SUM(sessions) as daily_sessions
    FROM filtered
    WHERE aparelho IS NOT NULL 
      AND sessions IS NOT NULL
      AND linha_de_produto IS NOT NULL
    GROUP BY aparelho, linha_de_produto, pure_date
  ),
  
  growth_stats AS (
    SELECT 
      aparelho,
      linha_de_produto,
      COUNT(*) as unique_dates,
      AVG(daily_sessions) AS avg_daily_sessions,
      MAX(pure_date) AS last_date
    FROM growth_base
    GROUP BY aparelho, linha_de_produto
  ),
  
  growth_last_day AS (
    SELECT 
      gb.aparelho,
      gb.linha_de_produto,
      gb.daily_sessions as last_day_sessions
    FROM growth_base gb
    INNER JOIN growth_stats gs ON gb.aparelho = gs.aparelho 
                               AND gb.linha_de_produto = gs.linha_de_produto
                               AND gb.pure_date = gs.last_date
  ),
  
  growth_agg AS (
    SELECT 
      gs.aparelho,
      gs.linha_de_produto,
      gs.unique_dates,
      ROUND(gs.avg_daily_sessions::numeric, 1) AS avg_daily_sessions,
      gs.last_date,
      gld.last_day_sessions,
      -- Calcula crescimento
      CASE 
        WHEN gs.avg_daily_sessions > 0 AND gld.last_day_sessions IS NOT NULL THEN
          ROUND(((gld.last_day_sessions - gs.avg_daily_sessions) / gs.avg_daily_sessions * 100)::numeric, 1)
        ELSE 
          0.0
      END AS growth_rate
    FROM growth_stats gs
    LEFT JOIN growth_last_day gld ON gs.aparelho = gld.aparelho 
                                  AND gs.linha_de_produto = gld.linha_de_produto
    ORDER BY gs.linha_de_produto ASC, gs.aparelho ASC
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
  
  -- Consistência por loja (variação das interações por dia)
  health_consistency AS (
    SELECT 
      store_name,
      AVG(daily_sessions) AS avg_daily_sessions,
      STDDEV(daily_sessions) AS stddev_daily_sessions,
      COUNT(*) AS days_count
    FROM (
      SELECT 
        store_name,
        pure_date,
        SUM(sessions) AS daily_sessions
      FROM filtered
      GROUP BY store_name, pure_date
    ) daily_data
    GROUP BY store_name
    HAVING COUNT(*) >= 2  -- Precisa de pelo menos 2 dias para calcular desvio
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
      hb.total_sessions,
      hb.qtd_aparelhos,
      hb.qtd_dias,
      -- Componentes individuais do score
      ROUND((hb.total_sessions::numeric / NULLIF(hs.max_sessions, 0) * 40)::numeric, 1) AS volume_score,
      ROUND((hb.qtd_aparelhos::numeric / NULLIF(hs.max_aparelhos, 0) * 30)::numeric, 1) AS diversity_score,
      ROUND(
        CASE 
          WHEN hc.stddev_daily_sessions IS NOT NULL AND hc.avg_daily_sessions > 0 THEN
            -- Coeficiente de variação invertido: menor variação = maior consistência
            GREATEST(0, 30 - ((hc.stddev_daily_sessions / hc.avg_daily_sessions) * 30))
          WHEN hb.qtd_dias >= 3 THEN 25  -- Fallback se não conseguir calcular
          WHEN hb.qtd_dias >= 2 THEN 20
          ELSE 15
        END::numeric, 1
      ) AS consistency_score,
      -- Dados adicionais para auditoria
      hs.max_sessions,
      hs.max_aparelhos,
      COALESCE(hc.avg_daily_sessions, hb.total_sessions::numeric / NULLIF(hb.qtd_dias, 0)) AS avg_daily_sessions,
      COALESCE(hc.stddev_daily_sessions, 0) AS stddev_daily_sessions,
      -- Score total
      LEAST(100, GREATEST(0, 
        ROUND(
          -- Volume (40 pontos)
          (hb.total_sessions::numeric / NULLIF(hs.max_sessions, 0) * 40) +
          -- Diversidade (30 pontos)
          (hb.qtd_aparelhos::numeric / NULLIF(hs.max_aparelhos, 0) * 30) +
          -- Consistência (30 pontos) - calculada corretamente
          CASE 
            WHEN hc.stddev_daily_sessions IS NOT NULL AND hc.avg_daily_sessions > 0 THEN
              GREATEST(0, 30 - ((hc.stddev_daily_sessions / hc.avg_daily_sessions) * 30))
            WHEN hb.qtd_dias >= 3 THEN 25
            WHEN hb.qtd_dias >= 2 THEN 20
            ELSE 15
          END
        )::numeric, 0
      )) AS health_score
    FROM health_base hb
    CROSS JOIN health_stats hs
    LEFT JOIN health_consistency hc ON hb.store_name = hc.store_name
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
$function$;

-- Add comment documenting the change
COMMENT ON FUNCTION public.get_performance_metrics(text[], text[], text[], text[], text[], text[], text[], text[]) IS 
'Updated to accept array parameters for multiple selection filtering. 
Maintains backward compatibility through normalize_filter_param function.
All filter parameters now accept arrays and use ANY() operator for filtering.
Date: 2026-04-17';