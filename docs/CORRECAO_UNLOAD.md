# 🔧 Correção: Salvamento ao Fechar Aba

## Problema Identificado

O registro no Supabase estava acontecendo apenas no login, mas **não ao fechar a aba**, resultando em métricas incompletas.

### Causa Raiz

O evento `beforeunload` cancela requisições assíncronas antes de completarem. O navegador fecha a aba antes do Supabase terminar de salvar.

---

## Solução Implementada

### 1. **Fetch com `keepalive: true`**

Substituímos a chamada assíncrona do Supabase por `fetch` direto com a flag `keepalive`:

```javascript
fetch(url, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify(payload),
    keepalive: true  // ← CRÍTICO: mantém requisição após fechar
});
```

**Por que funciona:**
- `keepalive: true` diz ao navegador para **completar a requisição mesmo após fechar a aba**
- É projetado exatamente para esse cenário (analytics, logs, etc.)

### 2. **Múltiplos Eventos de Captura**

```javascript
// pagehide - mais confiável que beforeunload
window.addEventListener('pagehide', () => {
    this.saveOnUnload();
});

// beforeunload - backup
window.addEventListener('beforeunload', () => {
    this.saveOnUnload();
});

// visibilitychange - mobile/troca de aba
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        this.saveOnUnload();
    }
});
```

**Por que 3 eventos:**
- `pagehide` → Mais confiável em navegadores modernos
- `beforeunload` → Backup para navegadores antigos
- `visibilitychange` → Captura troca de aba em mobile

### 3. **Configuração Pré-carregada**

```javascript
async setCurrentUser(user) {
    this.currentUser = user;
    
    // Carrega URL e key UMA VEZ no login
    this.supabaseConfig = {
        url: 'https://zkxzjrlhuyjqikzszrjx.supabase.co',
        key: 'eyJhbGci...'
    };
}
```

**Por que:**
- No `beforeunload` não há tempo para `await import()`
- Pré-carregamos as credenciais no login
- `saveOnUnload()` usa direto sem async

---

## Como Testar

### Teste 1: Sessão Curta
1. Faça login
2. Aguarde 10 segundos
3. Feche a aba
4. Verifique no Supabase:

```sql
SELECT session_duration_seconds 
FROM performance_metrics 
ORDER BY timestamp DESC 
LIMIT 1;
```

**Esperado:** ~10 segundos

### Teste 2: Sessão Longa
1. Faça login
2. Aguarde 7 minutos
3. Feche a aba
4. Verifique no Supabase:

```sql
SELECT session_duration_seconds, timestamp
FROM performance_metrics 
WHERE session_id LIKE 'session_%'
ORDER BY timestamp DESC 
LIMIT 3;
```

**Esperado:** 3 registros (5min, 7min ao fechar)

### Teste 3: Console
Abra o console (F12) e veja as mensagens:

```
✓ Métricas salvas (sessão: 300 s)  ← A cada 5 min
✓ Métricas enviadas ao fechar (sessão: 420 s)  ← Ao fechar
```

---

## Limitações Conhecidas

### 1. **Tamanho da Requisição**
`keepalive` tem limite de **64KB** por requisição. Nossa payload é ~500 bytes, então OK.

### 2. **Navegadores Antigos**
- Chrome 66+ ✅
- Firefox 61+ ✅
- Safari 11.1+ ✅
- Edge 79+ ✅

### 3. **Modo Privado**
Alguns navegadores podem bloquear `keepalive` em modo privado/anônimo.

---

## Debugging

### Se ainda não salvar ao fechar:

1. **Verifique o console:**
```javascript
// Adicione temporariamente no saveOnUnload():
console.log('UNLOAD - Salvando:', payload);
```

2. **Verifique RLS no Supabase:**
```sql
-- Deve retornar true
SELECT auth.uid() = user_id 
FROM performance_metrics 
LIMIT 1;
```

3. **Teste a URL diretamente:**
```javascript
// No console, após login:
fetch('https://zkxzjrlhuyjqikzszrjx.supabase.co/rest/v1/performance_metrics', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'sua-key',
        'Authorization': 'Bearer sua-key'
    },
    body: JSON.stringify({
        user_id: 'seu-user-id',
        session_id: 'test',
        avg_cpu: 50,
        avg_gpu: 30,
        session_duration_seconds: 60
    }),
    keepalive: true
});
```

---

## Alternativa: Edge Function

Se `keepalive` não funcionar, considere criar uma Edge Function no Supabase:

```sql
-- Edge Function que aceita POST sem auth
CREATE OR REPLACE FUNCTION public.save_performance_metric(
    p_user_id UUID,
    p_session_id TEXT,
    p_avg_cpu INTEGER,
    p_avg_gpu INTEGER,
    p_session_duration INTEGER,
    p_device_info JSONB
)
RETURNS void AS $$
BEGIN
    INSERT INTO performance_metrics (
        user_id, session_id, avg_cpu, avg_gpu, 
        session_duration_seconds, device_info
    ) VALUES (
        p_user_id, p_session_id, p_avg_cpu, p_avg_gpu,
        p_session_duration, p_device_info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Status

✅ **Implementado**  
✅ **Testado localmente**  
⏳ **Aguardando teste em produção**

---

**Data:** 22 de Abril de 2026  
**Versão:** 2.1.0
