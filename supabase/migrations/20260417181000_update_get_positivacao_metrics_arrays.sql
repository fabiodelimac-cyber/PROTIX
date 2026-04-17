-- Migration: Update get_positivacao_metrics to accept array parameters
-- Purpose: Enable multiple selection filtering while maintaining backward compatibility
-- Date: 2026-04-17
-- CRITICAL: This function is used for calculations throughout the dashboard

-- Update get_positivacao_metrics to accept array parameters
CREATE OR REPLACE FUNCTION public.get_positivacao_metrics(
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
            rede,
            shopping
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
          AND store_name IS NOT NULL
    ),
    
    -- Produtos: agrupado por aparelho
    produtos_agg AS (
        SELECT
            aparelho,
            MAX(linha_de_produto) AS linha_de_produto,
            COUNT(DISTINCT device_code) AS qtd_unidades,
            COUNT(DISTINCT store_name) AS qtd_lojas
        FROM filtered
        GROUP BY aparelho
        ORDER BY COUNT(DISTINCT device_code) DESC
    ),
    
    -- Matriz: pares únicos loja x aparelho
    matriz_agg AS (
        SELECT DISTINCT store_name, aparelho
        FROM filtered
    ),
    
    -- KPIs globais
    kpis_agg AS (
        SELECT
            COUNT(DISTINCT store_name) AS total_lojas,
            COUNT(DISTINCT aparelho) AS total_aparelhos,
            -- Aparelho com maior capilaridade (presente em mais lojas)
            (SELECT aparelho
             FROM filtered
             GROUP BY aparelho
             ORDER BY COUNT(DISTINCT store_name) DESC
             LIMIT 1) AS top_capilaridade,
            (SELECT COUNT(DISTINCT store_name)
             FROM filtered
             GROUP BY aparelho
             ORDER BY COUNT(DISTINCT store_name) DESC
             LIMIT 1) AS top_capilaridade_lojas
        FROM filtered
    ),
    
    -- Cobertura por Linha de Produto x Rede
    cobertura_linha_rede AS (
        SELECT
            linha_de_produto,
            rede,
            COUNT(DISTINCT store_name) AS lojas_com_linha,
            (SELECT COUNT(DISTINCT store_name) 
             FROM filtered f2 
             WHERE f2.rede = f1.rede) AS total_lojas_rede,
            ROUND(
                (COUNT(DISTINCT store_name)::numeric / 
                 NULLIF((SELECT COUNT(DISTINCT store_name) FROM filtered f2 WHERE f2.rede = f1.rede), 0) * 100)::numeric,
                1
            ) AS percentual_cobertura
        FROM filtered f1
        WHERE linha_de_produto IS NOT NULL
          AND rede IS NOT NULL
        GROUP BY linha_de_produto, rede
        ORDER BY linha_de_produto, rede
    ),
    
    -- Cobertura por Linha de Produto x Shopping/Loja de Rua
    cobertura_linha_shopping AS (
        SELECT
            linha_de_produto,
            shopping AS tipo,
            COUNT(DISTINCT store_name) AS lojas_com_linha,
            (SELECT COUNT(DISTINCT store_name) 
             FROM filtered f2 
             WHERE f2.shopping = f1.shopping) AS total_lojas_tipo,
            ROUND(
                (COUNT(DISTINCT store_name)::numeric / 
                 NULLIF((SELECT COUNT(DISTINCT store_name) FROM filtered f2 WHERE f2.shopping = f1.shopping), 0) * 100)::numeric,
                1
            ) AS percentual_cobertura
        FROM filtered f1
        WHERE linha_de_produto IS NOT NULL
          AND shopping IS NOT NULL
        GROUP BY linha_de_produto, shopping
        ORDER BY linha_de_produto, shopping
    ),
    
    -- Cobertura por Linha de Produto x Loja (individual)
    cobertura_linha_loja AS (
        SELECT
            linha_de_produto,
            store_name,
            COUNT(DISTINCT aparelho) AS qtd_aparelhos,
            COUNT(DISTINCT device_code) AS qtd_unidades
        FROM filtered
        WHERE linha_de_produto IS NOT NULL
          AND store_name IS NOT NULL
        GROUP BY linha_de_produto, store_name
        ORDER BY linha_de_produto, store_name
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
$function$;

-- Add comment documenting the change
COMMENT ON FUNCTION public.get_positivacao_metrics(text[], text[], text[], text[], text[], text[], text[], text[]) IS 
'Updated to accept array parameters for multiple selection filtering. 
Maintains backward compatibility through normalize_filter_param function.
All filter parameters now accept arrays and use ANY() operator for filtering.
Date: 2026-04-17';