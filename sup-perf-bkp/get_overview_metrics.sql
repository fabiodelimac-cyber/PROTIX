-- BACKUP: get_overview_metrics
-- Data: 2026-05-06
-- Fonte: supabase db dump --linked (projeto zkxzjrlhuyjqikzszrjx)

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
          AND (p_dates IS NULL OR array_length(p_dates, 1) IS NULL OR pure_date::text = ANY(p_dates))
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
