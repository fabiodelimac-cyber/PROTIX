# Correção: Five Server WebSocket no Localhost

**Data**: 25/04/2026  
**Tipo**: Ajuste de Desenvolvimento  
**Relacionado**: Hotfix v0.90.1

---

## 🐛 Problema Identificado

Após o hotfix v0.90.1, a mensagem "lost connection to dev server" começou a aparecer **também no localhost**, especificamente quando usando o **Five Server** (extensão do VS Code).

### Console Error
```
fiveserver.js:1 WebSocket connection to 'ws://127.0.0.1:5500/fsws' failed
fiveserver.js:1 connecting...
fiveserver.js:1 WebSocket connection to 'ws://127.0.0.1:5500/fsws' failed
[Loop infinito de tentativas de reconexão]
```

---

## 🔍 Causa Raiz

### O Que Aconteceu

1. **Hotfix v0.90.1** bloqueou WebSockets no Service Worker para prevenir conexões de dev server em produção
2. **Service Worker estava sendo registrado também no localhost**
3. Five Server (extensão do VS Code) usa WebSocket (`ws://127.0.0.1:5500/fsws`) para live reload
4. Service Worker bloqueava a conexão do Five Server
5. Five Server ficava tentando reconectar infinitamente

### Por Que Não Foi Detectado Antes

- Durante o desenvolvimento do hotfix, não estávamos usando Five Server
- Testes foram feitos com `python -m http.server` ou `npx serve`
- Esses servidores não usam WebSocket para live reload
- Five Server é específico do VS Code

---

## ✅ Solução Implementada

### Desabilitar Service Worker no Localhost

O Service Worker agora **só é registrado em produção**, não em localhost ou 127.0.0.1.

#### Código Anterior (index.html)
```javascript
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
        // ... código de registro
    });
}
```

#### Código Novo (index.html)
```javascript
// Só registra Service Worker em produção (não em localhost)
if ('serviceWorker' in navigator && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')) {
    
    navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('[PWA] Service Worker registrado');
        // ... código de registro
    });
    
} else if (window.location.hostname.includes('localhost') || 
           window.location.hostname.includes('127.0.0.1')) {
    
    console.log('[DEV] Service Worker desabilitado em localhost');
    
    // Desregistra qualquer Service Worker existente no localhost
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            registration.unregister();
            console.log('[DEV] Service Worker desregistrado');
        });
    });
}
```

### O Que Isso Faz

1. **Detecta ambiente**: Verifica se está rodando em localhost ou 127.0.0.1
2. **Produção**: Registra Service Worker normalmente
3. **Desenvolvimento**: 
   - NÃO registra Service Worker
   - Desregistra qualquer SW existente
   - Mostra log no console

---

## 🎯 Benefícios

### Para Desenvolvimento
- ✅ Five Server funciona perfeitamente
- ✅ Live reload funciona
- ✅ Hot Module Replacement (HMR) funciona
- ✅ Sem mensagens de erro no console
- ✅ Desenvolvimento mais rápido (sem cache do SW)

### Para Produção
- ✅ Service Worker continua funcionando normalmente
- ✅ PWA funciona perfeitamente
- ✅ Cache offline funciona
- ✅ Auto-atualização funciona

### Para Testes
- ✅ Fácil testar sem cache (localhost)
- ✅ Fácil testar com cache (produção)
- ✅ Comportamento previsível

---

## 🧪 Como Testar

### Teste 1: Localhost SEM Service Worker
```bash
# 1. Abra o projeto no VS Code
# 2. Use Five Server (extensão)
# 3. Abra o site no navegador
# 4. Abra o console (F12)
```

**Console esperado**:
```
[DEV] Service Worker desabilitado em localhost
[DEV] Service Worker desregistrado
```

**Resultado**:
- ✅ Sem erros de WebSocket
- ✅ Five Server funciona
- ✅ Live reload funciona

### Teste 2: Produção COM Service Worker
```bash
# 1. Faça deploy no Firebase
firebase deploy

# 2. Abra o PWA instalado
# 3. Abra o console (F12)
```

**Console esperado**:
```
[PWA] Service Worker registrado
[SW] Instalando nova versão: app-20260425.1313
[SW] Ativando nova versão: app-20260425.1313
```

**Resultado**:
- ✅ Service Worker ativo
- ✅ Cache funcionando
- ✅ PWA funcionando

### Teste 3: Verificar Registro do SW

**Localhost**:
1. F12 > Application > Service Workers
2. **Deve mostrar**: "No service workers"

**Produção**:
1. F12 > Application > Service Workers
2. **Deve mostrar**: Service Worker ativo com versão atual

---

## 📊 Comparação: Antes vs Depois

### ❌ Antes (Hotfix v0.90.1)

**Localhost**:
```
Service Worker registrado
    ↓
Bloqueia WebSocket do Five Server
    ↓
Five Server tenta reconectar infinitamente
    ↓
Console cheio de erros 😡
```

**Produção**:
```
Service Worker registrado
    ↓
Funciona perfeitamente ✅
```

### ✅ Depois (Hotfix v0.90.1 + Ajuste)

**Localhost**:
```
Service Worker NÃO registrado
    ↓
Five Server funciona normalmente
    ↓
Live reload funciona
    ↓
Console limpo 😊
```

**Produção**:
```
Service Worker registrado
    ↓
Funciona perfeitamente ✅
```

---

## 🎓 Lições Aprendidas

### 1. Service Worker em Desenvolvimento
- **Problema**: SW pode interferir com ferramentas de dev
- **Solução**: Desabilitar SW em localhost
- **Benefício**: Desenvolvimento mais rápido e sem cache

### 2. Five Server vs Outros Servidores
- **Five Server**: Usa WebSocket para live reload
- **Python http.server**: Não usa WebSocket
- **npx serve**: Não usa WebSocket
- **Conclusão**: Testar com diferentes servidores

### 3. Detecção de Ambiente
- **window.location.hostname** é confiável
- Verificar tanto `localhost` quanto `127.0.0.1`
- Considerar também `0.0.0.0` se necessário

### 4. Desregistro de Service Worker
- Importante desregistrar SW existentes em localhost
- Previne comportamento inesperado
- Usa `getRegistrations()` para limpar tudo

---

## 🔧 Arquivos Modificados

### index.html
- Adicionada detecção de ambiente (localhost vs produção)
- Service Worker só registrado em produção
- Desregistro automático em localhost
- Logs de debug para facilitar troubleshooting

### sw.js
- Adicionado comentário explicativo
- Nenhuma mudança funcional

---

## 📝 Notas Técnicas

### Por Que Não Usar `process.env.NODE_ENV`?

Este projeto não usa bundler (Webpack, Vite, etc.), então não temos acesso a `process.env`. A detecção via `window.location.hostname` é mais simples e funciona perfeitamente.

### Por Que Não Usar `localhost:5500` Específico?

Desenvolvedores podem usar diferentes portas (3000, 8000, 8080, etc.). Detectar `localhost` e `127.0.0.1` cobre todos os casos.

### E Se Usar IP Local (192.168.x.x)?

Se você acessar via IP local (ex: `192.168.1.100:5500`), o Service Worker **será registrado**. Isso é intencional - permite testar o PWA em dispositivos móveis na mesma rede.

Para desabilitar também em IP local, adicione:
```javascript
!window.location.hostname.match(/^192\.168\.\d+\.\d+$/)
```

---

## 🚀 Deploy

Esta correção já foi aplicada no código. Para atualizar:

```bash
# 1. Pull das mudanças
git pull origin main

# 2. Se estiver usando Five Server, recarregue a página
# O Service Worker será desregistrado automaticamente

# 3. Para produção, faça deploy normalmente
./deploy.sh
```

---

## ✅ Checklist

- [x] Problema identificado (Five Server WebSocket)
- [x] Causa raiz diagnosticada (SW bloqueando WS)
- [x] Solução implementada (SW só em produção)
- [x] Testado em localhost (Five Server)
- [x] Testado em produção (Firebase)
- [x] Documentação criada
- [x] Código commitado

---

## 📞 Suporte

### Se o Problema Persistir

1. **Limpe o cache do navegador**:
   - Chrome: Ctrl+Shift+Delete
   - Selecione "Cached images and files"
   - Clique em "Clear data"

2. **Desregistre manualmente o Service Worker**:
   - F12 > Application > Service Workers
   - Clique em "Unregister"
   - Recarregue a página

3. **Verifique o console**:
   - Deve mostrar: `[DEV] Service Worker desabilitado em localhost`
   - Se não mostrar, force reload: Ctrl+Shift+R

---

**Versão**: 0.90.1 (ajuste)  
**Build**: app-20260425.1313  
**Status**: ✅ Corrigido  
**Impacto**: Apenas desenvolvimento (localhost)
