-- BACKUP: get_positivacao_metrics
-- Data: 2026-05-06
-- Fonte: supabase db dump --linked (projeto zkxzjrlhuyjqikzszrjx)

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
          AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))
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
