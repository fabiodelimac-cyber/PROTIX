# 🚀 Release Notes - v0.90.1 (Hotfix)

**Data**: 25 de Abril de 2026  
**Tipo**: Hotfix  
**Commit**: `98a7c0c`

---

## 🎯 Resumo Executivo

Este hotfix corrige um problema crítico de UX onde notificações OAuth apareciam aleatoriamente na tela de login do PWA, causando confusão aos usuários. Também resolve a mensagem "lost connection to dev server" que aparecia apenas no PWA instalado.

---

## 🐛 Problemas Corrigidos

### 1. Notificações OAuth Aleatórias (Crítico)

**Sintoma**:
- Usuário deixa a tela de login aberta
- Troca para outro app
- Ao voltar, aparece notificação "aguardando aprovação OAuth"
- **Acontecia mesmo sem ter clicado em nenhum botão de login**

**Impacto**:
- ⚠️ Confusão do usuário
- ⚠️ Experiência ruim no PWA
- ⚠️ Aparência de bug ou falha de segurança

**Solução**:
- ✅ Limpeza automática de code-verifiers órfãos
- ✅ Detector de página inativa (10s)
- ✅ Configuração explícita do Supabase Auth
- ✅ Flag de autenticação em progresso

**Resultado**:
- 🎉 Notificações não aparecem mais aleatoriamente
- 🎉 Login OAuth continua funcionando perfeitamente
- 🎉 Melhor experiência no PWA

---

### 2. Mensagem "Lost Connection to Dev Server"

**Sintoma**:
- Mensagem de erro no topo da página
- Aparecia apenas no PWA instalado (Firebase)
- Não aparecia no localhost ou navegador normal

**Impacto**:
- ⚠️ Aparência de erro técnico
- ⚠️ Confusão do usuário
- ⚠️ Credibilidade reduzida

**Solução**:
- ✅ Bloqueio de WebSockets de dev server no Service Worker
- ✅ Bloqueio de caminhos Vite e Webpack HMR
- ✅ Atualização da versão do cache

**Resultado**:
- 🎉 Mensagem não aparece mais
- 🎉 PWA funciona perfeitamente
- 🎉 Experiência profissional

---

## 🔧 Melhorias Implementadas

### Service Worker
- 📝 Logs de debug para troubleshooting
- 🔄 Versão do cache atualizada: `app-20260425.0001`
- 🚫 Bloqueio de conexões de desenvolvimento:
  - WebSockets (ws://, wss://)
  - Vite HMR (`/__vite`, `/@vite/client`)
  - Webpack HMR (`/webpack-hmr`)
  - Localhost em portas diferentes

### Autenticação OAuth
- 💬 Feedback visual melhorado:
  - "ABRINDO GOOGLE..." ao clicar
  - "AGUARDANDO APROVAÇÃO..." durante OAuth
  - Botão reseta após 2 minutos se não aprovado
- 🔗 RedirectTo configurado para origem atual
- 🛡️ PKCE (Proof Key for Code Exchange) habilitado

### PWA
- 🔄 Auto-atualização do Service Worker (30s)
- ⚡ Reload automático em nova versão
- 🧹 Limpeza inteligente de cache
- 📱 Melhor gerenciamento de sessão

---

## 📊 Antes vs Depois

### ❌ Antes (v0.90.0)

```
Usuário na tela de login
    ↓
Deixa parado e troca de app
    ↓
Supabase tenta renovar token em background
    ↓
Navegador mostra: "aguardando aprovação OAuth" 😡
    ↓
Usuário confuso: "Eu não cliquei em nada!"
```

### ✅ Depois (v0.90.1)

```
Usuário na tela de login
    ↓
Deixa parado e troca de app (10+ segundos)
    ↓
Sistema detecta inatividade
    ↓
Limpa code-verifiers órfãos automaticamente
    ↓
Nenhuma notificação aparece 😊
    ↓
Usuário volta e faz login normalmente
```

---

## 🧪 Testes Realizados

### ✅ Teste 1: Notificação Não Aparece
1. Abrir site na tela de login
2. **NÃO clicar** em nenhum botão
3. Deixar parado por 30 segundos
4. Trocar para outro app
5. Aguardar 15 segundos
6. Voltar para o site
7. **Resultado**: Nenhuma notificação aparece ✅

### ✅ Teste 2: Login OAuth Funciona
1. Clicar em "Entrar com Google"
2. Botão mostra "AGUARDANDO APROVAÇÃO..."
3. Completar login no popup
4. **Resultado**: Login funciona normalmente ✅

### ✅ Teste 3: PWA Sem Erros
1. Instalar PWA
2. Abrir aplicativo instalado
3. **Resultado**: Sem mensagem "lost connection" ✅

### ✅ Teste 4: Service Worker Atualiza
1. Fazer deploy de nova versão
2. Aguardar 30 segundos
3. **Resultado**: App recarrega automaticamente ✅

---

## 📚 Documentação Técnica

### Documentos Criados
- 📄 `docs/CORRECAO_PWA_DEV_SERVER.md` - Documentação técnica completa
- 📄 `docs/RESUMO_CORRECAO_OAUTH.md` - Resumo executivo
- 📄 `CHANGELOG.md` - Histórico de mudanças
- 📄 `docs/RELEASE_NOTES_v0.90.1.md` - Este documento

### Arquivos Modificados
- `sw.js` - Service Worker
- `js/services/supabaseClient.js` - Cliente Supabase
- `js/app.js` - Lógica de autenticação
- `index.html` - Auto-atualização do SW

---

## 🚀 Como Atualizar

### Para Usuários (PWA Instalado)
O PWA vai atualizar **automaticamente** em até 30 segundos após o deploy. Você verá um reload rápido da página.

### Para Desenvolvedores
```bash
# 1. Pull das mudanças
git pull origin main

# 2. Verificar versão
git log --oneline -1
# Deve mostrar: 98a7c0c hotfix: corrige notificações OAuth aleatórias no PWA

# 3. Deploy (se necessário)
./deploy.sh
```

### Forçar Atualização Manual (se necessário)
**Desktop (Chrome/Edge)**:
1. F12 (DevTools)
2. Application > Service Workers
3. "Unregister"
4. Recarregar página

**Mobile (Android)**:
1. Configurações > Apps > [Nome do App]
2. Armazenamento > Limpar dados
3. Reabrir app

---

## 🎓 Lições Aprendidas

### 1. Code-Verifiers Órfãos
- Parte do fluxo PKCE do OAuth 2.0
- Ficam no localStorage durante autenticação
- Se não forem limpos, causam tentativas de OAuth "fantasma"
- **Solução**: Limpeza automática após inatividade

### 2. Supabase Auth em Background
- SDK tenta renovar tokens automaticamente
- Pode causar comportamentos inesperados em PWA
- **Solução**: Configuração explícita + monitoramento de estado

### 3. Service Worker e Cache
- Cache agressivo pode guardar scripts de desenvolvimento
- Importante versionar o cache a cada mudança crítica
- **Solução**: Versionamento automático + auto-atualização

### 4. Visibilidade de Página
- API `visibilitychange` é essencial para PWAs
- Permite detectar quando usuário troca de app
- **Solução**: Usar para limpar estados temporários

---

## 📞 Suporte

### Problemas Conhecidos
Nenhum problema conhecido nesta versão.

### Reportar Bugs
Se encontrar algum problema:
1. Verifique o console do navegador (F12)
2. Anote os logs que começam com `🔐` ou `[SW]`
3. Reporte com detalhes do comportamento

### Contato
- **Desenvolvedor**: ProSolution Marketing
- **Repositório**: https://github.com/fabiodelimac-cyber/PROTIX

---

## 🎉 Agradecimentos

Obrigado por usar o ProSolution APP! Este hotfix melhora significativamente a experiência do usuário no PWA.

**Próximos Passos**:
- Monitorar feedback dos usuários
- Coletar métricas de uso do PWA
- Planejar próximas features

---

**Versão**: 0.90.1  
**Build**: app-20260425.0001  
**Status**: ✅ Produção  
**Compatibilidade**: Todas as versões anteriores
