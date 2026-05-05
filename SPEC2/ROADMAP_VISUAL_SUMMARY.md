# 📊 ProSolution Analytics - Resumo Visual do Roadmap
**Última Atualização**: 29 de Abril de 2026 | **Versão Atual**: v0.92.1

## 1️⃣ HIGHLIGHTS DE CADA FASE (Tabelas Visuais)

### FASE 1A: Hardening RLS & Segurança Base — ✅ CONCLUÍDO (29/04/2026)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔐 Hardening RLS & Segurança Base                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ REVOKE ALL do anon nas 3 tabelas                         │
│ ✅ REVOKE EXECUTE do anon + PUBLIC nas funções RPC          │
│ ✅ createFreshClient() async com injeção de token JWT       │
│ ✅ dataManager.js refatorado (_callRPC centralizado)        │
│ ✅ app.js com reactivateView() (hibernação Chrome)          │
│ ✅ sw.js Network-first para JS/HTML                         │
│ ✅ Scripts: hardening + rollback + validação                │
│ ✅ Backups pré-hardening (schema + data)                    │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 1 dia                                           │
│ 🎯 Impacto: Dados protegidos contra acesso anônimo          │
│ ✅ Status: CONCLUÍDO — 29/04/2026                            │
└─────────────────────────────────────────────────────────────┘
```

### FASE 1B: RBAC & Sanitização (Maio - Junho 2026)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔐 RBAC & Sanitização HTML                                  │
├─────────────────────────────────────────────────────────────┤
│ ⏭️ Estender user_profiles com role + permissions_json       │
│ ⏭️ Criar user_access_profiles (templates reutilizáveis)     │
│ ⏭️ Admin via Supabase Dashboard (sem painel customizado)    │
│ ⏭️ Atualizar RPC functions com filtragem por permissões     │
│ ⏭️ Sanitização HTML (CRÍTICO - prevenir XSS)                │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 2-3 semanas                                     │
│ 🎯 Impacto: Motorola aprovado com permissões seguras        │
│ 🚨 Status: PRÓXIMO — Após conclusão da FASE 1A              │
└─────────────────────────────────────────────────────────────┘
```

### FASE 2: Exportação CSV (Junho 2026) — 🔥 PRIORIDADE CLIENTE
```
┌─────────────────────────────────────────────────────────────┐
│ 📥 Exportação CSV — Pedido do Cliente Motorola              │
├─────────────────────────────────────────────────────────────┤
│ ⏭️ Exportação CSV em todas as views (Papa Parse)            │
│ ⏭️ Botão de exportação integrado na UI                      │
│ ⏭️ Respeitar permissões do usuário em exports               │
│ ⏭️ Encoding UTF-8 com BOM (compatibilidade Excel)           │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 2-3 semanas                                     │
│ 🎯 Impacto: Cliente pode extrair dados das tabelas          │
│ 🔥 Status: ALTA PRIORIDADE — Pedido direto do cliente       │
└─────────────────────────────────────────────────────────────┘
```

### FASE 3: Refatoração & Qualidade (Junho - Julho 2026)
```
┌─────────────────────────────────────────────────────────────┐
│ 🧹 Refatoração de Código & Qualidade                        │
├─────────────────────────────────────────────────────────────┤
│ ✅ Remover duplicidades (retry, KPI fade, chart rendering)  │
│ ✅ Remover código morto (variáveis, comentários obsoletos)   │
│ ✅ Adicionar JSDoc comments em todas funções                 │
│ ✅ Extrair magic numbers para constants.js                   │
│ ✅ Estabelecer métricas de qualidade de código               │
│ ✅ Adicionar testes unitários (Vitest)                       │
│ ✅ Adicionar testes E2E (Playwright)                         │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 3-4 semanas                                     │
│ 🎯 Impacto: -30% linhas de código, +50% manutenibilidade    │
│ 📊 Status: IMPORTANTE - Reduzir débito técnico              │
└─────────────────────────────────────────────────────────────┘
```

### FASE 3: Motor de Extração (Junho - Julho 2026)
```
┌─────────────────────────────────────────────────────────────┐
│ 📥 Motor de Extração de Dados                               │
├─────────────────────────────────────────────────────────────┤
│ ✅ Exportação CSV (Papa Parse)                              │
│ ✅ Exportação PDF (jsPDF + html2canvas)                     │
│ ✅ Histórico de exportações (export_logs table)              │
│ ✅ Respeitar permissões do usuário em exports               │
│ ✅ Logging de compliance                                     │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 3-4 semanas                                     │
│ 🎯 Impacto: 80%+ usuários usando exportação                 │
│ 📊 Status: IMPORTANTE - Feature muito solicitada            │
└─────────────────────────────────────────────────────────────┘
```

### FASE 4: Auditoria & Analytics (Julho - Agosto 2026)
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Logs de Auditoria & Analytics                            │
├─────────────────────────────────────────────────────────────┤
│ ✅ Tabela audit_logs (rastrear todas ações)                 │
│ ✅ Analytics de comportamento (views, filtros, exports)      │
│ ✅ Dashboard de insights para admin                          │
│ ✅ Relatórios de compliance                                  │
│ ✅ Integração com Sentry para erros                          │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 3-4 semanas                                     │
│ 🎯 Impacto: Visibilidade completa de uso + compliance       │
│ 📊 Status: IMPORTANTE - Entender padrões de uso             │
└─────────────────────────────────────────────────────────────┘
```

### FASE 5: Migração React (Agosto - Setembro 2026)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚛️  Migração React & Arquitetura Modular                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ Setup Vite + React 18 + Zustand                          │
│ ✅ Migrar DataManager → Zustand store                        │
│ ✅ Criar 6+ componentes React reutilizáveis                 │
│ ✅ Dashboard modular com drag-drop widgets                   │
│ ✅ Manter vanilla JS como fallback                           │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 4-5 semanas                                     │
│ 🎯 Impacto: Arquitetura moderna + reutilização de código    │
│ 📊 Status: DESEJÁVEL - Pode ser adiada se necessário        │
└─────────────────────────────────────────────────────────────┘
```

### FASE 6: Polish & Otimização (Setembro - Outubro 2026)
```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Polish & Otimização Final                                │
├─────────────────────────────────────────────────────────────┤
│ ✅ Otimização de performance (RPC + frontend)                │
│ ✅ Hardening de segurança (auditoria final)                  │
│ ✅ Documentação completa (guias + runbooks)                  │
│ ✅ Testes finais (regressão + carga + segurança)             │
│ ✅ Deploy em produção com 99.9% uptime                       │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  Duração: 3-4 semanas                                     │
│ 🎯 Impacto: Production-ready, Motorola usando ativamente     │
│ 📊 Status: FINALIZAÇÃO - Go-live                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ STACK DE TECNOLOGIAS

### 🔧 Stack Atual (Vanilla JavaScript)
```
┌──────────────────────────────────────────────────────────────┐
│ CAMADA          │ TECNOLOGIA              │ VERSÃO           │
├──────────────────────────────────────────────────────────────┤
│ Frontend        │ Vanilla JavaScript ES6+ │ -                │
│ Styling         │ TailwindCSS             │ 3.x              │
│ Backend         │ Supabase (PostgreSQL)   │ -                │
│ Gráficos        │ Chart.js                │ 3.x              │
│ HTTP Client     │ Supabase JS SDK         │ -                │
│ Build           │ Nenhum (vanilla)        │ -                │
│ Versionamento   │ Git                     │ -                │
└──────────────────────────────────────────────────────────────┘
```

### 🎯 Stack Target (React + Modular)
```
┌──────────────────────────────────────────────────────────────┐
│ CAMADA          │ TECNOLOGIA              │ VERSÃO           │
├──────────────────────────────────────────────────────────────┤
│ Frontend        │ React                   │ 18+              │
│ State Mgmt      │ Zustand                 │ 4.x              │
│ Styling         │ TailwindCSS             │ 3.x (mantém)     │
│ Build Tool      │ Vite                    │ 5.x              │
│ Gráficos        │ Chart.js / Recharts     │ 3.x / 2.x        │
│ HTTP Client     │ Supabase JS SDK         │ - (mantém)       │
│ Testing         │ Vitest + Playwright     │ -                │
│ Monitoring      │ Sentry                  │ -                │
│ Analytics       │ Google Analytics        │ -                │
│ Versionamento   │ Semantic Versioning     │ -                │
└──────────────────────────────────────────────────────────────┘
```

### 📊 Migração de Stack por Fase
```
FASE 1-4: Mantém vanilla JS + TailwindCSS + Chart.js
          ↓
FASE 5:   Introduz React + Vite + Zustand
          ↓
FASE 6:   Otimizações finais (sem mudanças de stack)
```

---

## 3️⃣ MONITORAMENTO, TESTES & VERSIONAMENTO (INTEGRADO)

### 🚨 Monitoramento (Sentry + Google Analytics)
**Integração**: Paralelo com FASE 1 (semana 1-2)

```javascript
// Sentry para tracking de erros
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

// Capturar erros RPC
catch (err) {
  Sentry.captureException(err, {
    tags: { rpc: 'get_overview_metrics' },
    extra: { params, timestamp: new Date().toISOString() }
  });
}

// Google Analytics para comportamento de usuário
gtag('event', 'view_change', { view: viewName });
gtag('event', 'filter_applied', { filter: filterKey });
gtag('event', 'export', { type: exportType });
```

**Alertas**:
- ⚠️ Sentry: Notificação se RPC falhar 3x em 5 minutos
- ⚠️ UptimeRobot: Monitoramento de uptime (ping a cada 5 min)
- ⚠️ Email alerts: Erros críticos para admin

### ✅ Testes Automatizados
**Integração**: FASE 2 (semana 3-4)

```javascript
// Testes Unitários (Vitest)
describe('DataManager', () => {
  it('deve filtrar dados corretamente', () => {
    appData.setRawData([
      { store_name: 'Casas Bahia', sessions: 100 },
      { store_name: 'Carrefour', sessions: 50 }
    ]);
    appData.setFilter('store_name', 'Casas Bahia');
    
    const filtered = appData.getFilteredData();
    expect(filtered).toHaveLength(1);
  });
});

// Testes E2E (Playwright)
test('fluxo de login com aprovação', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('#btn-google-login');
  await expect(page.locator('text=aguarda aprovação')).toBeVisible();
});
```

**CI/CD (GitHub Actions)**:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit
      - run: npm run test:e2e
      - run: npm run build
```

### 📦 Versionamento Semântico
**Integração**: FASE 1 (semana 1)

```javascript
// js/config/version.js
export const APP_VERSION = '1.0.0-beta.1';
export const BUILD_DATE = new Date().toISOString();
export const GIT_COMMIT = process.env.VITE_GIT_COMMIT || 'unknown';

// Exibir no footer
ProSolution Analytics v1.0.0-beta.1 [BETA]
```

**Changelog**:
```markdown
## [1.0.0-beta.1] - 2026-04-15
### Added
- RBAC/RLS access control
- HTML sanitization
- Sentry error tracking

### Fixed
- Chrome tab hibernation issue
- RPC timeout handling
```

---

## 4️⃣ CHECKLIST PRÉ-PRODUÇÃO MOTOROLA (Atualizado 29/04/2026)

### 🔴 CRÍTICO (Fazer ANTES de liberar)
```
☐ Executar hardening RLS (spec rls-security-hardening)
☐ Modificar createFreshClient() com injeção de token
☐ Verificar RLS ativo em interactions e user_profiles
☐ Testar acesso com usuário não aprovado (deve bloquear)
☑ Testar em Chrome, Safari, Firefox, Edge (parcial)
☐ Testar em mobile (iOS e Android)
☐ Backup completo do banco de dados
☑ Documentar processo de aprovação de usuários
☐ Testar sanitização HTML (injetar <script> em filtros)
☐ Verificar permissions_json sendo aplicadas corretamente
```

### 🟠 IMPORTANTE (Fazer na primeira semana)
```
☐ Implementar Sentry para tracking de erros
☐ Adicionar Google Analytics ou Mixpanel
☐ Criar runbook de troubleshooting
☐ Definir SLA (tempo de resposta esperado)
☐ Configurar alertas de downtime (UptimeRobot)
☐ Testar retry logic com conexão lenta
☐ Validar performance com 10k+ linhas
```

### 🟡 DESEJÁVEL (Fazer no primeiro mês)
```
☐ Refatorar retry logic (DRY)
☐ Adicionar testes automatizados (unit + E2E)
☐ Implementar sanitização de HTML completa
☑ Adicionar versionamento semântico (v0.92.1)
☑ Criar changelog para usuários (CHANGELOG.md)
☐ Documentar API RPC
☐ Setup de CI/CD com testes
```

### ✅ JÁ CONCLUÍDO
```
☑ Funções RPC atualizadas para arrays (seleção múltipla)
☑ Login redesenhado (Google, Microsoft, email/senha)
☑ Correções PWA (OAuth, filtro de data)
☑ 4 views funcionando (Overview, Positivação, Heatmap, Performance)
```

---

## 📈 Timeline Consolidada

```
ABRIL 2026
├─ ✅ Semana 1-2: Funções RPC com arrays + normalize_filter_param
├─ ✅ Semana 3: Login redesenhado + correções PWA (v0.90.1, v0.92.0-rc2)
├─ 🔄 Semana 4-5: FASE 1A - Spec de hardening RLS criada
│
MAIO 2026
├─ Semana 1-2: FASE 1A - Executar hardening + modificar createFreshClient
├─ Semana 3-4: FASE 1B - RBAC (roles, permissions_json) + Sanitização HTML
│
JUNHO 2026
├─ Semana 1-2: FASE 1B - Conclusão + Deploy
├─ Semana 3-4: FASE 2 - Exportação CSV (PRIORIDADE CLIENTE)
│
JULHO 2026
├─ Semana 1-2: FASE 3 - Remover duplicidades + dead code
├─ Semana 3-4: FASE 3 - JSDoc + Constants + Testes
│
AGOSTO 2026
├─ Semana 1-2: FASE 4 - Exportação PDF + Histórico de exports
├─ Semana 3-4: FASE 5 - Audit logs + Analytics
│
SETEMBRO 2026
├─ Semana 1-2: FASE 6 - React setup + Zustand
├─ Semana 3-4: FASE 6 - Componentes + Dashboard modular
│
OUTUBRO 2026
├─ Semana 1-2: FASE 7 - Performance + Security
├─ Semana 3-4: FASE 7 - Documentação + Go-live
│
NOVEMBRO 2026
└─ Motorola usando ativamente em produção ✅
```

---

## 🎯 Métricas de Sucesso

| Fase | Métrica | Target |
|------|---------|--------|
| **1A** | Hardening RLS aplicado | ✅ 100% |
| **1A** | Acesso anônimo a dados | ✅ 0 |
| **1B** | RBAC funcionando | ✅ 100% |
| **1B** | Problemas de segurança | ✅ 0 |
| **2** | Exportação CSV funcional | ✅ Todas views |
| **3** | Redução de código duplicado | ✅ -30% |
| **3** | Cobertura de testes | ✅ 70%+ |
| **4** | Exportação PDF funcional | ✅ 100% |
| **5** | Logs de auditoria capturados | ✅ 100% |
| **6** | Paridade React vs Vanilla | ✅ 100% |
| **7** | Uptime em produção | ✅ 99.9% |

---

## 🚀 Próximos Passos

1. ✅ Roadmap criado e traduzido para português
2. ✅ Stack de tecnologias definido (atual vs. target)
3. ✅ Monitoramento, testes e versionamento integrados
4. ✅ Checklist pré-produção Motorola criado
5. ✅ **Spec para FASE 1A criada** (Hardening RLS)
6. 🔄 **Executar tasks da FASE 1A** (em andamento)
7. ⏭️ **Criar spec para FASE 1B** (RBAC Completo)

---

**Roadmap completo disponível em**: `.kiro/ROADMAP.md`
