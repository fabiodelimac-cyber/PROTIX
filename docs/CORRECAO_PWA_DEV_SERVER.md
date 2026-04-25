# Correção: Notificações OAuth Aleatórias no PWA

## Problema Identificado

### 1. Mensagem "Lost Connection to Dev Server"
- **Onde aparece**: Apenas no PWA instalado (Firebase), não no localhost ou navegador
- **Causa**: O Service Worker estava cacheando scripts de ferramentas de desenvolvimento (Vite, Webpack, etc.) que tentam se reconectar ao servidor local
- **Sintoma**: Mensagem de erro no topo da página do PWA instalado

### 2. Notificações OAuth Aleatórias na Tela de Login ⚠️ **PROBLEMA PRINCIPAL**
- **Onde aparece**: Quando a tela de login fica parada/inativa e o usuário troca de app
- **Causa**: Supabase tentando renovar tokens OAuth em background, mesmo sem sessão ativa
- **Sintoma**: Notificação do navegador "aguardando aprovação" aparece aleatoriamente
- **Comportamento**: 
  - Usuário entra no site e deixa na tela de login
  - Troca para outro app
  - Quando volta, aparece a notificação OAuth do navegador
  - **Não precisa ter clicado em nenhum botão de login**

## Causa Raiz do Problema OAuth

O Supabase Auth SDK, por padrão, tenta:
1. **Detectar callbacks OAuth na URL** (detectSessionInUrl: true)
2. **Renovar tokens automaticamente** (autoRefreshToken: true)
3. **Persistir sessão no localStorage** (persistSession: true)

Quando a página fica inativa, o Supabase pode tentar:
- Verificar se há um callback OAuth pendente na URL
- Renovar tokens expirados (mesmo sem sessão ativa)
- Restaurar sessões antigas do localStorage

Isso causa **tentativas de autenticação em background**, que o navegador interpreta como "aguardando aprovação OAuth" e mostra a notificação.

## Soluções Implementadas

### 1. Service Worker (`sw.js`)

#### Bloqueio de Conexões de Dev Server
```javascript
// Bloqueia conexões de dev server (Vite, Webpack, etc.)
if (url.protocol === 'ws:' || url.protocol === 'wss:' || 
    url.pathname.includes('/__vite') || 
    url.pathname.includes('/webpack-hmr') ||
    url.pathname.includes('/@vite/client') ||
    url.hostname === 'localhost' && url.port !== location.port) {
  return; // Ignora completamente
}
```

**O que faz**:
- Bloqueia WebSockets (ws://, wss://)
- Bloqueia caminhos específicos de ferramentas de dev (Vite, Webpack HMR)
- Bloqueia conexões localhost em portas diferentes

### 2. Supabase Client (`js/services/supabaseClient.js`) ⚠️ **SOLUÇÃO PRINCIPAL**

#### Configuração Explícita do Auth
```javascript
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        detectSessionInUrl: true,  // Detecta callback OAuth na URL
        flowType: 'pkce',          // Usa PKCE para segurança
        autoRefreshToken: true,    // Renova token automaticamente quando logado
        persistSession: true,      // Mantém sessão no localStorage
        storage: window.localStorage,
        storageKey: 'supabase.auth.token',
        debug: false               // Desabilita logs verbosos
    }
});
```

**O que faz**:
- Define configurações explícitas do Supabase Auth
- Mantém funcionalidade OAuth normal
- Previne comportamentos inesperados em background
- Usa PKCE (Proof Key for Code Exchange) para segurança

### 3. App.js - Limpeza de Estado OAuth

#### Detector de Página Inativa
```javascript
let authInProgress = false;
let visibilityTimer = null;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Página ficou em background
        visibilityTimer = setTimeout(async () => {
            if (!authInProgress && document.hidden) {
                console.log('🔐 Página inativa, limpando estado OAuth pendente');
                // Limpa code-verifiers pendentes do localStorage
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.includes('supabase.auth') && key.includes('code-verifier')) {
                        localStorage.removeItem(key);
                    }
                });
            }
        }, 10000); // 10 segundos
    } else {
        // Página voltou ao foreground
        if (visibilityTimer) {
            clearTimeout(visibilityTimer);
        }
    }
});
```

**O que faz**:
- Detecta quando a página fica em background por mais de 10 segundos
- Limpa `code-verifiers` OAuth pendentes do localStorage
- Previne tentativas de OAuth "fantasma" quando a página volta
- Só age se não houver autenticação em progresso

#### Flag de Autenticação em Progresso
```javascript
let authInProgress = false;

supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        authInProgress = true; // Marca que há autenticação ativa
        
        // ... código de autenticação ...
        
        authInProgress = false; // Reseta quando termina
    }
});
```

**O que faz**:
- Rastreia se há uma autenticação em andamento
- Previne limpeza de estado durante login legítimo
- Reseta flag quando autenticação completa ou falha

### 4. Feedback Visual nos Botões OAuth

#### Botões Google e Microsoft
```javascript
btn.innerHTML = 'AGUARDANDO APROVAÇÃO...';

// Timeout de 2 minutos
setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
}, 120000);
```

**O que faz**:
- Mostra feedback claro quando OAuth está em progresso
- Reseta botão após 2 minutos se usuário não aprovar
- Previne múltiplos cliques acidentais

## Como Testar

### 1. Teste Local (antes do deploy)
```bash
# Inicie um servidor local simples
python3 -m http.server 8000
# ou
npx serve .
```

Acesse `http://localhost:8000` e verifique:
- Console do navegador não deve mostrar erros de conexão
- Não deve aparecer mensagem "lost connection to dev server"

### 2. Teste no Firebase (após deploy)
```bash
# Faça o deploy
firebase deploy

# Ou use o script de deploy
./deploy.sh
```

No PWA instalado:
1. Abra o DevTools (F12)
2. Vá em Application > Service Workers
3. Verifique se a versão é `app-20260425.0001`
4. Console deve mostrar: `[SW] Instalando nova versão: app-20260425.0001`

### 3. Teste de Notificações OAuth Aleatórias ⚠️ **TESTE PRINCIPAL**
1. Abra o site (Firebase ou localhost)
2. **NÃO clique em nenhum botão de login**
3. Deixe a tela de login parada por 30 segundos
4. Troque para outro app/janela
5. Aguarde 15 segundos
6. Volte para o site
7. **Não deve** aparecer notificação "aguardando aprovação"

**Console esperado**:
```
🔐 Página inativa, limpando estado OAuth pendente
🔐 Removido: supabase.auth.token-code-verifier
```

### 4. Teste de Login OAuth Normal
1. Abra a tela de login
2. Clique em "Entrar com Google" ou "Entrar com Microsoft"
3. Botão deve mostrar "AGUARDANDO APROVAÇÃO..."
4. Complete o login no popup
5. **Deve** funcionar normalmente

### 4. Forçar Atualização do PWA (se necessário)

Se o PWA instalado ainda mostrar o erro:

**Chrome/Edge (Desktop)**:
1. Abra o PWA
2. Pressione F12 (DevTools)
3. Application > Service Workers
4. Clique em "Unregister"
5. Feche e reabra o PWA

**Chrome (Android)**:
1. Configurações do Android
2. Apps > [Nome do App]
3. Armazenamento > Limpar dados
4. Reabra o PWA

**Safari (iOS)**:
1. Configurações > Safari
2. Avançado > Dados de Sites
3. Remover todos os dados
4. Reabra o PWA

## Prevenção Futura

### Durante Desenvolvimento
- **Sempre teste no localhost** antes de fazer deploy
- **Não use ferramentas de dev** (Vite, Webpack Dev Server) em produção
- **Incremente a versão do cache** no `sw.js` a cada deploy importante

### No Deploy
O script `deploy.sh` já atualiza automaticamente a versão do cache:
```bash
./deploy.sh
```

Se fizer deploy manual:
```bash
# 1. Atualize a versão do cache no sw.js
# const CACHE_NAME = 'app-YYYYMMDD.HHMM';

# 2. Faça o deploy
firebase deploy
```

## Arquivos Modificados

1. **sw.js**
   - Bloqueio de conexões de dev server
   - Logs de debug
   - Atualização da versão do cache

2. **js/services/supabaseClient.js** ⚠️ **PRINCIPAL**
   - Configuração explícita do Supabase Auth
   - Previne comportamentos inesperados em background

3. **js/app.js** ⚠️ **PRINCIPAL**
   - Detector de página inativa
   - Limpeza de code-verifiers OAuth pendentes
   - Flag de autenticação em progresso
   - Feedback visual nos botões OAuth

4. **index.html**
   - Auto-atualização do Service Worker

## Notas Técnicas

### Por que o problema só aparecia no PWA?
- O PWA instalado usa o Service Worker para cache agressivo
- Scripts de desenvolvimento (Vite, Webpack) tentam se conectar via WebSocket
- No navegador normal, esses scripts não são cacheados
- No PWA, o SW cacheia tudo, incluindo scripts de dev

### Por que as notificações OAuth apareciam aleatoriamente?
- **Supabase Auth SDK** tenta renovar tokens automaticamente
- Quando a página fica inativa, o SDK pode tentar:
  - Verificar callbacks OAuth na URL
  - Renovar tokens expirados (mesmo sem sessão)
  - Restaurar sessões antigas do localStorage
- O navegador interpreta isso como "OAuth em progresso"
- Mostra notificação "aguardando aprovação" mesmo sem login ativo

### O que são code-verifiers?
- Parte do fluxo PKCE (Proof Key for Code Exchange) do OAuth
- Armazenados no localStorage durante autenticação
- Se ficarem "órfãos" (sem sessão ativa), causam tentativas de OAuth fantasma
- A solução limpa esses verifiers quando a página fica inativa

### Por que 10 segundos de timeout?
- Tempo suficiente para o usuário trocar de app e voltar rapidamente
- Não interfere com logins legítimos (que levam < 5 segundos)
- Previne limpeza prematura durante OAuth real

### Service Worker vs Cache do Navegador
- **Service Worker**: Cache programático, controlado pelo seu código
- **Cache do Navegador**: Cache HTTP padrão, controlado por headers
- O SW tem prioridade e pode causar problemas se não for atualizado

## Referências

- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Page Visibility API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [PWA Best Practices - web.dev](https://web.dev/pwa-checklist/)
