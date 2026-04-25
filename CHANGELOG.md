# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.90.1] - 2026-04-25

### 🐛 Corrigido (Hotfix)

#### Notificações OAuth Aleatórias no PWA
- **Problema**: Notificação "aguardando aprovação" aparecia aleatoriamente quando usuário deixava a tela de login inativa e trocava de app, mesmo sem ter clicado em nenhum botão de login
- **Causa**: Supabase Auth SDK tentando renovar tokens OAuth em background, deixando code-verifiers órfãos no localStorage
- **Solução**: 
  - Configuração explícita do Supabase Auth com flowType PKCE
  - Limpeza automática de code-verifiers após 10s de inatividade
  - Flag de autenticação em progresso para não interferir com logins reais
  - Detector de visibilidade de página (visibilitychange API)

#### Mensagem "Lost Connection to Dev Server" no PWA
- **Problema**: Mensagem de erro aparecia no topo da página apenas no PWA instalado (Firebase)
- **Causa**: Service Worker cacheando scripts de ferramentas de desenvolvimento (Vite, Webpack)
- **Solução**: Bloqueio de conexões WebSocket e caminhos de dev server no Service Worker

### 🔧 Melhorias

#### Service Worker
- Adicionados logs de debug para facilitar troubleshooting
- Atualizada versão do cache para `app-20260425.0001`
- Bloqueio explícito de:
  - WebSockets (ws://, wss://)
  - Caminhos Vite (`/__vite`, `/@vite/client`)
  - Webpack HMR (`/webpack-hmr`)
  - Conexões localhost em portas diferentes

#### Autenticação OAuth
- Feedback visual melhorado nos botões Google e Microsoft
- Botões mostram "AGUARDANDO APROVAÇÃO..." durante OAuth
- Timeout de 2 minutos para resetar botões se usuário não aprovar
- RedirectTo configurado para origem atual

#### PWA
- Auto-atualização do Service Worker a cada 30 segundos
- Reload automático quando nova versão é detectada
- Melhor gerenciamento de cache e sessão

### 📚 Documentação

- Adicionado `docs/CORRECAO_PWA_DEV_SERVER.md` - Documentação técnica completa
- Adicionado `docs/RESUMO_CORRECAO_OAUTH.md` - Resumo executivo
- Adicionado `CHANGELOG.md` - Histórico de mudanças

### 🔍 Arquivos Modificados

- `sw.js` - Service Worker com bloqueios e logs
- `js/services/supabaseClient.js` - Configuração explícita do Auth
- `js/app.js` - Limpeza de OAuth + detector de inatividade
- `index.html` - Auto-atualização do SW

### 🧪 Testes

- ✅ Tela de login parada não gera mais notificações
- ✅ Login OAuth funciona normalmente
- ✅ PWA instalado não mostra mais "lost connection to dev server"
- ✅ Service Worker atualiza automaticamente

---

## [0.90.0] - 2026-04-23

### Versão Base
- Dashboard de Analytics com múltiplas views
- Autenticação via Supabase (Google, Microsoft, Email/Senha)
- Sistema de aprovação de usuários
- Performance Monitor
- PWA com Service Worker
- Light/Dark Mode
- Filtros hierárquicos (Data, Shopping, PDV, Linha, Regional, 80/20, Visibilidade)
- Views: Overview, Positivação, Heatmap, Performance
- Gráficos interativos com Chart.js
- Sistema de cache inteligente
- GPU Lite Mode para hardware fraco

---

## Formato das Entradas

### Tipos de Mudanças
- `Adicionado` para novas funcionalidades
- `Modificado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correções de bugs
- `Segurança` para vulnerabilidades corrigidas

### Versionamento
- **MAJOR** (X.0.0): Mudanças incompatíveis na API
- **MINOR** (0.X.0): Novas funcionalidades compatíveis
- **PATCH** (0.0.X): Correções de bugs compatíveis
