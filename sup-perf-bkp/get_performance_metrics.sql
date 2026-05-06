-- BACKUP: get_performance_metrics
-- Data: 2026-05-06
-- Fonte: supabase db dump --linked (projeto zkxzjrlhuyjqikzszrjx)

CREATE OR REPLACE FUNCTION "public"."get_performance_metrics"(
    "p_shopping" "text"[] DEFAULT NULL::"text"[],
    "p_rede" "text"[] DEFAULT NULL::"text"[],
    "p_store_name" "text"[] DEFAULT NULL::"text"[],
    "p_linha" "text"[] DEFAULT NULL::"text"[],
    "p_regional" "text"[] DEFAULT NULL::"text"[],
    "p_p8020" "text"[] DEFAULT NULL::"text"[],
    "p_visibilidade" "text"[] DEFAULT NULL::"text"[],
    "p_dates" "text"[] DEFAULT NULL::"text"[]
) RETURNS json
LANGUAGE "plpgsql"
AS $$
DECLARE
  result json;
BEGIN
  WITH filtered AS (
    SELECT store_name, aparelho, linha_de_produto, device_code, sessions, pure_date
    FROM interactions
    WHERE (p_shopping IS NULL OR shopping = ANY(p_shopping))
      AND (p_rede IS NULL OR rede = ANY(p_rede))
      AND (p_store_name IS NULL OR store_name = ANY(p_store_name))
      AND (p_linha IS NULL OR linha_de_produto = ANY(p_linha))
      AND (p_regional IS NULL OR regional = ANY(p_regional))
      AND (p_p8020 IS NULL OR p8020 = ANY(p_p8020))
      AND (p_visibilidade IS NULL OR visibilidade = ANY(p_visibilidade))
      AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))
      AND aparelho IS NOT NULL AND store_name IS NOT NULL AND sessions IS NOT NULL
  ),
  top10_agg AS (
    SELECT store_name, SUM(sessions) AS total
    FROM filtered GROUP BY store_name ORDER BY total DESC LIMIT 10
  ),
  bottom10_agg AS (
    SELECT store_name, SUM(sessions) AS total
    FROM filtered GROUP BY store_name ORDER BY total ASC LIMIT 10
  ),
  efficiency_agg AS (
    SELECT aparelho, linha_de_produto,
      COUNT(DISTINCT device_code) AS qtd_unidades,
      SUM(sessions) AS total_sessions,
      CASE WHEN COUNT(DISTINCT device_code) > 0
        THEN ROUND((SUM(sessions) / COUNT(DISTINCT device_code))::numeric, 2)
        ELSE 0
      END AS efficiency
    FROM filtered
    GROUP BY aparelho, linha_de_produto
    HAVING COUNT(DISTINCT device_code) > 0
    ORDER BY efficiency DESC
  ),
  growth_base AS (
    SELECT aparelho, linha_de_produto, pure_date, SUM(sessions) as daily_sessions
    FROM filtered
    WHERE aparelho IS NOT NULL AND sessions IS NOT NULL AND linha_de_produto IS NOT NULL
    GROUP BY aparelho, linha_de_produto, pure_date
  ),
  growth_stats AS (
    SELECT aparelho, linha_de_produto,
      COUNT(*) as unique_dates,
      AVG(daily_sessions) AS avg_daily_sessions,
      MAX(pure_date) AS last_date
    FROM growth_base
    GROUP BY aparelho, linha_de_produto
  ),
  growth_last_day AS (
    SELECT gb.aparelho, gb.linha_de_produto, gb.daily_sessions as last_day_sessions
    FROM growth_base gb
    INNER JOIN growth_stats gs
      ON gb.aparelho = gs.aparelho
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
      CASE
        WHEN gs.avg_daily_sessions > 0 AND gld.last_day_sessions IS NOT NULL THEN
          ROUND(((gld.last_day_sessions - gs.avg_daily_sessions) / gs.avg_daily_sessions * 100)::numeric, 1)
        ELSE 0.0
      END AS growth_rate
    FROM growth_stats gs
    LEFT JOIN growth_last_day gld
      ON gs.aparelho = gld.aparelho
      AND gs.linha_de_produto = gld.linha_de_produto
    ORDER BY gs.linha_de_produto ASC, gs.aparelho ASC
  ),
  health_base AS (
    SELECT store_name,
      SUM(sessions) AS total_sessions,
      COUNT(DISTINCT aparelho) AS qtd_aparelhos,
      COUNT(DISTINCT pure_date) AS qtd_dias
    FROM filtered
    GROUP BY store_name
  ),
  health_consistency AS (
    SELECT store_name,
      AVG(daily_sessions) AS avg_daily_sessions,
      STDDEV(daily_sessions) AS stddev_daily_sessions,
      COUNT(*) AS days_count
    FROM (
      SELECT store_name, pure_date, SUM(sessions) AS daily_sessions
      FROM filtered
      GROUP BY store_name, pure_date
    ) daily_data
    GROUP BY store_name
    HAVING COUNT(*) >= 2
  ),
  health_stats AS (
    SELECT MAX(total_sessions) AS max_sessions, MAX(qtd_aparelhos) AS max_aparelhos
    FROM health_base
  ),
  health_agg AS (
    SELECT
      hb.store_name,
      hb.total_sessions,
      hb.qtd_aparelhos,
      hb.qtd_dias,
      ROUND((hb.total_sessions::numeric / NULLIF(hs.max_sessions, 0) * 40)::numeric, 1) AS volume_score,
      ROUND((hb.qtd_aparelhos::numeric / NULLIF(hs.max_aparelhos, 0) * 30)::numeric, 1) AS diversity_score,
      ROUND(
        CASE
          WHEN hc.stddev_daily_sessions IS NOT NULL AND hc.avg_daily_sessions > 0 THEN
            GREATEST(0, 30 - ((hc.stddev_daily_sessions / hc.avg_daily_sessions) * 30))
          WHEN hb.qtd_dias >= 3 THEN 25
          WHEN hb.qtd_dias >= 2 THEN 20
          ELSE 15
        END::numeric, 1
      ) AS consistency_score,
      hs.max_sessions,
      hs.max_aparelhos,
      COALESCE(hc.avg_daily_sessions, hb.total_sessions::numeric / NULLIF(hb.qtd_dias, 0)) AS avg_daily_sessions,
      COALESCE(hc.stddev_daily_sessions, 0) AS stddev_daily_sessions,
      LEAST(100, GREATEST(0,
        ROUND((
          (hb.total_sessions::numeric / NULLIF(hs.max_sessions, 0) * 40) +
          (hb.qtd_aparelhos::numeric / NULLIF(hs.max_aparelhos, 0) * 30) +
          CASE
            WHEN hc.stddev_daily_sessions IS NOT NULL AND hc.avg_daily_sessions > 0 THEN
              GREATEST(0, 30 - ((hc.stddev_daily_sessions / hc.avg_daily_sessions) * 30))
            WHEN hb.qtd_dias >= 3 THEN 25
            WHEN hb.qtd_dias >= 2 THEN 20
            ELSE 15
          END
        )::numeric, 0)
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
$$;

ALTER FUNCTION "public"."get_performance_metrics"(
    "p_shopping" "text"[], "p_rede" "text"[], "p_store_name" "text"[], "p_linha" "text"[],
    "p_regional" "text"[], "p_p8020" "text"[], "p_visibilidade" "text"[], "p_dates" "text"[]
) OWNER TO "postgres";
