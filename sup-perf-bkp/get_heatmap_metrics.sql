-- BACKUP: get_heatmap_metrics
-- Data: 2026-05-06
-- Fonte: supabase db dump --linked (projeto zkxzjrlhuyjqikzszrjx)

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
          AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))
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
