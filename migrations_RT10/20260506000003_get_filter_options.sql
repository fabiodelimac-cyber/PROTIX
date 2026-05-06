-- RT1.0 — Item 1.2: RPC get_filter_options() — substitui select(*) da tabela inteira
-- Problema: initData() faz from(interactions).select(*) sem limite, puxando a tabela inteira
-- Solução:  RPC que retorna apenas combinações únicas das colunas de filtro (~200-400 linhas)
--           + devices_by_linha para o tooltip de aparelhos na Overview
-- Data: 2026-05-06

CREATE OR REPLACE FUNCTION "public"."get_filter_options"()
RETURNS json
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'combinations', (
                SELECT json_agg(row_to_json(t))
                FROM (
                    SELECT DISTINCT
                        shopping,
                        store_name,
                        rede,
                        linha_de_produto,
                        regional,
                        p8020,
                        visibilidade,
                        pure_date::text AS pure_date
                    FROM interactions
                ) t
            ),
            'devices_by_linha', (
                SELECT json_agg(row_to_json(d))
                FROM (
                    SELECT linha_de_produto, COUNT(DISTINCT device_code) AS total
                    FROM interactions
                    GROUP BY linha_de_produto
                ) d
            )
        )
    );
END;
$$;

ALTER FUNCTION "public"."get_filter_options"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."get_filter_options"() IS
'Retorna combinações únicas das colunas de filtro e contagem de devices por linha.
Substitui o select(*) da tabela inteira no initData().
Escala até ~100k combinações únicas (~1.5-2 anos) sem intervenção.
Date: 2026-05-06';
