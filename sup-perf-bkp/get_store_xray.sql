-- BACKUP: get_store_xray
-- Data: 2026-05-06
-- Fonte: supabase db dump --linked (projeto zkxzjrlhuyjqikzszrjx)

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
          AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))
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
