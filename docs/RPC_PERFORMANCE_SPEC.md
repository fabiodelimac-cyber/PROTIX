# Especificação da RPC: get_performance_metrics

## Nome da Função
`get_performance_metrics`

## Parâmetros de Entrada
Todos os parâmetros são opcionais (podem ser NULL):

```sql
p_shopping text DEFAULT NULL,
p_rede text DEFAULT NULL,
p_store_name text DEFAULT NULL,
p_linha text DEFAULT NULL,
p_regional text DEFAULT NULL,
p_p8020 text DEFAULT NULL,
p_visibilidade text DEFAULT NULL,
p_dates text[] DEFAULT NULL
```

## Retorno
A função deve retornar um JSON com a seguinte estrutura:

```json
{
  "top10": [
    {
      "store_name": "string",
      "total": number
    }
  ],
  "bottom10": [
    {
      "store_name": "string",
      "total": number
    }
  ],
  "efficiency": [
    {
      "aparelho": "string",
      "qtd_unidades": number,
      "total_sessions": number,
      "efficiency": number  // total_sessions / qtd_unidades
    }
  ],
  "growth": [
    {
      "aparelho": "string",
      "growth_rate": number  // percentual de crescimento últimos 30 dias
    }
  ],
  "health": [
    {
      "store_name": "string",
      "health_score": number  // 0-100
    }
  ]
}
```

## Lógica de Cada Seção

### 1. TOP10 - Ranking de PDVs (Top 10)
- Agrupa por `store_name`
- Soma `sessions`
- Ordena DESC
- Limita a 10 registros

### 2. BOTTOM10 - Ranking de PDVs (Bottom 10)
- Agrupa por `store_name`
- Soma `sessions`
- Ordena ASC
- Limita a 10 registros

### 3. EFFICIENCY - Eficiência por Aparelho
- Agrupa por `aparelho`
- Conta `DISTINCT device_code` como `qtd_unidades`
- Soma `sessions` como `total_sessions`
- Calcula `efficiency = total_sessions / qtd_unidades`
- Ordena por `efficiency DESC`

### 4. GROWTH - Tendência de Crescimento (últimos 30 dias)
**Importante**: Esta métrica precisa comparar dois períodos:
- Se `p_dates` for NULL: compara últimos 30 dias vs 30 dias anteriores
- Se `p_dates` for fornecido: compara o período selecionado vs período anterior de mesma duração

Cálculo:
```sql
growth_rate = ((periodo_atual - periodo_anterior) / periodo_anterior) * 100
```

Agrupa por `aparelho`

### 5. HEALTH - Score de Saúde do PDV
Score composto (0-100) baseado em 3 fatores:

**a) Volume (40 pontos)**
- Normaliza o volume de interações da loja em relação ao máximo
- `volume_score = (sessions_loja / max_sessions) * 40`

**b) Diversidade (30 pontos)**
- Conta quantos aparelhos diferentes a loja tem
- Normaliza em relação ao máximo de aparelhos em uma loja
- `diversidade_score = (qtd_aparelhos_loja / max_aparelhos) * 30`

**c) Consistência (30 pontos)**
- Calcula o coeficiente de variação das interações por dia
- Quanto menor a variação, maior a consistência
- `consistencia_score = (1 - (std_dev / media)) * 30`
- Se não houver dados suficientes para calcular, atribui 15 pontos (neutro)

**Score Final**:
```sql
health_score = volume_score + diversidade_score + consistencia_score
```

Limita entre 0 e 100.

## Filtros Aplicados
Todos os filtros devem ser aplicados em uma CTE inicial `filtered`:

```sql
WITH filtered AS (
  SELECT *
  FROM interactions
  WHERE
    (p_shopping IS NULL OR shopping = p_shopping)
    AND (p_rede IS NULL OR rede = p_rede)
    AND (p_store_name IS NULL OR store_name = p_store_name)
    AND (p_linha IS NULL OR linha_de_produto = p_linha)
    AND (p_regional IS NULL OR regional = p_regional)
    AND (p_p8020 IS NULL OR p8020 = p_p8020)
    AND (p_visibilidade IS NULL OR visibilidade = p_visibilidade)
    AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))
    AND aparelho IS NOT NULL
    AND store_name IS NOT NULL
)
```

## Estrutura Sugerida da RPC

```sql
CREATE OR REPLACE FUNCTION get_performance_metrics(
  p_shopping text DEFAULT NULL,
  p_rede text DEFAULT NULL,
  p_store_name text DEFAULT NULL,
  p_linha text DEFAULT NULL,
  p_regional text DEFAULT NULL,
  p_p8020 text DEFAULT NULL,
  p_visibilidade text DEFAULT NULL,
  p_dates text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  WITH filtered AS (
    -- Filtros base
  ),
  top10_agg AS (
    -- Top 10 lojas
  ),
  bottom10_agg AS (
    -- Bottom 10 lojas
  ),
  efficiency_agg AS (
    -- Eficiência por aparelho
  ),
  growth_agg AS (
    -- Crescimento por aparelho
  ),
  health_agg AS (
    -- Score de saúde por loja
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
```

## Notas Importantes

1. **Growth Rate**: A lógica de comparação de períodos é a mais complexa. Você pode precisar de CTEs adicionais para calcular os dois períodos.

2. **Health Score**: O cálculo de consistência requer agregação por dia dentro de cada loja. Use `STDDEV` e `AVG` do PostgreSQL.

3. **Performance**: Como esta query pode ser pesada, considere adicionar índices em:
   - `store_name`
   - `aparelho`
   - `device_code`
   - `pure_date`

4. **Tratamento de NULL**: Garanta que divisões por zero retornem 0 ou NULL apropriadamente usando `NULLIF` ou `CASE`.

## Exemplo de Uso no Frontend

```javascript
const data = await appData.fetchPerformanceRPC();

// data.top10 -> Array de lojas top 10
// data.bottom10 -> Array de lojas bottom 10
// data.efficiency -> Array de aparelhos com eficiência
// data.growth -> Array de aparelhos com taxa de crescimento
// data.health -> Array de lojas com score de saúde
```

---

**Pronto para implementar!** 🚀

Quando terminar a RPC, me avise que vou testar a integração.
