-- Migration: Create normalize_filter_param helper function
-- Purpose: Handle backward compatibility for array parameters in stored procedures
-- Date: 2026-04-17

-- Create helper function for parameter normalization
CREATE OR REPLACE FUNCTION public.normalize_filter_param(param_value ANYELEMENT)
RETURNS TEXT[] AS $$
BEGIN
    -- Se é NULL, retorna NULL (sem filtro)
    IF param_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Se é array, verifica se está vazio
    IF pg_typeof(param_value) = 'text[]'::regtype THEN
        -- Se é array vazio, retorna NULL (sem filtro)
        IF array_length(param_value::TEXT[], 1) IS NULL THEN
            RETURN NULL;
        END IF;
        -- Se é array com valores, retorna como está
        RETURN param_value::TEXT[];
    END IF;
    
    -- Se é string única, converte para array
    IF pg_typeof(param_value) = 'text'::regtype THEN
        -- Se é string vazia ou "TODOS", retorna NULL (sem filtro)
        IF param_value::TEXT = '' OR param_value::TEXT = 'TODOS' THEN
            RETURN NULL;
        END IF;
        -- Converte string única para array
        RETURN ARRAY[param_value::TEXT];
    END IF;
    
    -- Para outros tipos, tenta converter para texto e depois array
    RETURN ARRAY[param_value::TEXT];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentário da função
COMMENT ON FUNCTION public.normalize_filter_param(ANYELEMENT) IS 
'Normaliza parâmetros de filtro para arrays, mantendo backward compatibility. 
Converte strings únicas para arrays de um elemento, mantém arrays como estão, 
e retorna NULL para valores vazios ou "TODOS".';