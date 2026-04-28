# Correção: Erro de Cache com Extensões do Chrome

**Data**: 25/04/2026  
**Tipo**: Ajuste de Service Worker  
**Relacionado**: Hotfix v0.90.1

---

## 🐛 Problema Identificado

Após desabilitar o Service Worker no localhost, um novo erro apareceu no console (mesmo sem impacto visual no front):

```
sw.js:81 Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache': 
Request scheme 'chrome-extension' is unsupported
```

Este erro aparecia **múltiplas vezes** no console, poluindo os logs.

---

## 🔍 Causa Raiz

### O Que Aconteceu

1. Service Worker intercepta **todas** as requisições da página
2. Extensões do Chrome fazem requisições com protocolo `chrome-extension://`
3. Service Worker tentava cachear essas requisições
4. Cache API **não suporta** protocolos não-HTTP (`chrome-extension://`, `about://`, `data://`, `blob://`, etc.)
5. Erro era lançado, mas não quebrava a funcionalidade

### Por Que Não Foi Detectado Antes

- Durante desenvolvimento, não tínhamos muitas extensões ativas
- O erro não afeta a funcionalidade (é silencioso para o usuário)
- Só aparece no console do desenvolvedor

### Extensões Comuns Que Causam Isso

- **React DevTools** (`chrome-extension://...`)
- **Redux DevTools** (`chrome-extension://...`)
- **Vue DevTools** (`chrome-extension://...`)
- **Grammarly** (`chrome-extension://...`)
- **LastPass** (`chrome-extension://...`)
- Qualquer extensão que injeta scripts na página

---

## ✅ Solução Implementada

### 1. Filtro de Protocolo no Início do Fetch

Adicionado filtro para ignorar **qualquer protocolo não-HTTP** antes de processar a requisição.

#### Código Anterior
```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bloqueia conexões de dev server...
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || ...) {
    return;
  }
  
  // ... resto do código
});
```

#### Código Novo
```javascript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora protocolos não-HTTP (chrome-extension, about, data, blob, etc.)
  if (!url.protocol.startsWith('http')) {
    return; // Deixa o browser resolver
  }

  // Bloqueia conexões de dev server...
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || ...) {
    return;
  }
  
  // ... resto do código
});
```

**O que faz**:
- Verifica se o protocolo começa com `http` (http: ou https:)
- Se não for HTTP, retorna imediatamente (não processa)
- Previne tentativas de cache de protocolos não suportados

### 2. Tratamento de Erro no cache.put()

Adicionado `.catch()` no `cache.put()` como camada extra de segurança.

#### Código Anterior
```javascript
const clone = response.clone();
caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
```

#### Código Novo
```javascript
const clone = response.clone();
caches.open(CACHE_NAME).then((cache) => {
  // Tenta cachear, mas ignora erros (ex: chrome-extension://)
  cache.put(event.request, clone).catch((err) => {
    console.warn('[SW] Não foi possível cachear:', event.request.url, err.message);
  });
});
```

**O que faz**:
- Tenta cachear normalmente
- Se falhar, captura o erro
- Mostra warning no console (não erro)
- Não quebra a execução

---

## 🎯 Benefícios

### Console Limpo
- ✅ Sem erros de `chrome-extension`
- ✅ Sem erros de `about:`
- ✅ Sem erros de `data:`
- ✅ Sem erros de `blob:`
- ✅ Console profissional e limpo

### Performance
- ✅ Menos tentativas de cache desnecessárias
- ✅ Menos processamento no Service Worker
- ✅ Retorno mais rápido para requisições não-HTTP

### Compatibilidade
- ✅ Funciona com qualquer extensão do Chrome
- ✅ Funciona com Edge, Brave, Opera (baseados em Chromium)
- ✅ Funciona com Firefox (extensões usam `moz-extension://`)

---

## 📊 Protocolos Filtrados

### Protocolos HTTP (Processados)
- ✅ `http://` - HTTP padrão
- ✅ `https://` - HTTP seguro

### Protocolos Não-HTTP (Ignorados)
- ❌ `chrome-extension://` - Extensões do Chrome
- ❌ `moz-extension://` - Extensões do Firefox
- ❌ `about://` - Páginas internas do navegador
- ❌ `data://` - Data URIs
- ❌ `blob://` - Blob URLs
- ❌ `file://` - Arquivos locais
- ❌ `ws://` - WebSocket
- ❌ `wss://` - WebSocket seguro

---

## 🧪 Como Testar

### Teste 1: Console Limpo
1. Abra o site (localhost ou produção)
2. Abra o console (F12)
3. Recarregue a página (Ctrl+R)
4. **Não deve** aparecer erros de `chrome-extension`

### Teste 2: Com Extensões Ativas
1. Instale várias extensões (React DevTools, Redux DevTools, etc.)
2. Abra o site
3. Abra o console (F12)
4. **Não deve** aparecer erros relacionados a extensões

### Teste 3: Funcionalidade Normal
1. Navegue pelo site normalmente
2. Faça login
3. Use os filtros
4. **Tudo deve** funcionar perfeitamente

### Teste 4: Service Worker Logs
**Console esperado** (produção):
```
[PWA] Service Worker registrado
[SW] Instalando nova versão: app-20260425.1313
[SW] Ativando nova versão: app-20260425.1313
```

**Não deve aparecer**:
```
❌ Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache'
```

---

## 🎓 Lições Aprendidas

### 1. Service Worker Intercepta Tudo
- SW intercepta **todas** as requisições, incluindo de extensões
- Importante filtrar o que processar
- Protocolo é o primeiro filtro a aplicar

### 2. Cache API Tem Limitações
- Só suporta HTTP/HTTPS
- Não suporta protocolos customizados
- Sempre adicionar tratamento de erro

### 3. Extensões do Navegador
- Extensões fazem requisições invisíveis
- Podem poluir logs se não filtradas
- Cada navegador tem seu protocolo (`chrome-extension://`, `moz-extension://`)

### 4. Filtros em Cascata
Ordem ideal de filtros no Service Worker:
1. **Protocolo** (http/https apenas)
2. **Dev servers** (ws, vite, webpack)
3. **Domínios externos** (CDNs, APIs)
4. **Tipo de requisição** (GET, POST, etc.)
5. **Tipo de resposta** (ok, basic, cors)

---

## 🔧 Arquivos Modificados

### sw.js
- ✅ Adicionado filtro de protocolo não-HTTP
- ✅ Adicionado tratamento de erro no `cache.put()`
- ✅ Logs de warning para debug

---

## 📝 Notas Técnicas

### Por Que `startsWith('http')` em Vez de Lista?

**Opção 1 (Lista)**:
```javascript
const allowedProtocols = ['http:', 'https:'];
if (!allowedProtocols.includes(url.protocol)) return;
```

**Opção 2 (startsWith)** ✅ Escolhida:
```javascript
if (!url.protocol.startsWith('http')) return;
```

**Vantagens do startsWith**:
- Mais simples e legível
- Cobre http: e https: automaticamente
- Menos código
- Mais performático (não cria array)

### Por Que Não Usar `response.type === 'opaque'`?

Requisições de extensões retornam `type: 'opaque'`, mas:
- Já filtramos pelo protocolo (mais cedo)
- `opaque` também pode ser de CORS
- Filtro de protocolo é mais explícito

### E Se Precisar Cachear Blob URLs?

Se no futuro precisar cachear blob URLs (ex: imagens geradas dinamicamente):
```javascript
if (!url.protocol.startsWith('http') && url.protocol !== 'blob:') {
  return;
}
```

Mas por enquanto não é necessário.

---

## ✅ Checklist

- [x] Problema identificado (chrome-extension cache error)
- [x] Causa raiz diagnosticada (SW tentando cachear não-HTTP)
- [x] Solução implementada (filtro de protocolo)
- [x] Tratamento de erro adicionado (cache.put catch)
- [x] Testado com extensões ativas
- [x] Console limpo confirmado
- [x] Documentação criada

---

## 📞 Se o Problema Persistir

### Limpar Cache do Service Worker
```javascript
// No console do navegador (F12)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
location.reload();
```

### Verificar Extensões Problemáticas
1. F12 > Network
2. Filtrar por `chrome-extension`
3. Ver quais extensões fazem mais requisições
4. Desabilitar temporariamente para testar

---

**Versão**: 0.90.1 (ajuste)  
**Build**: app-20260425.1313  
**Status**: ✅ Corrigido  
**Impacto**: Console limpo, sem erros
