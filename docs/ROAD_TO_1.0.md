# ROAD TO 1.0 — Spec de Produção

Documento vivo que registra as decisões técnicas e correções necessárias para o lançamento da versão 1.0 de produção do ProSolution APP.

**Projeção de crescimento:**
- Tabela `interactions`: ~3k linhas/semana → ~1.6M/ano no cenário de 300 lojas
- Filtros: 300 lojas, 20 redes, 4 linhas, 40 shoppings, 4 regionais, 2 p8020, 2 visibilidade, 365 dias/ano
- Combinações únicas de filtro: ~50-70k/ano, ~200k em 3 anos

---

## PARTE 1 — Reestrutura para expansão do banco

Prioridade máxima. Garantir que a tabela `interactions` cresça indefinidamente sem degradar performance.

### 1.1 Corrigir cast `pure_date::text` que impede uso de índice

**Status:** Aguardando implementação
**Esforço:** Baixo (alterar RPCs)

**Problema:**
Todas as 5 RPCs fazem `pure_date::text = ANY(p_dates)`. Como `pure_date` é `date`, o cast `::text` impede o Postgres de usar o índice `idx_interactions_date`. O query planner vê uma expressão transformada e faz seq scan na coluna mais seletiva da tabela.

**Solução:**
Manter `p_dates` como `text[]` (o front manda strings) mas fazer o cast no parâmetro, não na coluna:

```sql
-- ANTES (impede índice):
AND (p_dates IS NULL OR pure_date::text = ANY(p_dates))

-- DEPOIS (usa índice):
AND (p_dates IS NULL OR pure_date = ANY(p_dates::date[]))
```

Aplicar nas 5 RPCs existentes + na nova `get_filter_options`:
- `get_overview_metrics`
- `get_positivacao_metrics`
- `get_heatmap_metrics`
- `get_performance_metrics`
- `get_store_xray`

**Impacto:** Com filtro de data ativo, diferença de 10-30x em tempo de resposta em tabelas grandes.

---

### 1.2 RPC `get_filter_options()` — Substituir `select('*')` da tabela inteira

**Status:** Aguardando implementação
**Esforço:** Alto (backend + frontend)

**Problema:**
O `initData()` em `js/app.js` faz `from('interactions').select('*')` sem limite, puxando a tabela inteira para o client. Com 13k linhas atuais e crescimento de ~3k/semana, o login ficará visivelmente lento em poucas semanas.

Os dados brutos (`rawData`) são usados para:
- Popular os filtros/slicers com valores distintos e manter o comportamento de filtros cruzados (`updateDropdownUI()`)
- Um tooltip na Overview que conta aparelhos ativos por linha de produto

Todos os gráficos e KPIs já vêm de RPCs server-side.

**Decisão: Opção B — Distinct combinations**

Criar uma RPC `get_filter_options()` que retorna as combinações únicas das colunas de filtro:

```sql
CREATE OR REPLACE FUNCTION get_filter_options()
RETURNS json
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'combinations', (
                SELECT json_agg(row_to_json(t))
                FROM (
                    SELECT DISTINCT shopping, store_name, rede, linha_de_produto,
                           regional, p8020, visibilidade, pure_date::text AS pure_date
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
```

**Por que essa opção:**
- A lógica de filtro cruzado no front (`updateDropdownUI()`) já funciona e está testada. Não precisa ser reescrita.
- O `rawData` passa a conter ~200-400 linhas com 8 colunas em vez de 13k+ linhas com 18 colunas.
- O tooltip de aparelhos por linha vem junto na mesma chamada.

**Implementação necessária:**
1. Criar RPC `get_filter_options()` no Supabase (já com o fix do cast de pure_date)
2. Trocar `from('interactions').select('*')` por chamada à nova RPC no `initData()`
3. Ajustar `setRawData()` (hoje faz parse de `sessions`, que não existirá mais nos dados de filtro)
4. Ajustar o tooltip de aparelhos na Overview para usar `devices_by_linha` da RPC
5. Testar todos os slicers e filtros cruzados

**Projeção de escala:**
- Até ~100k combinações (~1.5-2 anos): DISTINCT ao vivo funciona em <1s
- Acima de 100k: trocar para materialized view (ver seção Roadmap Futuro)

**Opção descartada:**
Opção A (RPC com filtros ativos a cada clique) — exigiria reescrever `updateDropdownUI()` inteiro. Alto risco de regressão nos filtros.

---

### 1.3 LIMIT em agregações pesadas das RPCs

**Status:** Aguardando implementação
**Esforço:** Baixo (alterar RPCs)

**Problema:**
A `get_performance_metrics` calcula health score com `STDDEV` e `CROSS JOIN` para todas as lojas. Com 300 lojas, o CROSS JOIN escala quadraticamente. Outras RPCs retornam agregações sem limite.

**Solução:**
Adicionar `LIMIT` nos rankings e trocar CROSS JOIN por window functions:

```sql
-- Health score: window function em vez de CROSS JOIN
health_agg AS (
    SELECT
        store_name,
        total_sessions,
        total_sessions::numeric / MAX(total_sessions) OVER () * 40 AS volume_score,
        qtd_aparelhos::numeric / MAX(qtd_aparelhos) OVER () * 30 AS diversity_score,
        ...
    FROM health_base
    ORDER BY health_score DESC
    LIMIT 50
)

-- Eficiência: top 30
efficiency_agg AS (
    ...
    ORDER BY efficiency DESC
    LIMIT 30
)
```

**Arquivos:** Principalmente `get_performance_metrics`, revisar as outras 4 RPCs.

---

### 1.4 Índices nas colunas de filtro

**Status:** ✅ RESOLVIDO

Índices individuais btree já criados em todas as 8 colunas de filtro + aparelho:
- `idx_interactions_date` (pure_date)
- `idx_interactions_shopping` (shopping)
- `idx_interactions_store` (store_name)
- `idx_interactions_rede` (rede)
- `idx_interactions_linha` (linha_de_produto)
- `idx_interactions_regional` (regional)
- `idx_interactions_p8020` (p8020)
- `idx_interactions_visibilidade` (visibilidade)
- `idx_interactions_aparelho` (aparelho)

O Postgres combina múltiplos índices individuais via Bitmap Index Scan.

---

## PARTE 2 — Side-quests (melhorias funcionais)

Correções menores que eliminam desperdício e melhoram a experiência.

### 2.1 Debounce nos filtros

**Status:** Aguardando implementação
**Esforço:** Baixo

**Problema:**
Cliques rápidos em checkboxes de filtro disparam múltiplas RPCs simultâneas. O `renderToken` protege contra renderização stale, mas as chamadas de rede acontecem.

**Solução:**
Debounce de ~300ms no `notify()` do `DataManager`.

**Arquivo:** `js/services/dataManager.js`

---

### 2.2 requestAnimationFrame leak no PerformanceMonitor

**Status:** Aguardando implementação
**Esforço:** Baixo

**Problema:**
O loop de `requestAnimationFrame` nunca é cancelado no `destroy()`. Após logout, continua rodando.

**Solução:**
Guardar o rAF ID e chamar `cancelAnimationFrame()` no `destroy()`. Também cancelar os `setInterval` de 1s e 2s.

**Arquivo:** `js/performance-monitor.js`

---

### 2.3 isUnloading flag não reseta

**Status:** Aguardando implementação
**Esforço:** Baixo

**Problema:**
`isUnloading = true` nunca volta para `false`. Se `pagehide` dispara sem fechar (mobile background), o save final se perde.

**Solução:**
Resetar `isUnloading = false` no `visibilitychange` quando volta ao foreground.

**Arquivo:** `js/performance-monitor.js`

---

### 2.4 Indicador de offline

**Status:** Aguardando implementação
**Esforço:** Médio

**Problema:**
Sem rede, os dados não carregam e o usuário não sabe por quê.

**Solução:**
Banner discreto com `navigator.onLine` + eventos `online`/`offline`.

**Arquivos:** `index.html` + `js/app.js`

---

## PARTE 3 — Roadmap futuro (pós-1.0)

Itens que não são necessários agora mas terão que ser endereçados conforme a base cresce.

| Item | Gatilho | Esforço |
|------|---------|---------|
| Materialized view para filtros | >100k combinações únicas (~1.5-2 anos) | Médio — criar view + refresh manual ou Edge Function |
| Particionamento por data | >10M linhas (~6+ anos no cenário atual) | Alto — migração de dados + recriar RLS/grants |
| Instalar pg_cron | Quando precisar de materialized view ou particionamento automático | Baixo — habilitar extensão no Supabase |
| CSP headers no firebase.json | Pós-1.0 | Médio |
| CDN scripts com integrity hash | Pós-1.0 | Baixo |
| Event listeners acumulando | Pós-1.0 | Médio |
| Credenciais Supabase duplicadas no performance-monitor.js | Pós-1.0 | Baixo |
| Retry na falha de carga inicial | Pós-1.0 | Médio |

---

## Itens descartados

| Ponto | Motivo |
|-------|--------|
| PerformanceMonitor antes do login | **Intencional** — aquece samples de GPU para não ter gap na coleta pós-login |
| innerHTML/XSS com dados do banco | Hardening: anon revogado, RLS ativo, só authenticated escreve |

---

## Resumo executivo

### Para a 1.0 (implementar agora)

| # | Item | Tipo | Esforço |
|---|------|------|---------|
| 1.1 | Fix cast `pure_date::text` nas RPCs | Backend | Baixo |
| 1.2 | RPC `get_filter_options()` + refatorar `initData()` | Backend + Frontend | Alto |
| 1.3 | LIMIT + window functions nas RPCs | Backend | Baixo |
| 1.4 | Índices | Backend | ✅ Resolvido |
| 2.1 | Debounce nos filtros | Frontend | Baixo |
| 2.2 | Cancelar rAF no PerformanceMonitor | Frontend | Baixo |
| 2.3 | Resetar isUnloading flag | Frontend | Baixo |
| 2.4 | Indicador de offline | Frontend | Médio |

**Projeção:** essa arquitetura aguenta 3-4 anos de crescimento (300 lojas, 365 dias/ano, ~5-8M linhas) sem intervenção.

---

## Compatibilidade com SPEC2 (Roadmap futuro)

O SPEC2 planeja upgrades significativos em 6 fases (RBAC, exportação CSV/PDF, auditoria, migração React). A arquitetura da 1.0 foi desenhada para absorver tudo isso sem conflito:

| Feature do SPEC2 | Como a 1.0 suporta |
|-------------------|---------------------|
| Novas views (auditoria, analytics, relatórios) | Padrão estabelecido: `view-xxx.js` com `getHTML()` + `render()` + `destroy()`. Debounce, renderToken e filtros funcionam automaticamente para views novas |
| Novas RPCs | `_callRPC()` centralizado no DataManager já tem retry, timeout e fresh client. Adicionar RPC = 1 método no DataManager + 1 função no Postgres |
| Exportação CSV/PDF | Lê dados das RPCs existentes. Não altera a camada de dados |
| RBAC com `permissions_json` | Camada aditiva sobre o que existe. Não conflita com a 1.0 |
| Migração React (Fase 6 do SPEC2) | A 1.0 em vanilla JS é a base estável sobre a qual a migração acontece |

**Ponto de atenção:** quando o RBAC entrar (Fase 1B do SPEC2), a RPC `get_filter_options()` criada na 1.0 vai precisar receber `p_user_id UUID` e filtrar os distincts baseado nas permissões do usuário. Isso é uma extensão natural — adicionar um parâmetro à RPC e um WHERE extra. O front não muda.
