-- RT1.0 — Item 1.1: Fix cast pure_date::text nas 5 RPCs
-- Problema: pure_date::text = ANY(p_dates) impede uso do índice idx_interactions_date
-- Solução:  pure_date = ANY(p_dates::date[]) — cast no parâmetro, não na coluna
-- Data: 2026-05-06
-- RPCs afetadas: get_heatmap_metrics, get_overview_metrics, get_performance_metrics,
--                get_positivacao_metrics, get_store_xray

-- ============================================================
-- RPC 1: get_heatmap_metrics
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_heatmap_metrics"(
    "p_shopping" "text"[] DEFAULT NULL::"text"[],
    "p_rede" "text"[] DEFAULT NULL::"text"[],
    "p_store_name" "text"[] DEFAULT NULL::"text"[],
    "p_linha" "text"[] DEFAULT NULL::"text"[],
    "p_regional" "text"[] DEFAULT NULL::"text"[],
    "p_p8020" "text"[] DEFAULT NULL::"text"[],
    "p_visibilidade" "text"[] DEFAULT NULL::"text"[],
    "p_dates" "text"[] DEFAULT NULL::"text"[],
    "p_aparelho" "text"[] DEFAULT NULL::"text"[]
) RETURNS json
LANGUAGE "plpgsql"
AS $$
DECLARE
    result json;
BEGIN
    WITH filtered_global AS (
        SELECT aparelho, linha_de_produto, store_name, shopping, rede, sessions, pure_date, faixa
        FROM interactions
        WHERE (p_shopping IS NULL OR shopping = ANY(p_shopping))
          AND (p_rede IS NULL OR rede = ANY(p_rede))
          AND (p_store_name IS NULL OR store_name = ANY(p_store_name))
          AND (p_linha IS NULL OR linha_de_produto = ANY(p_linha))
          AND (p_regional IS NULL OR regional = ANY(p_regional))
          AND (p_p8020 IS NULL OR p8020 = ANY(p_p8020))
          AND (p_visibilidade IS NULL OR visibilidade = ANY(p_visibilidade))
          AND (p_dates IS NULL OR pure_date = ANY(p_dates::date[]))
          AND aparelho IS NOT NULL AND pure_date IS NOT NULL AND faixa IS NOT NULL
    ),
    filtered_prod AS (
        SELECT * FROM filtered_global
        WHERE (p_aparelho IS NULL OR aparelho = ANY(p_aparelho))
    ),
    aparelhos_list AS (
        SELECT DISTINCT aparelho FROM filtered_global
        WHERE aparelho IS NOT NULL AND aparelho <> '' ORDER BY aparelho
    ),
    heatmap_agg AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda-feira' WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira' WHEN 4 THEN 'Quinta-feira' WHEN 5 THEN 'Sexta-feira' WHEN 6 THEN 'Sábado'
            END AS day_name,
            EXTRACT(HOUR FROM faixa::time)::int AS hour, SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY EXTRACT(DOW FROM pure_date), hour
    ),
    heatmap_drill_agg AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda-feira' WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira' WHEN 4 THEN 'Quinta-feira' WHEN 5 THEN 'Sexta-feira' WHEN 6 THEN 'Sábado'
            END AS day_name,
            EXTRACT(HOUR FROM faixa::time)::int AS hour, aparelho, SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY EXTRACT(DOW FROM pure_date), hour, aparelho
    ),
    heatmap_rede_agg AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda-feira' WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira' WHEN 4 THEN 'Quinta-feira' WHEN 5 THEN 'Sexta-feira' WHEN 6 THEN 'Sábado'
            END AS day_name,
            EXTRACT(HOUR FROM faixa::time)::int AS hour, COALESCE(rede, 'N/A') AS rede, SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY EXTRACT(DOW FROM pure_date), hour, rede
    ),
    heatmap_cat_agg AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda-feira' WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira' WHEN 4 THEN 'Quinta-feira' WHEN 5 THEN 'Sexta-feira' WHEN 6 THEN 'Sábado'
            END AS day_name,
            EXTRACT(HOUR FROM faixa::time)::int AS hour, COALESCE(linha_de_produto, 'N/A') AS linha_de_produto, SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY EXTRACT(DOW FROM pure_date), hour, linha_de_produto
    ),
    radar_prod_agg AS (
        SELECT EXTRACT(HOUR FROM faixa::time)::int AS hour, SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY hour ORDER BY hour
    ),
    radar_cat_agg AS (
        SELECT EXTRACT(HOUR FROM faixa::time)::int AS hour, SUM(sessions) AS total
        FROM filtered_global
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
          AND (p_aparelho IS NULL OR NOT (aparelho = ANY(p_aparelho)))
        GROUP BY hour ORDER BY hour
    ),
    canal_agg AS (
        SELECT EXTRACT(HOUR FROM faixa::time)::int AS hour,
            CASE WHEN UPPER(TRIM(shopping)) = 'LOJA DE RUA' THEN 'Rua' ELSE 'Shopping' END AS tipo,
            SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY hour, tipo ORDER BY hour
    ),
    semana_agg AS (
        SELECT EXTRACT(HOUR FROM faixa::time)::int AS hour,
            CASE WHEN EXTRACT(DOW FROM pure_date) IN (0, 6) THEN 'Fim de Semana' ELSE 'Dias Úteis' END AS tipo,
            SUM(sessions) AS total
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY hour, tipo ORDER BY hour
    ),
    dia_semana_agg AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda-feira' WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira' WHEN 4 THEN 'Quinta-feira' WHEN 5 THEN 'Sexta-feira' WHEN 6 THEN 'Sábado'
            END AS day_name,
            SUM(sessions) AS total
        FROM filtered_prod GROUP BY EXTRACT(DOW FROM pure_date)
    ),
    stores_agg AS (
        SELECT store_name, SUM(sessions) AS total
        FROM filtered_prod WHERE store_name IS NOT NULL
        GROUP BY store_name ORDER BY total DESC LIMIT 1
    ),
    peak_hours AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo' WHEN 1 THEN 'Segunda-feira' WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira' WHEN 4 THEN 'Quinta-feira' WHEN 5 THEN 'Sexta-feira' WHEN 6 THEN 'Sábado'
            END AS day_name,
            EXTRACT(HOUR FROM faixa::time)::int AS hour, SUM(sessions) AS total,
            ROW_NUMBER() OVER (ORDER BY SUM(sessions) DESC) AS rank
        FROM filtered_prod
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY EXTRACT(DOW FROM pure_date), EXTRACT(HOUR FROM faixa::time)::int
        ORDER BY total DESC LIMIT 2
    ),
    kpis_agg AS (
        SELECT
            SUM(sessions) AS total_sessions,
            (SELECT store_name FROM stores_agg LIMIT 1) AS top_store,
            (SELECT day_name FROM peak_hours WHERE rank = 1) AS peak_primary_day,
            (SELECT hour FROM peak_hours WHERE rank = 1) AS peak_primary_hour,
            (SELECT total FROM peak_hours WHERE rank = 1) AS peak_primary_total,
            (SELECT day_name FROM peak_hours WHERE rank = 2) AS peak_secondary_day,
            (SELECT hour FROM peak_hours WHERE rank = 2) AS peak_secondary_hour,
            (SELECT total FROM peak_hours WHERE rank = 2) AS peak_secondary_total
        FROM filtered_prod
    )
    SELECT json_build_object(
        'kpis', (SELECT row_to_json(k) FROM kpis_agg k),
        'aparelhos', (SELECT json_agg(a.aparelho) FROM aparelhos_list a),
        'heatmap', (SELECT json_agg(row_to_json(h)) FROM heatmap_agg h),
        'heatmap_drill', (SELECT json_agg(row_to_json(d)) FROM heatmap_drill_agg d),
        'heatmap_rede', (SELECT json_agg(row_to_json(r)) FROM heatmap_rede_agg r),
        'heatmap_cat', (SELECT json_agg(row_to_json(c)) FROM heatmap_cat_agg c),
        'radar_prod', (SELECT json_agg(row_to_json(r)) FROM radar_prod_agg r),
        'radar_cat', (SELECT json_agg(row_to_json(r)) FROM radar_cat_agg r),
        'canal', (SELECT json_agg(row_to_json(c)) FROM canal_agg c),
        'semana', (SELECT json_agg(row_to_json(s)) FROM semana_agg s),
        'dia_semana', (SELECT json_agg(row_to_json(d)) FROM dia_semana_agg d)
    ) INTO result;
    RETURN result;
END;
$$;

ALTER FUNCTION "public"."get_heatmap_metrics"(
    "p_shopping" "text"[], "p_rede" "text"[], "p_store_name" "text"[], "p_linha" "text"[],
    "p_regional" "text"[], "p_p8020" "text"[], "p_visibilidade" "text"[], "p_dates" "text"[], "p_aparelho" "text"[]
) OWNER TO "postgres";


-- ============================================================
-- RPC 2: get_overview_metrics
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_overview_metrics"(
    "p_shopping" "text"[] DEFAULT NULL::"text"[],
    "p_rede" "text"[] DEFAULT NULL::"text"[],
    "p_store_name" "text"[] DEFAULT NULL::"text"[],
    "p_linha" "text"[] DEFAULT NULL::"text"[],
    "p_regional" "text"[] DEFAULT NULL::"text"[],
    "p_p8020" "text"[] DEFAULT NULL::"text"[],
    "p_visibilidade" "text"[] DEFAULT NULL::"text"[],
    "p_dates" "text"[] DEFAULT NULL::"text"[]
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    json_result json;
    v_start_date date;
    v_end_date date;
    v_period_days int;       -- duração do período de comparação (7 dias ou range do filtro)
    v_total_period_days int; -- duração real de todos os dados filtrados (para média/dia)
    v_prev_start date;
    v_prev_end date;
    v_max_date date;
BEGIN
    IF p_dates IS NOT NULL AND array_length(p_dates, 1) > 0 THEN
        -- Com filtro de data: usa o range selecionado
        SELECT MIN(d::date), MAX(d::date), MAX(d::date) - MIN(d::date) + 1
        INTO v_start_date, v_end_date, v_period_days
        FROM unnest(p_dates) AS d;

        v_total_period_days := v_period_days;

        -- Período anterior: mesma duração, imediatamente antes
        v_prev_start := v_start_date - v_period_days;
        v_prev_end   := v_start_date - 1;
    ELSE
        -- Sem filtro de data: calcula o range total dos dados para média/dia
        SELECT MIN(pure_date::date), MAX(pure_date::date), MAX(pure_date::date) - MIN(pure_date::date) + 1
        INTO v_start_date, v_max_date, v_total_period_days
        FROM interactions;

        -- Para comparação: última semana (7 dias até a data máxima)
        v_end_date    := v_max_date;
        v_start_date  := v_max_date - 6;
        v_period_days := 7;

        -- Período anterior: semana anterior
        v_prev_start := v_start_date - 7;
        v_prev_end   := v_start_date - 1;
    END IF;

    WITH filtered_data AS (
        SELECT pure_date, faixa, store_name, device_code, sessions::numeric AS sessions,
               rede, aparelho, tipo, shopping, linha_de_produto
        FROM interactions
        WHERE (p_shopping IS NULL OR shopping = ANY(p_shopping))
          AND (p_rede IS NULL OR rede = ANY(p_rede))
          AND (p_store_name IS NULL OR store_name = ANY(p_store_name))
          AND (p_linha IS NULL OR linha_de_produto = ANY(p_linha))
          AND (p_regional IS NULL OR regional = ANY(p_regional))
          AND (p_p8020 IS NULL OR p8020 = ANY(p_p8020))
          AND (p_visibilidade IS NULL OR visibilidade = ANY(p_visibilidade))
          AND (p_dates IS NULL OR array_length(p_dates, 1) IS NULL OR pure_date = ANY(p_dates::date[]))
    ),
    previous_period_data AS (
        SELECT
            SUM(sessions::numeric) AS total_sessions,
            COUNT(DISTINCT store_name) AS unique_stores,
            COUNT(DISTINCT device_code) AS unique_devices
        FROM interactions
        WHERE pure_date::date >= v_prev_start
          AND pure_date::date <= v_prev_end
          AND (p_shopping IS NULL OR shopping = ANY(p_shopping))
          AND (p_rede IS NULL OR rede = ANY(p_rede))
          AND (p_store_name IS NULL OR store_name = ANY(p_store_name))
          AND (p_linha IS NULL OR linha_de_produto = ANY(p_linha))
          AND (p_regional IS NULL OR regional = ANY(p_regional))
          AND (p_p8020 IS NULL OR p8020 = ANY(p_p8020))
          AND (p_visibilidade IS NULL OR visibilidade = ANY(p_visibilidade))
    ),
    -- Dados da semana atual (para KPIs de comparativo quando sem filtro de data)
    current_week_data AS (
        SELECT
            SUM(sessions::numeric) AS total_sessions,
            COUNT(DISTINCT store_name) AS unique_stores,
            COUNT(DISTINCT device_code) AS unique_devices
        FROM interactions
        WHERE pure_date::date >= v_start_date
          AND pure_date::date <= v_end_date
          AND (p_shopping IS NULL OR shopping = ANY(p_shopping))
          AND (p_rede IS NULL OR rede = ANY(p_rede))
          AND (p_store_name IS NULL OR store_name = ANY(p_store_name))
          AND (p_linha IS NULL OR linha_de_produto = ANY(p_linha))
          AND (p_regional IS NULL OR regional = ANY(p_regional))
          AND (p_p8020 IS NULL OR p8020 = ANY(p_p8020))
          AND (p_visibilidade IS NULL OR visibilidade = ANY(p_visibilidade))
    ),
    top_store_agg AS (
        SELECT store_name, SUM(sessions) AS total
        FROM filtered_data WHERE store_name IS NOT NULL
        GROUP BY store_name ORDER BY total DESC LIMIT 1
    ),
    peak_hours AS (
        SELECT faixa, SUM(sessions) AS total,
               ROW_NUMBER() OVER (ORDER BY SUM(sessions) DESC) AS rank
        FROM filtered_data WHERE faixa IS NOT NULL
        GROUP BY faixa ORDER BY total DESC LIMIT 2
    ),
    weekly_growth AS (
        SELECT DATE_TRUNC('week', pure_date::date)::date AS week_start,
               SUM(sessions) AS total
        FROM filtered_data WHERE pure_date IS NOT NULL
        GROUP BY week_start ORDER BY week_start
    ),
    monthly_growth AS (
        SELECT DATE_TRUNC('month', pure_date::date)::date AS month_start,
               TO_CHAR(DATE_TRUNC('month', pure_date::date), 'TMMonth/YYYY') AS month_label,
               SUM(sessions) AS total
        FROM filtered_data WHERE pure_date IS NOT NULL
        GROUP BY month_start, month_label ORDER BY month_start
    )
    SELECT json_build_object(
        'kpis', (
            SELECT json_build_object(
                'total_sessions', COALESCE(SUM(sessions), 0),
                'unique_stores', COUNT(DISTINCT store_name),
                'unique_devices', COUNT(DISTINCT device_code),
                'top_store', (SELECT store_name FROM top_store_agg LIMIT 1),
                -- Comparativo: semana/período atual vs anterior
                'current_week_sessions', (SELECT COALESCE(total_sessions, 0) FROM current_week_data),
                'current_week_stores', (SELECT COALESCE(unique_stores, 0) FROM current_week_data),
                'current_week_devices', (SELECT COALESCE(unique_devices, 0) FROM current_week_data),
                'previous_period_sessions', (SELECT COALESCE(total_sessions, 0) FROM previous_period_data),
                'previous_unique_stores', (SELECT COALESCE(unique_stores, 0) FROM previous_period_data),
                'previous_unique_devices', (SELECT COALESCE(unique_devices, 0) FROM previous_period_data),
                'previous_period_days', v_period_days,
                'prev_range_days', (v_prev_end - v_prev_start + 1),
                'growth_rate', CASE
                    WHEN (SELECT total_sessions FROM previous_period_data) > 0
                    THEN ROUND(((SELECT COALESCE(total_sessions, 0) FROM current_week_data) - (SELECT total_sessions FROM previous_period_data))
                             / (SELECT total_sessions FROM previous_period_data) * 100::numeric, 1)
                    ELSE 0
                END,
                'period_start', v_start_date,
                'period_end', v_end_date,
                'period_days', v_total_period_days
            ) FROM filtered_data
        ),
        'peak_hours', (
            SELECT json_build_object(
                'primary', (SELECT json_build_object('faixa', faixa, 'total', total) FROM peak_hours WHERE rank = 1),
                'secondary', (SELECT json_build_object('faixa', faixa, 'total', total) FROM peak_hours WHERE rank = 2)
            )
        ),
        'weekly_growth', (
            SELECT COALESCE(json_agg(
                json_build_object('week_start', week_start, 'week_label', 'Sem ' || TO_CHAR(week_start, 'IW/YYYY'), 'total', total)
                ORDER BY week_start
            ), '[]'::json)
            FROM weekly_growth
        ),
        'monthly_growth', (
            SELECT COALESCE(json_agg(
                json_build_object('month_start', month_start, 'month_label', month_label, 'total', total)
                ORDER BY month_start
            ), '[]'::json)
            FROM monthly_growth
        ),
        'timeline', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT pure_date, linha_de_produto, SUM(sessions) as total
                FROM filtered_data GROUP BY pure_date, linha_de_produto
            ) t
        ),
        'faixa', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT faixa, linha_de_produto, SUM(sessions) as total
                FROM filtered_data GROUP BY faixa, linha_de_produto
            ) t
        ),
        'rede', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT rede, linha_de_produto, SUM(sessions) as total
                FROM filtered_data GROUP BY rede, linha_de_produto
            ) t
        ),
        'shop', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT shopping, SUM(sessions) as total
                FROM filtered_data GROUP BY shopping
            ) t
        ),
        'linha', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT linha_de_produto, SUM(sessions) as total
                FROM filtered_data GROUP BY linha_de_produto
            ) t
        ),
        'aparelhos', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT aparelho, tipo, COUNT(DISTINCT device_code) as devices, SUM(sessions) as total
                FROM filtered_data GROUP BY aparelho, tipo
            ) t
        ),
        'modelos_por_linha', (
            SELECT COALESCE(json_agg(t), '[]'::json) FROM (
                SELECT linha_de_produto,
                       (aparelho || ' ' || tipo) AS modelo,
                       SUM(sessions) as total
                FROM filtered_data
                WHERE aparelho IS NOT NULL AND tipo IS NOT NULL
                GROUP BY linha_de_produto, aparelho, tipo
                ORDER BY linha_de_produto, total DESC
            ) t
        )
    ) INTO json_result;

    RETURN json_result;
END;
$$;

ALTER FUNCTION "public"."get_overview_metrics"(
    "p_shopping" "text"[], "p_rede" "text"[], "p_store_name" "text"[], "p_linha" "text"[],
    "p_regional" "text"[], "p_p8020" "text"[], "p_visibilidade" "text"[], "p_dates" "text"[]
) OWNER TO "postgres";


-- ============================================================
-- RPC 3: get_performance_metrics
-- ============================================================

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
      AND (p_dates IS NULL OR pure_date = ANY(p_dates::date[]))
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


-- ============================================================
-- RPC 4: get_positivacao_metrics
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_positivacao_metrics"(
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
        SELECT store_name, aparelho, linha_de_produto, device_code, rede, shopping
        FROM interactions
        WHERE (p_shopping IS NULL OR shopping = ANY(p_shopping))
          AND (p_rede IS NULL OR rede = ANY(p_rede))
          AND (p_store_name IS NULL OR store_name = ANY(p_store_name))
          AND (p_linha IS NULL OR linha_de_produto = ANY(p_linha))
          AND (p_regional IS NULL OR regional = ANY(p_regional))
          AND (p_p8020 IS NULL OR p8020 = ANY(p_p8020))
          AND (p_visibilidade IS NULL OR visibilidade = ANY(p_visibilidade))
          AND (p_dates IS NULL OR pure_date = ANY(p_dates::date[]))
          AND aparelho IS NOT NULL
          AND store_name IS NOT NULL
    ),
    produtos_agg AS (
        SELECT aparelho, MAX(linha_de_produto) AS linha_de_produto,
            COUNT(DISTINCT device_code) AS qtd_unidades, COUNT(DISTINCT store_name) AS qtd_lojas
        FROM filtered GROUP BY aparelho ORDER BY COUNT(DISTINCT device_code) DESC
    ),
    matriz_agg AS (
        SELECT DISTINCT store_name, aparelho FROM filtered
    ),
    kpis_agg AS (
        SELECT
            COUNT(DISTINCT store_name) AS total_lojas,
            COUNT(DISTINCT aparelho) AS total_aparelhos,
            (SELECT aparelho FROM filtered GROUP BY aparelho ORDER BY COUNT(DISTINCT store_name) DESC LIMIT 1) AS top_capilaridade,
            (SELECT COUNT(DISTINCT store_name) FROM filtered GROUP BY aparelho ORDER BY COUNT(DISTINCT store_name) DESC LIMIT 1) AS top_capilaridade_lojas
        FROM filtered
    ),
    cobertura_linha_rede AS (
        SELECT linha_de_produto, rede,
            COUNT(DISTINCT store_name) AS lojas_com_linha,
            (SELECT COUNT(DISTINCT store_name) FROM filtered f2 WHERE f2.rede = f1.rede) AS total_lojas_rede,
            ROUND((COUNT(DISTINCT store_name)::numeric / NULLIF((SELECT COUNT(DISTINCT store_name) FROM filtered f2 WHERE f2.rede = f1.rede), 0) * 100)::numeric, 1) AS percentual_cobertura
        FROM filtered f1
        WHERE linha_de_produto IS NOT NULL AND rede IS NOT NULL
        GROUP BY linha_de_produto, rede ORDER BY linha_de_produto, rede
    ),
    cobertura_linha_shopping AS (
        SELECT linha_de_produto, shopping AS tipo,
            COUNT(DISTINCT store_name) AS lojas_com_linha,
            (SELECT COUNT(DISTINCT store_name) FROM filtered f2 WHERE f2.shopping = f1.shopping) AS total_lojas_tipo,
            ROUND((COUNT(DISTINCT store_name)::numeric / NULLIF((SELECT COUNT(DISTINCT store_name) FROM filtered f2 WHERE f2.shopping = f1.shopping), 0) * 100)::numeric, 1) AS percentual_cobertura
        FROM filtered f1
        WHERE linha_de_produto IS NOT NULL AND shopping IS NOT NULL
        GROUP BY linha_de_produto, shopping ORDER BY linha_de_produto, shopping
    ),
    cobertura_linha_loja AS (
        SELECT linha_de_produto, store_name,
            COUNT(DISTINCT aparelho) AS qtd_aparelhos, COUNT(DISTINCT device_code) AS qtd_unidades
        FROM filtered
        WHERE linha_de_produto IS NOT NULL AND store_name IS NOT NULL
        GROUP BY linha_de_produto, store_name ORDER BY linha_de_produto, store_name
    )
    SELECT json_build_object(
        'kpis', (SELECT row_to_json(kpis_agg) FROM kpis_agg),
        'produtos', (SELECT json_agg(row_to_json(p)) FROM produtos_agg p),
        'matriz', (SELECT json_agg(row_to_json(m)) FROM matriz_agg m),
        'cobertura_linha_rede', (SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) FROM cobertura_linha_rede c),
        'cobertura_linha_shopping', (SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) FROM cobertura_linha_shopping c),
        'cobertura_linha_loja', (SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) FROM cobertura_linha_loja c)
    ) INTO result;
    RETURN result;
END;
$$;

ALTER FUNCTION "public"."get_positivacao_metrics"(
    "p_shopping" "text"[], "p_rede" "text"[], "p_store_name" "text"[], "p_linha" "text"[],
    "p_regional" "text"[], "p_p8020" "text"[], "p_visibilidade" "text"[], "p_dates" "text"[]
) OWNER TO "postgres";


-- ============================================================
-- RPC 5: get_store_xray
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."get_store_xray"(
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
    p_shopping_norm text[];
    p_rede_norm text[];
    p_store_name_norm text[];
    p_linha_norm text[];
    p_regional_norm text[];
    p_p8020_norm text[];
    p_visibilidade_norm text[];
BEGIN
    p_shopping_norm := normalize_filter_param(p_shopping);
    p_rede_norm := normalize_filter_param(p_rede);
    p_store_name_norm := normalize_filter_param(p_store_name);
    p_linha_norm := normalize_filter_param(p_linha);
    p_regional_norm := normalize_filter_param(p_regional);
    p_p8020_norm := normalize_filter_param(p_p8020);
    p_visibilidade_norm := normalize_filter_param(p_visibilidade);

    WITH filtered AS (
        SELECT aparelho, linha_de_produto, sessions, pure_date, faixa
        FROM interactions
        WHERE (p_shopping_norm IS NULL OR shopping = ANY(p_shopping_norm))
          AND (p_rede_norm IS NULL OR rede = ANY(p_rede_norm))
          AND (p_store_name_norm IS NULL OR store_name = ANY(p_store_name_norm))
          AND (p_linha_norm IS NULL OR linha_de_produto = ANY(p_linha_norm))
          AND (p_regional_norm IS NULL OR regional = ANY(p_regional_norm))
          AND (p_p8020_norm IS NULL OR p8020 = ANY(p_p8020_norm))
          AND (p_visibilidade_norm IS NULL OR visibilidade = ANY(p_visibilidade_norm))
          AND (p_dates IS NULL OR pure_date = ANY(p_dates::date[]))
          AND aparelho IS NOT NULL
          AND sessions IS NOT NULL
          AND faixa IS NOT NULL
    ),

    total_agg AS (
        SELECT SUM(sessions) AS total_sessions FROM filtered
    ),

    aparelhos_agg AS (
        SELECT aparelho, SUM(sessions) AS total
        FROM filtered
        GROUP BY aparelho
        ORDER BY total DESC
    ),

    hourly_agg AS (
        SELECT EXTRACT(HOUR FROM faixa::time)::int AS hour, SUM(sessions) AS total
        FROM filtered
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY hour
        ORDER BY hour
    ),

    weekday_agg AS (
        SELECT
            CASE EXTRACT(DOW FROM pure_date)
                WHEN 0 THEN 'Domingo'
                WHEN 1 THEN 'Segunda-feira'
                WHEN 2 THEN 'Terça-feira'
                WHEN 3 THEN 'Quarta-feira'
                WHEN 4 THEN 'Quinta-feira'
                WHEN 5 THEN 'Sexta-feira'
                WHEN 6 THEN 'Sábado'
            END AS day_name,
            SUM(sessions) AS total
        FROM filtered
        GROUP BY EXTRACT(DOW FROM pure_date)
    ),

    weektype_agg AS (
        SELECT
            EXTRACT(HOUR FROM faixa::time)::int AS hour,
            CASE WHEN EXTRACT(DOW FROM pure_date) IN (0, 6) THEN 'Fim de Semana' ELSE 'Dias Úteis' END AS tipo,
            SUM(sessions) AS total
        FROM filtered
        WHERE EXTRACT(HOUR FROM faixa::time) BETWEEN 10 AND 22
        GROUP BY hour, tipo
        ORDER BY hour
    ),

    product_line_agg AS (
        SELECT COALESCE(linha_de_produto, 'N/A') AS linha_de_produto, SUM(sessions) AS total
        FROM filtered
        GROUP BY linha_de_produto
        ORDER BY total DESC
    )

    SELECT json_build_object(
        'total_sessions', (SELECT total_sessions FROM total_agg),
        'aparelhos', (SELECT json_agg(row_to_json(a)) FROM aparelhos_agg a),
        'hourly', (SELECT json_agg(row_to_json(h)) FROM hourly_agg h),
        'weekday', (SELECT json_agg(row_to_json(w)) FROM weekday_agg w),
        'weektype', (SELECT json_agg(row_to_json(wt)) FROM weektype_agg wt),
        'product_line', (SELECT json_agg(row_to_json(p)) FROM product_line_agg p)
    ) INTO result;

    RETURN result;
END;
$$;

ALTER FUNCTION "public"."get_store_xray"(
    "p_shopping" "text"[], "p_rede" "text"[], "p_store_name" "text"[], "p_linha" "text"[],
    "p_regional" "text"[], "p_p8020" "text"[], "p_visibilidade" "text"[], "p_dates" "text"[]
) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."get_store_xray"(
    "p_shopping" "text"[], "p_rede" "text"[], "p_store_name" "text"[], "p_linha" "text"[],
    "p_regional" "text"[], "p_p8020" "text"[], "p_visibilidade" "text"[], "p_dates" "text"[]
) IS 'Retorna raio-x detalhado de uma loja: aparelhos ativos, fluxo por hora, dia da semana, semana vs fds, linha de produto.
Usa normalize_filter_param para compatibilidade com filtros de array.
Date: 2026-04-20';
