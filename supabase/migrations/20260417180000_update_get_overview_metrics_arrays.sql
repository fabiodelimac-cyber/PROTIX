-- Migration: Update get_overview_metrics to accept array parameters
-- Purpose: Enable multiple selection filtering while maintaining backward compatibility
-- Date: 2026-04-17
-- CRITICAL: This function is used for calculations throughout the dashboard

-- BACKUP: Store current function signature for rollback if needed
-- Original signature: get_overview_metrics(p_shopping text, p_rede text, p_store_name text, p_linha text, p_regional text, p_p8020 text, p_visibilidade text, p_dates text[])

-- Update get_overview_metrics to accept array parameters
CREATE OR REPLACE FUNCTION public.get_overview_metrics(
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
    json_result json;
    v_start_date date;
    v_end_date date;
    v_period_days int;
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

    -- Calcula o período selecionado
    IF p_dates IS NOT NULL AND array_length(p_dates, 1) > 0 THEN
        SELECT MIN(d::date), MAX(d::date), MAX(d::date) - MIN(d::date) + 1
        INTO v_start_date, v_end_date, v_period_days
        FROM unnest(p_dates) AS d;
    ELSE
        -- Se não há filtro de data, pega todo o período disponível
        SELECT MIN(pure_date::date), MAX(pure_date::date), MAX(pure_date::date) - MIN(pure_date::date) + 1
        INTO v_start_date, v_end_date, v_period_days
        FROM interactions;
    END IF;

    WITH filtered_data AS (
        SELECT 
            pure_date, 
            faixa,
            store_name, 
            device_code, 
            sessions::numeric AS sessions, 
            rede, 
            aparelho,
            tipo,
            shopping,
            linha_de_produto
        FROM interactions
        WHERE (p_shopping_norm IS NULL OR shopping = ANY(p_shopping_norm))
          AND (p_rede_norm IS NULL OR rede = ANY(p_rede_norm))
          AND (p_store_name_norm IS NULL OR store_name = ANY(p_store_name_norm))
          AND (p_linha_norm IS NULL OR linha_de_produto = ANY(p_linha_norm))
          AND (p_regional_norm IS NULL OR regional = ANY(p_regional_norm))
          AND (p_p8020_norm IS NULL OR p8020 = ANY(p_p8020_norm))
          AND (p_visibilidade_norm IS NULL OR visibilidade = ANY(p_visibilidade_norm))
          AND (p_dates IS NULL OR array_length(p_dates, 1) IS NULL OR pure_date::text = ANY(p_dates))
    ),
    
    -- Período anterior (mesmo tamanho do período atual)
    previous_period_data AS (
        SELECT 
            SUM(sessions::numeric) AS total_sessions
        FROM interactions
        WHERE pure_date::date >= (v_start_date - v_period_days)
          AND pure_date::date < v_start_date
          AND (p_shopping_norm IS NULL OR shopping = ANY(p_shopping_norm))
          AND (p_rede_norm IS NULL OR rede = ANY(p_rede_norm))
          AND (p_store_name_norm IS NULL OR store_name = ANY(p_store_name_norm))
          AND (p_linha_norm IS NULL OR linha_de_produto = ANY(p_linha_norm))
          AND (p_regional_norm IS NULL OR regional = ANY(p_regional_norm))
          AND (p_p8020_norm IS NULL OR p8020 = ANY(p_p8020_norm))
          AND (p_visibilidade_norm IS NULL OR visibilidade = ANY(p_visibilidade_norm))
    ),
    
    -- Agregação para encontrar a loja com mais interações
    top_store_agg AS (
        SELECT 
            store_name, 
            SUM(sessions) AS total
        FROM filtered_data
        WHERE store_name IS NOT NULL
        GROUP BY store_name
        ORDER BY total DESC
        LIMIT 1
    ),
    
    -- Pico de demanda (top 2 faixas horárias)
    peak_hours AS (
        SELECT 
            faixa,
            SUM(sessions) AS total,
            ROW_NUMBER() OVER (ORDER BY SUM(sessions) DESC) AS rank
        FROM filtered_data
        WHERE faixa IS NOT NULL
        GROUP BY faixa
        ORDER BY total DESC
        LIMIT 2
    ),
    
    -- Dados para gráfico de crescimento semanal
    weekly_growth AS (
        SELECT 
            DATE_TRUNC('week', pure_date::date)::date AS week_start,
            SUM(sessions) AS total
        FROM filtered_data
        WHERE pure_date IS NOT NULL
        GROUP BY week_start
        ORDER BY week_start
    ),
    
    -- Dados para gráfico de crescimento mensal
    monthly_growth AS (
        SELECT 
            DATE_TRUNC('month', pure_date::date)::date AS month_start,
            TO_CHAR(DATE_TRUNC('month', pure_date::date), 'TMMonth/YYYY') AS month_label,
            SUM(sessions) AS total
        FROM filtered_data
        WHERE pure_date IS NOT NULL
        GROUP BY month_start, month_label
        ORDER BY month_start
    )

    SELECT json_build_object(
        'kpis', (
            SELECT json_build_object(
                'total_sessions', COALESCE(SUM(sessions), 0),
                'unique_stores', COUNT(DISTINCT store_name),
                'unique_devices', COUNT(DISTINCT device_code),
                'top_store', (SELECT store_name FROM top_store_agg LIMIT 1),
                'previous_period_sessions', (SELECT COALESCE(total_sessions, 0) FROM previous_period_data),
                'growth_rate', CASE 
                    WHEN (SELECT total_sessions FROM previous_period_data) > 0 
                    THEN ROUND(((COALESCE(SUM(sessions), 0) - (SELECT total_sessions FROM previous_period_data)) / (SELECT total_sessions FROM previous_period_data) * 100)::numeric, 1)
                    ELSE 0 
                END,
                'period_start', v_start_date,
                'period_end', v_end_date,
                'period_days', v_period_days
            ) 
            FROM filtered_data
        ),
        
        'peak_hours', (
            SELECT json_build_object(
                'primary', (SELECT json_build_object('faixa', faixa, 'total', total) FROM peak_hours WHERE rank = 1),
                'secondary', (SELECT json_build_object('faixa', faixa, 'total', total) FROM peak_hours WHERE rank = 2)
            )
        ),
        
        'weekly_growth', (
            SELECT COALESCE(json_agg(json_build_object(
                'week_start', week_start,
                'week_label', 'Sem ' || TO_CHAR(week_start, 'IW/YYYY'),
                'total', total
            ) ORDER BY week_start), '[]'::json)
            FROM weekly_growth
        ),
        
        'monthly_growth', (
            SELECT COALESCE(json_agg(json_build_object(
                'month_start', month_start,
                'month_label', month_label,
                'total', total
            ) ORDER BY month_start), '[]'::json)
            FROM monthly_growth
        ),
        
        'timeline', (
            SELECT COALESCE(json_agg(t), '[]'::json) 
            FROM (
                SELECT pure_date, linha_de_produto, SUM(sessions) as total 
                FROM filtered_data 
                GROUP BY pure_date, linha_de_produto
            ) t
        ),
        
        'faixa', (
            SELECT COALESCE(json_agg(t), '[]'::json) 
            FROM (
                SELECT faixa, linha_de_produto, SUM(sessions) as total 
                FROM filtered_data 
                GROUP BY faixa, linha_de_produto
            ) t
        ),
        
        'rede', (
            SELECT COALESCE(json_agg(t), '[]'::json) 
            FROM (
                SELECT rede, linha_de_produto, SUM(sessions) as total 
                FROM filtered_data 
                GROUP BY rede, linha_de_produto
            ) t
        ),
        
        'shop', (
            SELECT COALESCE(json_agg(t), '[]'::json) 
            FROM (
                SELECT shopping, SUM(sessions) as total 
                FROM filtered_data 
                GROUP BY shopping
            ) t
        ),
        
        'linha', (
            SELECT COALESCE(json_agg(t), '[]'::json) 
            FROM (
                SELECT linha_de_produto, SUM(sessions) as total 
                FROM filtered_data 
                GROUP BY linha_de_produto
            ) t
        ),
        
        'aparelhos', (
            SELECT COALESCE(json_agg(t), '[]'::json) 
            FROM (
                SELECT aparelho, tipo, COUNT(DISTINCT device_code) as devices, SUM(sessions) as total
                FROM filtered_data 
                GROUP BY aparelho, tipo
            ) t
        )
    ) INTO json_result;

    RETURN json_result;
END;
$function$;

-- Add comment documenting the change
COMMENT ON FUNCTION public.get_overview_metrics(text[], text[], text[], text[], text[], text[], text[], text[]) IS 
'Updated to accept array parameters for multiple selection filtering. 
Maintains backward compatibility through normalize_filter_param function.
All filter parameters now accept arrays and use ANY() operator for filtering.
Date: 2026-04-17';