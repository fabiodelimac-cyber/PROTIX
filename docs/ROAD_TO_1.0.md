# ROAD TO 1.0 — Spec de Produção

Documento de registro das decisões técnicas e implementações realizadas para o lançamento da versão 1.0 de produção do ProSolution APP.

**Última atualização:** 2026-05-06
**Status geral:** ✅ Implementação concluída — pronto para 1.0

---

## Contexto

- Tabela `interactions`: ~13k linhas, crescimento de ~3k/semana
- Projeção: 300 lojas, 20 redes, 4 linhas, 40 shoppings, 4 regionais, 365 dias/ano → ~1.6M linhas/ano
- Combinações únicas de filtro: ~50-70k/ano, ~200k em 3 anos
- Perfil de uso: 90% wifi, 9.8% 5G, 0.2% 4G fraco

---

## PARTE 1 — Reestrutura para expansão do banco ✅

Todos os itens concluídos. Arquivos de migração em `migrations_RT10/`.

### 1.1 Fix cast `pure_date::text` nas RPCs ✅
**Arquivo:** `migrations_RT10/20260506000001_fix_pure_date_cast.sql`

Todas as 5 RPCs faziam `pure_date::text = ANY(p_dates)`, impedindo o uso do índice `idx_interactions_date`. Corrigido para `pure_date = ANY(p_dates::date[])` — cast no parâmetro, não na coluna. Impacto: 10-30x mais rápido com filtro de data ativo em tabelas grandes.

RPCs corrigidas: `get_overview_metrics`, `get_positivacao_metrics`, `get_heatmap_metrics`, `get_performance_metrics`, `get_store_xray`.

### 1.2 RPC `get_filter_options()` + refatoração do `initData()` ✅
**Arquivos:** `migrations_RT10/20260506000003_get_filter_options.sql` + `js/app.js` + `js/services/dataManager.js`

Substituído `from('interactions').select('*')` (tabela inteira) por chamada à nova RPC `get_filter_options()` que retorna:
- Combinações únicas das 8 colunas de filtro (shopping, store_name, rede, linha_de_produto, regional, p8020, visibilidade, pure_date)
- Contagem de `device_code` por `linha_de_produto` para o tooltip de aparelhos da Overview

Resultado: login passa de ~13MB de JSON para ~50KB. A lógica de filtros cruzados no front (`updateDropdownUI()`) não foi alterada — recebe os mesmos dados, só muito menores.

**Decisão registrada:** Opção B (distinct combinations) foi escolhida sobre Opção A (RPC com filtros ativos a cada clique) para evitar reescrita do sistema de filtros e risco de regressão.

**Escala:** DISTINCT ao vivo funciona até ~100k combinações (~1.5-2 anos). Acima disso, trocar para materialized view (ver Parte 3).

### 1.3 LIMIT + window functions na `get_performance_metrics` ✅
**Arquivo:** `migrations_RT10/20260506000002_performance_limit_window.sql`

Substituído CROSS JOIN por window functions no cálculo de health score. Adicionado LIMIT 50 no health score e LIMIT 30 na eficiência. Elimina escalonamento quadrático com 300+ lojas.

### 1.4 Índices nas colunas de filtro ✅
Índices btree individuais já existiam em todas as 8 colunas de filtro + aparelho. Nenhuma ação necessária.

---

## PARTE 2 — Side-quests ✅

### 2.1 Debounce nos filtros ✅
**Arquivo:** `js/services/dataManager.js`

Adicionado debounce de 300ms no `notify()`. Cliques rápidos em checkboxes agora disparam uma única RPC em vez de múltiplas simultâneas.

### 2.2 Substituição do PerformanceMonitor por `usage_stats` ✅
**Removidos:** `js/performance-monitor.js`, `js/performance-integration.js`
**Criado:** `js/usage-stats.js`
**Migration:** tabela `usage_stats` criada, `performance_metrics` dropada

O PerformanceMonitor (CPU/GPU via rAF) foi removido. No lugar, o módulo `usage_stats` registra dados de negócio:

| Campo | Descrição |
|-------|-----------|
| `user_id` | FK auth.users |
| `user_email` | para leitura direta |
| `session_start` | hora do login |
| `session_end` | hora do logout/fechamento |
| `session_duration` | calculado no save |
| `most_used_tab` | aba com mais tempo na sessão |
| `tab_times` | `{overview: 120, positivacao: 45, ...}` em segundos |

Save acontece no logout explícito e no `pagehide` com `fetch keepalive: true`.

### 2.3 ~~isUnloading flag~~ — Obsoleto
Coberto pela remoção do PerformanceMonitor no item 2.2.

### 2.4 Indicador de offline ✅
**Arquivos:** `index.html` + `js/app.js`

Banner discreto que aparece quando `navigator.onLine` é `false` e some quando a conexão volta. Usa eventos `online`/`offline` do browser.

---

## PARTE 3 — Roadmap futuro (pós-1.0)

| Item | Gatilho | Esforço |
|------|---------|---------|
| Materialized view para `get_filter_options` | >100k combinações únicas (~1.5-2 anos) | Médio |
| Instalar pg_cron no Supabase | Quando precisar de refresh automático da materialized view | Baixo |
| Particionamento por data | >10M linhas (~6+ anos) | Alto |
| CSP headers no `firebase.json` | Pós-1.0 | Médio |
| CDN scripts com integrity hash | Pós-1.0 | Baixo |
| Event listeners acumulando nos slicers | Pós-1.0 | Médio |
| Retry na falha de carga inicial | Pós-1.0 | Médio |

---

## Itens descartados / não-bloqueantes

| Ponto | Decisão |
|-------|---------|
| Query sem limite (original) | Resolvido pelo item 1.2 |
| PerformanceMonitor antes do login | Era intencional (aquecia samples). Removido e substituído por usage_stats |
| innerHTML/XSS | Hardening já feito: anon revogado, RLS ativo, só authenticated escreve |
| Sem CSP | Pós-1.0 — defesa em profundidade, não urgente |
| CDN sem integrity | Pós-1.0 — risco externo baixo |
| Sem retry na carga | Pós-1.0 — 99.8% wifi/5G |
| Indicador de offline | Implementado no item 2.4 |

---

## Compatibilidade com SPEC2

O SPEC2 planeja RBAC, exportação CSV/PDF, auditoria e migração React. A arquitetura da 1.0 absorve tudo sem conflito:

| Feature do SPEC2 | Como a 1.0 suporta |
|------------------|---------------------|
| Novas views | Padrão `view-xxx.js` com `getHTML()` + `render()` + `destroy()`. Debounce, renderToken e filtros funcionam automaticamente |
| Novas RPCs | `_callRPC()` centralizado já tem retry, timeout e fresh client |
| Exportação CSV/PDF | Lê das RPCs existentes, não altera camada de dados |
| RBAC com `permissions_json` | Camada aditiva, não conflita |
| Migração React | A 1.0 vanilla JS é a base estável |

**Ponto de atenção:** quando o RBAC entrar (Fase 1B do SPEC2), a `get_filter_options()` precisará receber `p_user_id UUID` e filtrar os distincts pelas permissões do usuário. É uma extensão natural — 1 parâmetro + 1 WHERE extra. O front não muda.

---

## Projeção de escala

A arquitetura implementada na 1.0 aguenta **3-4 anos** de crescimento (300 lojas, 365 dias/ano, ~5-8M linhas) sem intervenção. O primeiro gargalo esperado é a `get_filter_options()` com DISTINCT ao vivo quando passar de ~100k combinações únicas — resolvido com materialized view em ~1 hora de trabalho no banco, zero mudança no front.
