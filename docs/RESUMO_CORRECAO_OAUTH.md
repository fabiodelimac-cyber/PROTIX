# 🔧 Resumo: Correção de Notificações OAuth Aleatórias

## 🎯 O Problema

Você deixa a **tela de login parada**, troca de app, e quando volta aparece a notificação do navegador **"aguardando aprovação OAuth"** — mesmo **sem ter clicado** em nenhum botão de login!

## 🔍 A Causa

O **Supabase Auth SDK** estava tentando renovar tokens OAuth em background, mesmo sem sessão ativa. Isso acontecia porque:

1. **Code-verifiers órfãos** ficavam no localStorage
2. Supabase tentava completar OAuth "fantasma" quando a página voltava
3. Navegador interpretava como "login OAuth em progresso"
4. Mostrava a notificação automaticamente

## ✅ A Solução

### 1. Configuração Explícita do Supabase (`supabaseClient.js`)
```javascript
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        storage: window.localStorage,
        storageKey: 'supabase.auth.token',
        debug: false  // ← Previne logs verbosos
    }
});
```

### 2. Limpeza Automática de OAuth Pendente (`app.js`)
```javascript
// Detecta página inativa por 10+ segundos
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        setTimeout(() => {
            // Limpa code-verifiers órfãos do localStorage
            localStorage.removeItem('supabase.auth.token-code-verifier');
        }, 10000);
    }
});
```

### 3. Flag de Autenticação Ativa
```javascript
let authInProgress = false;

// Só limpa OAuth se não houver login em andamento
if (!authInProgress && document.hidden) {
    // Limpa estado OAuth
}
```

## 🧪 Como Testar

### Teste 1: Notificação NÃO deve aparecer
1. Abra o site
2. **NÃO clique em login**
3. Deixe parado por 30 segundos
4. Troque de app
5. Aguarde 15 segundos
6. Volte para o site
7. ✅ **Não deve aparecer notificação**

### Teste 2: Login deve funcionar normalmente
1. Clique em "Entrar com Google"
2. Complete o login no popup
3. ✅ **Deve funcionar normalmente**

## 📊 Antes vs Depois

### ❌ Antes
```
Usuário deixa tela de login parada
    ↓
Troca de app
    ↓
Supabase tenta renovar token em background
    ↓
Navegador mostra: "aguardando aprovação OAuth" 😡
```

### ✅ Depois
```
Usuário deixa tela de login parada
    ↓
Troca de app (10+ segundos)
    ↓
Sistema limpa code-verifiers órfãos
    ↓
Nenhuma notificação aparece 😊
```

## 🚀 Deploy

```bash
./deploy.sh
```

Ou manual:
```bash
firebase deploy
```

## 📝 Arquivos Modificados

- ✅ `js/services/supabaseClient.js` - Configuração explícita do Auth
- ✅ `js/app.js` - Limpeza de OAuth pendente + flag de auth
- ✅ `sw.js` - Bloqueio de dev servers (problema secundário)
- ✅ `index.html` - Auto-atualização do SW

## 🎓 O Que Aprendi

### Code-Verifiers
- Parte do fluxo PKCE do OAuth 2.0
- Armazenados no localStorage durante login
- Se ficarem "órfãos" (sem sessão), causam problemas
- **Solução**: Limpar após 10s de inatividade

### Supabase Auth
- Por padrão, tenta renovar tokens automaticamente
- Pode causar tentativas de OAuth em background
- **Solução**: Configuração explícita + limpeza de estado

### PWA vs Navegador
- PWA cacheia mais agressivamente
- Problemas aparecem mais no PWA instalado
- **Solução**: Service Worker atualizado + limpeza de cache

## 🔗 Documentação Completa

Ver: `docs/CORRECAO_PWA_DEV_SERVER.md`
