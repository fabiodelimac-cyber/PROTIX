# ProSolution Analytics - Roadmap de Desenvolvimento 6 Meses
**Timeline**: Abril - Outubro 2026 | **Desenvolvedor**: Solo | **Escala Atual**: 4.500 linhas → Milhões
**Última Atualização**: 29 de Abril de 2026

---

## Resumo Executivo

Este roadmap prioriza **segurança e controle de acesso** (RBAC/RLS), **extração de dados** (CSV/PDF) e **capacidades de auditoria** enquanto mantém qualidade de código e prepara a arquitetura modular futura. O cliente Motorola pode acessar o dashboard atual imediatamente; desenvolvimento de features acontece em paralelo.

**Status Atual (29/04/2026)**: FASE 1A (Hardening RLS) em andamento — spec criada, implementação pendente. Funções RPC já atualizadas para suporte a arrays (seleção múltipla). Versão atual: v0.92.1.

**Top 3 Prioridades**:
1. Controle de acesso RBAC/RLS (permissões granulares por usuário)
2. Motor de extração de dados (exportação CSV/PDF)
3. Logs de auditoria (rastrear padrões de uso)

**Prioridades Secundárias**:
4. Refatoração de código & sanitização (remover duplicidades, código morto, adicionar comentários)
5. Migração React (fundação para dashboard modular)
6. Dashboard modular do usuário (canvas com widgets drag-drop)

---

## Stack de Tecnologias

### 🔧 Stack Atual (Vanilla JavaScript)
| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|----------|
| **Frontend** | Vanilla JavaScript (ES6+) | - | Lógica de UI e interações |
| **Styling** | TailwindCSS | 3.x | Utility-first CSS |
| **Backend** | Supabase (PostgreSQL) | - | Database + Auth + RPC |
| **Gráficos** | Chart.js | 3.x | Visualizações de dados |
| **HTTP Client** | Supabase JS SDK | - | Queries e RPC calls |
| **Build** | Nenhum (vanilla) | - | Arquivos servidos direto |
| **Versionamento** | Git | - | Controle de código |

### 🎯 Stack Target (React + Modular)
| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|----------|
| **Frontend** | React | 18+ | Component-based UI |
| **State Management** | Zustand | 4.x | State management (simples) |
| **Styling** | TailwindCSS | 3.x | Utility-first CSS (mantém) |
| **Build Tool** | Vite | 5.x | Fast build & dev server |
| **Gráficos** | Chart.js / Recharts | 3.x / 2.x | Visualizações (React-friendly) |
| **HTTP Client** | Supabase JS SDK | - | Queries e RPC calls (mantém) |
| **Testing** | Vitest + Playwright | - | Unit + E2E tests |
| **Monitoring** | Sentry | - | Error tracking |
| **Analytics** | Google Analytics / Mixpanel | - | User behavior tracking |
| **Versionamento** | Semantic Versioning | - | Controle de versão |

### 📊 Migração de Stack por Fase
| Fase | Mudanças | Impacto |
|------|----------|--------|
| **1-4** | Mantém vanilla JS + TailwindCSS + Chart.js | Nenhum (compatível) |
| **5** | Introduz React + Vite + Zustand | Requer refactor de componentes |
| **6** | Otimizações finais | Nenhum (refinamento) |

---

## Highlights por Fase

### 📌 FASE 1A: Hardening RLS & Segurança Base — ✅ CONCLUÍDO
| Objetivo | Entrega | Impacto | Status |
|----------|---------|--------|--------|
| Revogar permissões excessivas do `anon` | Scripts SQL de hardening + rollback | Dados protegidos contra acesso anônimo | ✅ Concluído |
| Restringir execução de funções RPC | REVOKE EXECUTE do `anon` + `PUBLIC` | RPCs acessíveis apenas por autenticados | ✅ Concluído |
| Corrigir `createFreshClient()` | Função async com injeção de token JWT | Chamadas RPC funcionam como `authenticated` | ✅ Concluído |
| Refatorar dataManager.js | `_callRPC()` centralizado | -200 linhas de código duplicado | ✅ Bônus |
| Corrigir Service Worker | Network-first para JS/HTML | Cache stale resolvido em deploys | ✅ Bônus |
| ✅ Funções RPC com arrays | Todas 4 RPCs atualizadas + `normalize_filter_param` | Suporte a seleção múltipla de filtros | ✅ Concluído |
| **Duração** | 2-3 semanas | **Status**: ✅ CONCLUÍDO (29/04/2026) | |

### 📌 FASE 1B: RBAC & Sanitização
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Controle de acesso granular | Tabelas estendidas (role, permissions_json) | Motorola aprovado com permissões |
| Perfis de acesso reutilizáveis | Tabela `user_access_profiles` | Templates de permissões |
| Sanitização HTML | Utility + aplicação em todas views | 0 vulnerabilidades XSS |
| Admin via Supabase Dashboard | Sem painel customizado | Economia de tempo de dev |
| **Duração** | 2-3 semanas | **Status**: Próximo |

### 📌 FASE 2: Exportação CSV (PRIORIDADE CLIENTE)
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Exportação CSV | Papa Parse integrado | Usuários podem extrair dados |
| Botão de exportação em cada view | UI integrada | Acesso direto à funcionalidade |
| Respeitar permissões do usuário | Exportar apenas dados autorizados | Compliance |
| **Duração** | 2-3 semanas | **Status**: Alta prioridade (pedido do cliente) |

### 📌 FASE 3: Refatoração & Qualidade
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Remover duplicidades | 4 utility files criados | -30% linhas de código |
| Remover código morto | ESLint + manual review | Codebase limpo |
| Documentação JSDoc | Todas funções documentadas | Manutenibilidade +50% |
| Magic numbers → Constants | `constants.js` criado | Configuração centralizada |
| **Duração** | 3-4 semanas | **Status**: Importante |

### 📌 FASE 3: Refatoração & Qualidade
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Remover duplicidades | 4 utility files criados | -30% linhas de código |
| Remover código morto | ESLint + manual review | Codebase limpo |
| Documentação JSDoc | Todas funções documentadas | Manutenibilidade +50% |
| Magic numbers → Constants | `constants.js` criado | Configuração centralizada |
| **Duração** | 3-4 semanas | **Status**: Importante |

### 📌 FASE 4: Motor de Extração Completo (PDF + Histórico)
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Exportação PDF | jsPDF + html2canvas | Relatórios profissionais |
| Histórico de exports | Tabela `export_logs` | Auditoria de compliance |
| **Duração** | 2-3 semanas | **Status**: Importante |

### 📌 FASE 5: Auditoria & Analytics
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Logs de auditoria | Tabela `audit_logs` + logger | Rastreamento completo |
| Analytics de comportamento | Dashboard de insights | Entender padrões de uso |
| Relatórios admin | Views de relatórios | Visibilidade para admins |
| **Duração** | 3-4 semanas | **Status**: Importante |

### 📌 FASE 5: Auditoria & Analytics
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Logs de auditoria | Tabela `audit_logs` + logger | Rastreamento completo |
| Analytics de comportamento | Dashboard de insights | Entender padrões de uso |
| Relatórios admin | Views de relatórios | Visibilidade para admins |
| **Duração** | 3-4 semanas | **Status**: Importante |

### 📌 FASE 6: Migração React
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Setup React + Vite | Projeto inicializado | Ambiente moderno |
| Zustand store | DataManager → Zustand | State management simplificado |
| Componentes React | 6+ componentes criados | Reutilização de código |
| Dashboard modular | Canvas drag-drop | Customização por usuário |
| **Duração** | 4-5 semanas | **Status**: Desejável |

### 📌 FASE 7: Polish & Otimização
| Objetivo | Entrega | Impacto |
|----------|---------|--------|
| Performance | Otimizações RPC + frontend | Suporta milhões de linhas |
| Segurança final | Audit completo | Production-ready |
| Documentação | Guias + runbooks | Suporte facilitado |
| **Duração** | 3-4 semanas | **Status**: Finalização |

---

## Monitoramento, Testes & Versionamento (INTEGRADO)

### 🚨 Monitoramento (Sentry + Analytics)
**Integração**: Paralelo com FASE 1 (semana 1-2)

**Implementação**:
```javascript
// js/config/monitoring.js
import * as Sentry from "@sentry/browser";

export function initMonitoring() {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Replay({ maskAllText: true, blockAllMedia: true })
    ]
  });
}

export function captureRPCError(rpcName, error, params) {
  Sentry.captureException(error, {
    tags: { rpc: rpcName, type: 'rpc_failure' },
    extra: { params, timestamp: new Date().toISOString() }
  });
}
```

**Atualizações em dataManager.js**:
```javascript
catch (err) {
  captureRPCError('get_overview_metrics', err, params);
  console.error("🚨 Overview: erro inesperado:", err);
  return null;
}
```

**Analytics (Google Analytics)**:
```javascript
// js/utils/analytics.js
export function trackViewChange(viewName) {
  gtag('event', 'view_change', { view: viewName });
}

export function trackFilterApplied(filterKey, filterValue) {
  gtag('event', 'filter_applied', { filter: filterKey, value: filterValue });
}

export function trackExport(exportType) {
  gtag('event', 'export', { type: exportType });
}
```

**Alertas**:
- Sentry: Notificação automática se RPC falhar 3x em 5 minutos
- UptimeRobot: Monitoramento de uptime (ping a cada 5 min)
- Email alerts: Erros críticos para admin

### ✅ Testes Automatizados
**Integração**: FASE 2 (semana 3-4)

**Testes Unitários (Vitest)**:
```javascript
// tests/dataManager.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { appData } from '../js/services/dataManager.js';

describe('DataManager', () => {
  beforeEach(() => {
    appData.clearAllFilters();
    appData.setRawData([]);
  });

  it('deve filtrar dados corretamente', () => {
    appData.setRawData([
      { store_name: 'Casas Bahia', sessions: 100 },
      { store_name: 'Carrefour', sessions: 50 }
    ]);
    appData.setFilter('store_name', 'Casas Bahia');
    
    const filtered = appData.getFilteredData();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].store_name).toBe('Casas Bahia');
  });

  it('deve remover filtro quando valor é vazio', () => {
    appData.setFilter('store_name', 'Casas Bahia');
    appData.setFilter('store_name', '');
    
    expect(appData.currentFilters.store_name).toBeUndefined();
  });
});
```

**Testes E2E (Playwright)**:
```javascript
// tests/e2e/login.spec.js
import { test, expect } from '@playwright/test';

test('fluxo de login com aprovação', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Login com Google
  await page.click('#btn-google-login');
  // ... fluxo de autenticação
  
  // Deve mostrar "aguardando aprovação"
  await expect(page.locator('text=aguarda aprovação')).toBeVisible();
});

test('usuário aprovado acessa dashboard', async ({ page }) => {
  // Login com usuário aprovado
  await page.goto('http://localhost:5173');
  await page.fill('#user', 'approved@example.com');
  await page.fill('#pass', 'password');
  await page.click('#btn-email-login');
  
  // Deve mostrar dashboard
  await expect(page.locator('#app-content')).toBeVisible();
});
```

**CI/CD (GitHub Actions)**:
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:e2e
      - run: npm run build
```

### 📦 Versionamento Semântico
**Integração**: FASE 1 (semana 1)

**Estrutura**:
```javascript
// js/config/version.js
export const APP_VERSION = '1.0.0-beta.1';
export const BUILD_DATE = new Date().toISOString();
export const GIT_COMMIT = process.env.VITE_GIT_COMMIT || 'unknown';

export function getVersionInfo() {
  return {
    version: APP_VERSION,
    buildDate: BUILD_DATE,
    commit: GIT_COMMIT,
    environment: process.env.NODE_ENV
  };
}
```

**Exibição no UI**:
```html
<!-- Footer do dashboard -->
<footer class="text-xs text-gray-500 p-2">
  ProSolution Analytics v<span id="app-version"></span>
  <span id="app-env" class="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-600 rounded">BETA</span>
</footer>

<script>
  import { APP_VERSION } from './config/version.js';
  document.getElementById('app-version').textContent = APP_VERSION;
</script>
```

**Changelog**:
```markdown
# Changelog

## [1.0.0-beta.1] - 2026-04-15
### Added
- RBAC/RLS access control
- HTML sanitization
- Sentry error tracking

### Fixed
- Chrome tab hibernation issue
- RPC timeout handling

### Changed
- Updated user_profiles table schema
```

---

## ✅ Checklist Pré-Produção Motorola (Atualizado 29/04/2026)

### 🔴 CRÍTICO (Fazer ANTES de liberar)
- [x] Executar hardening RLS (spec `rls-security-hardening`) — ✅ 29/04/2026
- [x] Modificar `createFreshClient()` com injeção de token — ✅ 29/04/2026
- [x] Verificar RLS ativo em `interactions` e `user_profiles` — ✅ 29/04/2026
- [ ] Testar acesso com usuário não aprovado (deve bloquear)
- [x] Testar em Chrome, Safari, Firefox, Edge (parcial — login testado)
- [ ] Testar em mobile (iOS e Android)
- [ ] Backup completo do banco de dados
- [x] Documentar processo de aprovação de usuários (fluxo pending→approved funcional)
- [ ] Testar sanitização HTML (injetar `<script>` em filtros)
- [ ] Verificar permissões_json sendo aplicadas corretamente

### 🟠 IMPORTANTE (Fazer na primeira semana)
- [ ] Implementar Sentry para tracking de erros
- [ ] Adicionar Google Analytics ou Mixpanel
- [ ] Criar runbook de troubleshooting
- [ ] Definir SLA (tempo de resposta esperado)
- [ ] Configurar alertas de downtime (UptimeRobot)
- [ ] Testar retry logic com conexão lenta
- [ ] Validar performance com 10k+ linhas

### 🟡 DESEJÁVEL (Fazer no primeiro mês)
- [ ] Refatorar retry logic (DRY)
- [ ] Adicionar testes automatizados (unit + E2E)
- [ ] Implementar sanitização de HTML completa
- [x] Adicionar versionamento semântico (v0.92.1)
- [x] Criar changelog para usuários (CHANGELOG.md)
- [ ] Documentar API RPC
- [ ] Setup de CI/CD com testes

### ✅ JÁ CONCLUÍDO
- [x] Funções RPC atualizadas para arrays (seleção múltipla)
- [x] `normalize_filter_param` criada e integrada
- [x] Login redesenhado (Google, Microsoft, email/senha) — v0.92.0-rc2
- [x] Correção de notificações OAuth na PWA — v0.90.1
- [x] Correção de filtro de data (meses anteriores) — v0.92.1
- [x] 4 views funcionando (Overview, Positivação, Heatmap, Performance)
- [x] Filtros hierárquicos com seleção múltipla
- [x] **FASE 1A completa** — Hardening RLS (29/04/2026)
- [x] REVOKE ALL do `anon` + `PUBLIC` nas tabelas e funções RPC
- [x] `createFreshClient()` async com injeção de token JWT
- [x] `dataManager.js` refatorado com `_callRPC()` centralizado (-200 linhas)
- [x] `app.js` com `reactivateView()` para hibernação do Chrome
- [x] `sw.js` Network-first para JS/HTML (resolve cache stale)

---

## FASE 1A: Hardening RLS & Segurança Base — ✅ CONCLUÍDO (29/04/2026)
**Duração**: Concluído em 1 dia | **Objetivo**: Eliminar vulnerabilidades de acesso anônimo
**Spec**: `.kiro/specs/rls-security-hardening/` (requirements, design, tasks)

### ✅ Tudo Concluído

**Banco de dados (Supabase)**:
- ✅ `REVOKE ALL` do `anon` nas 3 tabelas (interactions, user_profiles, performance_metrics)
- ✅ `REVOKE EXECUTE` do `anon` E `PUBLIC` nas funções RPC (herança padrão do PostgreSQL)
- ✅ Removida policy "Permitir leitura para anon" da tabela interactions
- ✅ Policies de performance_metrics corrigidas de `{public}` para `{authenticated}`
- ✅ RLS confirmado habilitado nas 3 tabelas

**Scripts SQL criados** (`supabase/migrations/`):
- ✅ `20260429000000_fase1a_hardening_rls.sql` — aplica o hardening
- ✅ `20260429000001_fase1a_rollback.sql` — reverte tudo em < 2 min
- ✅ `20260429000002_fase1a_validacao.sql` — 4 queries de verificação
- ✅ Backups pré-hardening: `backup_pre_hardening_schema.sql` + `backup_pre_hardening_data.sql`

**Frontend**:
- ✅ `supabaseClient.js` — `createFreshClient()` agora async com injeção de token JWT (localStorage + fallback getSession com timeout 2s)
- ✅ `dataManager.js` — refatorado com `_callRPC()` centralizado (-200 linhas duplicadas) + `_buildFilterParams()`
- ✅ `app.js` — `reactivateView()` para resolver DOM corrompido após hibernação do Chrome
- ✅ `sw.js` — Network-first para JS/HTML (resolve cache stale em deploys)

**Aprendizados**:
- PostgreSQL concede EXECUTE a PUBLIC por padrão — revogar apenas de `anon` não é suficiente
- `createFreshClient()` precisou ser async (vs. design original síncrono) por causa do fallback `getSession()` com timeout
- `getSession()` do SDK trava quando aba volta do background (bug Chrome + hibernação)

---

## FASE 1B: RBAC & Sanitização (Maio - Junho 2026)
**Duração**: 2-3 semanas | **Objetivo**: Controle de acesso baseado em roles + segurança XSS

> **Decisão (29/04/2026)**: Administração de usuários (aprovação, atribuição de roles, perfis de acesso) será feita via **Supabase Dashboard** — sem painel admin customizado no frontend. Isso simplifica significativamente o escopo e poupa tempo de desenvolvimento para features de maior valor (exportação CSV).

### 1B.1 Estender Tabela User Profiles
**Objetivo**: Aproveitar tabela `user_profiles` existente para acesso baseado em roles

**Mudanças no Banco**:
- Adicionar coluna `role` (enum: 'admin', 'viewer', 'analyst') — padrão 'viewer'
- Adicionar coluna `permissions_json` (JSONB) — armazena restrições por coluna
- Adicionar coluna `is_active` (boolean) — suporte a soft delete
- Adicionar coluna `last_login` (timestamp) — trilha de auditoria

**Exemplo de estrutura permissions_json**:
```json
{
  "store_name": ["Casas Bahia SP", "Casas Bahia RJ"],
  "rede": ["Casas Bahia"],
  "regional": ["SP", "RJ"],
  "linha_de_produto": null,
  "shopping": null
}
```

**Entregas**:
- Script de migração para adicionar colunas
- Dados seed para usuário admin
- Documentação do modelo de permissões

### 1B.2 Criar Tabela User Access Profiles
**Objetivo**: Templates de permissões reutilizáveis para atribuição em massa

**Schema do Banco**:
```sql
CREATE TABLE user_access_profiles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  description TEXT,
  permissions_json JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Perfis Predefinidos**:
- "Casas Bahia Viewer" — visualizar apenas lojas Casas Bahia
- "Regional SP" — visualizar apenas região São Paulo
- "Rede Varejo" — visualizar todas as redes de varejo
- "Acesso Total" — perfil admin (todas as colunas)
- "Analista" — visualizar todos dados, sem exportação

**Administração**: Via Supabase Dashboard (Table Editor). Sem UI customizada no frontend.

**Entregas**:
- Script de criação da tabela
- Dados seed para 5 perfis predefinidos

### 1B.3 Configurar Fluxo de Aprovação com Roles via Supabase Dashboard
**Objetivo**: Onboarding seguro com atribuição de role

> **Nota**: O fluxo básico de aprovação (pending → approved) já funciona. Esta etapa adiciona a atribuição de roles e perfis de acesso — tudo gerenciado via Supabase Dashboard.

**Fluxo**:
1. Usuário faz login via Google/Microsoft → `user_profiles.status = 'pending'`
2. Admin abre Supabase Dashboard → Table Editor → `user_profiles`
3. Admin muda `status` para `approved`, atribui `role` e `permissions_json`
4. Usuário faz login novamente → permissões carregadas na sessão
5. Funções RPC filtram dados baseado em `permissions_json`

**Mudanças de Código (apenas frontend)**:
- Atualizar `js/app.js` para carregar `role` e `permissions_json` no login
- Aplicar permissões nos filtros do frontend (ocultar dados não autorizados)

**Entregas**:
- Fluxo de autenticação atualizado com carregamento de permissões
- Documentação do processo de aprovação via Supabase Dashboard

### 1B.4 Atualizar Funções RPC para Filtragem por Permissões do Usuário
**Objetivo**: Filtrar dados no servidor baseado em permissões do usuário

> **Nota**: As funções RPC já foram atualizadas para aceitar arrays (seleção múltipla). Esta etapa adiciona a filtragem baseada em `permissions_json` do usuário.

**Mudanças nas funções RPC existentes**:
- `get_overview_metrics(p_user_id UUID, ...)`
- `get_positivacao_metrics(p_user_id UUID, ...)`
- `get_heatmap_metrics(p_user_id UUID, ...)`

**Lógica**:
1. Buscar `permissions_json` do usuário em `user_profiles`
2. Aplicar filtros por coluna na cláusula WHERE
3. Retornar apenas dados autorizados

**Exemplo**:
```sql
-- Se usuário tem restrição store_name: ["Casas Bahia SP"]
WHERE store_name = ANY(p_user_permissions->>'store_name')
```

**Entregas**:
- Definições de funções RPC atualizadas
- Casos de teste para filtragem de permissões
- Documentação da lógica de permissões

### 1B.5 Sanitização HTML (CRÍTICO)
**Objetivo**: Prevenir ataques XSS em todas as views

**Implementação**:
- Criar função utility `js/utils/sanitizer.js`
- Substituir todas chamadas `.innerHTML` com versões sanitizadas
- Usar biblioteca DOMPurify ou sanitizador customizado

**Arquivos a atualizar**:
- `js/view-overview.js` — renderização de gráficos
- `js/view-positivacao.js` — exibição de KPIs
- `js/view-heat-produtos.js` — renderização de heatmap
- `js/app.js` — injeção dinâmica de HTML

**Entregas**:
- Função utility de sanitização
- Todas chamadas `.innerHTML` atualizadas
- Casos de teste de segurança

### 1B.6 Testes & Deploy da Fase 1B
**Objetivo**: Validar implementação de RBAC/RLS

**Testes**:
- Testes unitários para filtragem de permissões
- Testes de integração para fluxo de aprovação
- Testes manuais com múltiplos roles de usuário
- Auditoria de segurança (exposição de credenciais, controle de acesso)

**Deploy**:
- Migração de banco de dados para produção
- Deploy de funções RPC atualizadas
- Deploy de código frontend atualizado
- Aprovação admin do usuário Motorola

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Acesso em produção para Motorola

---

## FASE 2: Exportação CSV (Junho 2026) — PRIORIDADE CLIENTE
**Duração**: 2-3 semanas | **Objetivo**: Permitir que usuários exportem dados das tabelas em CSV

> **Decisão (29/04/2026)**: O cliente Motorola solicitou exportação de dados como feature prioritária. CSV é a primeira entrega; PDF e histórico de exportações ficam para a FASE 4.

### 2.1 Motor de Exportação CSV (Semana 1-2)
**Objetivo**: Exportar dados filtrados em formato CSV

**Features**:
- Exportar view filtrada atual (Overview, Positivação, Heatmap, Performance)
- Incluir todas colunas visíveis
- Respeitar permissões do usuário (exportar apenas dados autorizados)
- Timestamp no nome do arquivo
- Encoding UTF-8 com BOM (compatibilidade Excel)

**Implementação**:
- Criar `js/utils/csvExporter.js`
- Adicionar botão de exportação em cada view
- Usar biblioteca Papa Parse para geração de CSV (ou implementação nativa)

**Entregas**:
- Funcionalidade de exportação CSV
- Botão de exportação na UI
- Casos de teste para integridade de dados

### 2.2 Testes & Deploy da Fase 2 (Semana 2-3)
**Objetivo**: Validar funcionalidade de exportação CSV

**Testes**:
- Precisão de exportação (dados correspondem à fonte)
- Validação de formato de arquivo (UTF-8, separadores)
- Aplicação de permissões (exportar apenas dados autorizados)
- Performance com grandes datasets
- Compatibilidade com Excel, Google Sheets, LibreOffice

**Deploy**:
- Deploy de funcionalidade de exportação
- Coleta de feedback do cliente Motorola

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Documentação para usuários

---

## FASE 3: Refatoração de Código & Qualidade (Junho - Julho 2026)
**Duração**: 3-4 semanas | **Objetivo**: Remover débito técnico, melhorar manutenibilidade

### 2.1 Remover Duplicidades de Código (Semana 1)
**Objetivo**: Aplicar princípio DRY

**Duplicidades Identificadas**:
1. **Lógica de retry** (aparece 3x em dataManager.js)
   - Extrair para `js/utils/retryHelper.js`
   - Função reutilizável: `retryWithBackoff(fn, maxAttempts, delay)`

2. **Animações de fade em KPIs** (duplicadas em arquivos de view)
   - Extrair para `js/utils/animationHelper.js`
   - Função reutilizável: `updateKPIWithFade(element, newValue)`

3. **Padrões de renderização de gráficos** (repetidos em todas views)
   - Extrair para `js/utils/chartHelper.js`
   - Funções reutilizáveis: `initChart()`, `destroyChart()`, `updateChart()`

4. **Lógica de atualização de filtros** (duplicada entre views)
   - Extrair para `js/utils/filterHelper.js`
   - Função reutilizável: `applyFiltersToData(data, filters)`

**Entregas**:
- Novos arquivos utility criados
- Todas duplicidades refatoradas
- Sem mudanças funcionais (mesmo comportamento)

### 2.2 Remover Código Morto (Semana 1-2)
**Objetivo**: Limpar código não utilizado

**Auditoria**:
- Remover variáveis não utilizadas (ex: `createClient` import em app.js)
- Remover blocos de código comentado
- Remover funções obsoletas (lógica antiga de carregamento de dados)
- Remover classes CSS não utilizadas

**Ferramentas**:
- ESLint com regra `no-unused-vars`
- Revisão manual de código

**Entregas**:
- Codebase limpo
- Configuração ESLint
- Relatório de código não utilizado

### 2.3 Comentários JSDoc Abrangentes (Semana 2)
**Objetivo**: Documentar todas funções com intenção clara

**Formato JSDoc padrão**:
```javascript
/**
 * Busca métricas de visão geral do Supabase RPC com lógica de retry.
 * @async
 * @returns {Promise<Array|null>} Array de métricas ou null em caso de falha
 * @throws {Error} Timeout de rede ou erro de banco de dados
 * @example
 * const data = await appData.fetchOverviewRPC();
 */
async fetchOverviewRPC() { ... }
```

**Arquivos a documentar**:
- `js/services/dataManager.js` — todos métodos
- `js/services/supabaseClient.js` — todas exportações
- `js/view-*.js` — todas funções de renderização
- `js/utils/*.js` — todas funções utility

**Entregas**:
- Todas funções documentadas
- README com visão geral da estrutura de código
- Configuração JSDoc para suporte IDE

### 2.4 Magic Numbers para Constants (Semana 2-3)
**Objetivo**: Extrair valores hardcoded para constantes nomeadas

**Criar `js/config/constants.js`**:
```javascript
export const TIMEOUTS = {
  RPC_CALL: 15000,        // 15 segundos
  RETRY_DELAY: 3000,      // 3 segundos
  TAB_REACTIVATION: 1000  // 1 segundo
};

export const ANIMATION = {
  FADE_DURATION: 300,     // ms
  VIEW_TRANSITION: 200,   // ms
  SKELETON_PULSE: 1500    // ms
};

export const LIMITS = {
  INITIAL_DATA_LOAD: 10000,
  MAX_RETRY_ATTEMPTS: 2
};

export const ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  VIEWER: 'viewer'
};
```

**Atualizar todos arquivos** para usar constantes em vez de magic numbers

**Entregas**:
- Arquivo de constantes criado
- Todos magic numbers substituídos
- Documentação de configuração

### 2.5 Métricas de Qualidade de Código (Semana 3-4)
**Objetivo**: Estabelecer baseline para melhorias futuras

**Métricas a rastrear**:
- Linhas de código (LOC)
- Complexidade ciclomática
- Percentual de duplicação de código
- Cobertura de testes
- Métricas de performance (tempos de resposta RPC)

**Ferramentas**:
- ESLint para qualidade de código
- Lighthouse para performance
- Revisão manual de código

**Entregas**:
- Relatório de qualidade de código
- Baseline de performance
- Recomendações de melhoria

### 2.6 Testes & Deploy da Fase 2 (Semana 4)
**Objetivo**: Validar refatoração sem mudanças funcionais

**Testes**:
- Testes de regressão (todas views funcionam identicamente)
- Testes de performance (sem desaceleração)
- Testes de compatibilidade de navegadores
- QA manual em todas features

**Deploy**:
- Deploy de código refatorado
- Monitoramento de erros
- Plano de rollback se necessário

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Comparação de performance (antes/depois)

---

## FASE 4: Exportação PDF & Histórico (Agosto 2026)
**Duração**: 2-3 semanas | **Objetivo**: Complementar exportação CSV com PDF e auditoria

> **Nota**: A exportação CSV já foi implementada na FASE 2. Esta fase adiciona PDF e histórico de exportações.

### 4.1 Motor de Exportação PDF (Semana 1-2)
**Objetivo**: Exportar relatórios em formato PDF

**Features**:
- Exportar view atual como relatório PDF
- Incluir gráficos como imagens
- Adicionar metadados (usuário, data, filtros aplicados)
- Styling profissional

**Implementação**:
- Usar bibliotecas jsPDF + html2canvas
- Criar `js/utils/pdfExporter.js`
- Adicionar botão de exportação em cada view

**Entregas**:
- Funcionalidade de exportação PDF
- Botão de exportação na UI
- Casos de teste para formatação

### 4.2 Histórico de Exportação & Auditoria
**Objetivo**: Rastrear todas exportações para compliance

**Banco de Dados**:
- Criar tabela `export_logs`
- Rastrear: user_id, export_type, filters_applied, timestamp

**Implementação**:
- Registrar cada exportação no banco
- Exibir histórico de exportações no perfil do usuário
- Admin pode visualizar todas exportações

**Entregas**:
- Tabela de logs de exportação
- Funcionalidade de logging
- View de histórico de exportações

### 4.3 Testes & Deploy da Fase 4
**Objetivo**: Validar funcionalidade de exportação

**Testes**:
- Precisão de exportação (dados correspondem à fonte)
- Validação de formato de arquivo
- Aplicação de permissões
- Performance com grandes datasets

**Deploy**:
- Deploy de funcionalidade de exportação
- Monitoramento de logs de exportação
- Coleta de feedback de usuários

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Documentação para usuários

---

## FASE 5: Logs de Auditoria & Analytics de Comportamento (Agosto - Setembro 2026)
**Duração**: 3-4 semanas | **Objetivo**: Rastrear atividade de usuário e padrões

### 4.1 Infraestrutura de Logs de Auditoria (Semana 1)
**Objetivo**: Rastreamento abrangente de atividades

**Banco de Dados**:
- Criar tabela `audit_logs`
- Rastrear: user_id, action, view, filters_applied, timestamp, ip_address

**Ações a registrar**:
- Login/logout
- Navegação entre views
- Mudanças de filtros
- Exportações de dados
- Mudanças de permissões (apenas admin)

**Implementação**:
- Criar `js/utils/auditLogger.js`
- Registrar todas ações de usuário
- Batch writes ao banco (performance)

**Entregas**:
- Tabela de logs de auditoria
- Utility de logging
- Mecanismo de batch write

### 4.2 Analytics de Comportamento de Usuário (Semana 2)
**Objetivo**: Entender padrões de uso

**Métricas a rastrear**:
- Views mais acessadas
- Filtros mais utilizados
- Horários de pico de uso
- Duração média de sessão
- Frequência de exportação

**Implementação**:
- Criar função RPC de analytics
- Construir view de dashboard de analytics
- Visualizar tendências ao longo do tempo

**Entregas**:
- Função RPC de analytics
- Dashboard de analytics
- Visualizações de tendências

### 4.3 Relatórios para Admin (Semana 3)
**Objetivo**: Fornecer insights para administradores

**Relatórios**:
- Resumo de atividade de usuários
- Trilha de auditoria de exportações
- Log de mudanças de permissões
- Métricas de saúde do sistema

**Implementação**:
- Criar views do painel admin
- Adicionar geração de relatórios
- Exportar relatórios em PDF

**Entregas**:
- Views de relatórios admin
- Geração de relatórios
- Funcionalidade de exportação

### 4.4 Testes & Deploy da Fase 4 (Semana 4)
**Objetivo**: Validar sistema de auditoria

**Testes**:
- Precisão de logs
- Impacto de performance
- Compliance de privacidade de dados
- Precisão de relatórios

**Deploy**:
- Deploy de infraestrutura de auditoria
- Monitoramento de volume de logs
- Coleta de feedback de admins

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Documentação para admins

---

## FASE 6: Migração React & Arquitetura Modular (Setembro - Outubro 2026)
**Duração**: 4-5 semanas | **Objetivo**: Fundação para dashboard modular

### 5.1 Setup do Projeto React (Semana 1)
**Objetivo**: Inicializar ambiente de desenvolvimento moderno

**Stack**:
- React 18+ com Vite (builds rápidas)
- Zustand para state management (mais simples que Redux)
- TailwindCSS para styling (já usando)
- Vitest para testes

**Implementação**:
- Criar novo projeto Vite + React
- Migrar configuração TailwindCSS
- Setup de store Zustand
- Configurar pipeline de build

**Entregas**:
- Projeto React inicializado
- Configuração de build
- Ambiente de desenvolvimento pronto

### 5.2 State Management com Zustand (Semana 1-2)
**Objetivo**: Substituir DataManager por Zustand

**Estrutura de store**:
```javascript
// stores/dashboardStore.js
export const useDashboardStore = create((set) => ({
  rawData: [],
  currentFilters: {},
  setRawData: (data) => set({ rawData: data }),
  setFilter: (key, value) => set(state => ({
    currentFilters: { ...state.currentFilters, [key]: value }
  })),
  getFilteredData: () => { /* computed */ }
}));
```

**Benefícios**:
- Menos boilerplate que Redux
- API mais simples
- Melhor suporte TypeScript
- Testes mais fáceis

**Entregas**:
- Store Zustand criado
- Lógica do DataManager migrada
- Documentação de store

### 5.3 Migração de Componentes (Semana 2-3)
**Objetivo**: Converter views vanilla JS para componentes React

**Componentes a criar**:
- `<OverviewView />` — substitui view-overview.js
- `<PositivacaoView />` — substitui view-positivacao.js
- `<HeatmapView />` — substitui view-heat-produtos.js
- `<FilterPanel />` — componente de filtro reutilizável
- `<KPICard />` — exibição de KPI reutilizável
- `<ChartContainer />` — wrapper de gráfico reutilizável

**Implementação**:
- Criar hierarquia de componentes
- Usar React hooks (useState, useEffect, useContext)
- Integrar com store Zustand
- Manter funcionalidade existente

**Entregas**:
- Componentes React criados
- Biblioteca de componentes
- Documentação Storybook (opcional)

### 5.4 Dashboard Modular com Canvas (Semana 3-4)
**Objetivo**: Dashboard customizável pelo usuário

**Features**:
- Sistema de widgets drag-and-drop
- Salvar/carregar layouts de dashboard
- Biblioteca de widgets (KPI, Gráfico, Tabela, etc.)
- Layout de grid responsivo

**Implementação**:
- Usar biblioteca react-grid-layout
- Criar registry de widgets
- Implementar persistência de layout
- Adicionar UI de configuração de widgets

**Entregas**:
- Componente de dashboard modular
- Sistema de widgets
- Persistência de layout
- Documentação para usuários

### 5.5 Testes & Deploy da Fase 5 (Semana 4-5)
**Objetivo**: Validar migração React

**Testes**:
- Paridade de features com versão vanilla JS
- Comparação de performance
- Compatibilidade de navegadores
- Testes de aceitação do usuário

**Deploy**:
- Deploy de versão React junto com vanilla JS
- Teste A/B com usuários
- Rollout gradual
- Plano de rollback

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Guia de migração

---

## FASE 7: Polish & Otimização (Outubro - Novembro 2026)
**Duração**: 3-4 semanas | **Objetivo**: Pronto para produção

### 6.1 Otimização de Performance
**Objetivo**: Otimizar para escala (milhões de linhas)

**Áreas**:
- Otimização de queries RPC
- Otimização de renderização frontend
- Estratégia de caching
- Revisão de indexação de banco

**Entregas**:
- Relatório de performance
- Recomendações de otimização
- Benchmarks

### 6.2 Hardening de Segurança
**Objetivo**: Auditoria de segurança final

**Áreas**:
- Revisão de exposição de credenciais
- Proteção XSS/CSRF
- Prevenção de SQL injection
- Rate limiting

**Entregas**:
- Relatório de auditoria de segurança
- Plano de remediação
- Checklist de segurança

### 6.3 Documentação & Treinamento
**Objetivo**: Preparar para uso em produção

**Documentação**:
- Guia do usuário
- Guia do admin
- Documentação de API
- Guia de deploy

**Treinamento**:
- Treinamento de admin
- Treinamento de usuário
- Documentação de suporte

**Entregas**:
- Documentação completa
- Materiais de treinamento
- Runbook de suporte

### 6.4 Testes Finais & Launch
**Objetivo**: Deploy em produção

**Testes**:
- Testes de regressão completos
- Testes de carga
- Testes de segurança
- Testes de aceitação do usuário

**Deploy**:
- Deploy em produção
- Setup de monitoramento
- Equipe de suporte pronta

**Entregas**:
- Relatório de testes
- Checklist de deploy
- Documentação de go-live

---

## Timeline de Acesso Motorola

**AGORA (Abril 2026)**:
- ✅ Dashboard atual disponível para Motorola (v0.92.1)
- ✅ Todas 4 views funcionando (Overview, Positivação, Heatmap, Performance)
- ✅ Filtros funcionais com seleção múltipla (arrays)
- ✅ Animações de carregamento implementadas
- ✅ Índices de banco para performance
- ✅ Login redesenhado (Google, Microsoft, email/senha)
- ✅ PWA corrigida (sem notificações OAuth aleatórias)
- ✅ Filtro de data corrigido (meses anteriores visíveis)
- 🔄 Hardening RLS em andamento (spec criada)

**Após Fase 1A (Maio 2026)**:
- ✅ Permissões do `anon` revogadas
- ✅ RPCs acessíveis apenas por `authenticated`
- ✅ `createFreshClient()` com injeção de token
- ✅ Scripts de rollback e validação prontos

**Após Fase 1B (Maio-Junho 2026)**:
- ✅ RBAC implementado (roles + permissions_json)
- ✅ Sanitização HTML completa
- ✅ Admin gerencia usuários via Supabase Dashboard

**Após Fase 2 (Junho 2026)** — PRIORIDADE CLIENTE:
- ✅ Exportação CSV disponível em todas as views
- ✅ Motorola pode extrair dados das tabelas

**Após Fase 3 (Julho 2026)**:
- ✅ Exportação CSV/PDF disponível
- ✅ Histórico de exportações rastreado

**Após Fase 4 (Agosto 2026)**:
- ✅ Logs de auditoria disponíveis
- ✅ Analytics de comportamento de usuário visível

**Após Fase 5 (Setembro 2026)**:
- ✅ Versão React disponível (migração opcional)
- ✅ Dashboard modular disponível

---

## Mitigação de Riscos

| Risco | Mitigação |
|-------|-----------|
| Burnout do desenvolvedor solo | Priorizar ruthlessly; Fases 5-6 podem ser adiadas |
| Performance do banco em escala | Índices criados na Fase 1; otimização RPC na Fase 6 |
| Vulnerabilidades de segurança | Sanitização na Fase 1; auditoria na Fase 6 |
| Complexidade da migração React | Manter versão vanilla JS como fallback |
| Adoção de usuários para novas features | Coletar feedback cedo; iterar baseado em uso |

---

## Métricas de Sucesso

- **Fase 1A**: Hardening RLS aplicado; 0 acesso anônimo a dados; scripts de rollback prontos
- **Fase 1B**: RBAC funcionando; Motorola aprovado; 0 problemas de segurança; admin via Supabase Dashboard
- **Fase 2**: Exportação CSV funcional em todas as views; cliente Motorola usando ativamente
- **Fase 3**: Qualidade de código melhorada; 0 regressões funcionais
- **Fase 4**: Exportação PDF funcional; histórico de exportações rastreado
- **Fase 5**: Logs de auditoria capturando todas ações; dashboard de analytics útil
- **Fase 6**: Paridade de features da versão React com vanilla JS
- **Fase 7**: Pronto para produção; Motorola usando ativamente; 99.9% uptime

---

## Notas Importantes

- **Motorola pode usar AGORA** — não esperar pela migração React (v0.92.1 funcional)
- **Hardening RLS é prioridade imediata** — spec criada, implementação pendente
- **Exportação CSV é prioridade do cliente** — pedido direto da Motorola, FASE 2
- **Admin via Supabase Dashboard** — sem painel customizado, economia de tempo
- **RBAC sem painel admin** — roles e permissões gerenciados via Supabase Dashboard
- **Priorizar segurança** — sanitização HTML é crítica
- **Iterar baseado em feedback** — coletar input de usuários após cada fase
- **Manter compatibilidade retroativa** — não quebrar funcionalidade existente
- **Documentar conforme avança** — mais fácil que documentar no final
- **Testar thoroughly** — especialmente lógica de permissões e exportações
- **Timeline ajustada** — FASE 1 dividida em 1A e 1B, CSV priorizado como FASE 2
