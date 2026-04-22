# Performance Monitor - Backend Only

## 📊 O que faz

Coleta **silenciosamente** métricas de performance e envia para o Supabase:
- **CPU** - Uso médio de memória JavaScript
- **GPU** - Estimativa de uso via WebGL
- **Tempo de Sessão** - Duração total da sessão do usuário

**Sem interface visual** - Tudo acontece em background.

---

## 🚀 Instalação

### 1. Criar tabela no Supabase

Execute o SQL em `sql/create_performance_metrics_table.sql`:

```sql
-- Copie e execute todo o conteúdo do arquivo
```

### 2. Verificar integração

O código já está integrado em:
- `index.html` - Script carregado
- `js/app.js` - Chamadas de init/stop

---

## 📁 Arquivos

```
js/
├── performance-monitor.js       # Monitor silencioso
└── performance-integration.js   # Integração com auth

sql/
└── create_performance_metrics_table.sql  # Schema
```

---

## 💾 Dados Salvos

**Frequência:** 
- A cada 5 minutos (para sessões longas)
- **Ao sair da página (SEMPRE, mesmo com poucos segundos de sessão)**

Isso garante que todas as sessões sejam registradas, independente da duração.

**Estrutura:**
```json
{
  "user_id": "uuid-do-usuario",
  "session_id": "session_1234567890_abc",
  "avg_cpu": 42,
  "avg_gpu": 28,
  "session_duration_seconds": 900,
  "device_info": {
    "platform": "MacIntel",
    "hardwareConcurrency": 8,
    "deviceMemory": 16,
    "connection": "4g"
  },
  "timestamp": "2024-04-22T10:30:00Z"
}
```

---

## 🔍 Consultar Dados

### SQL Básico

```sql
-- Últimas métricas do usuário
SELECT 
    timestamp,
    avg_cpu,
    avg_gpu,
    session_duration_seconds
FROM performance_metrics
WHERE user_id = 'seu-user-id'
ORDER BY timestamp DESC
LIMIT 10;

-- Média por dia
SELECT 
    DATE(timestamp) as data,
    ROUND(AVG(avg_cpu), 2) as cpu_medio,
    ROUND(AVG(avg_gpu), 2) as gpu_medio,
    COUNT(*) as total_coletas
FROM performance_metrics
WHERE user_id = 'seu-user-id'
GROUP BY DATE(timestamp)
ORDER BY data DESC;
```

### JavaScript

```javascript
import { getPerformanceReport } from './performance-integration.js';
import { supabase } from './services/supabaseClient.js';

const { data: { user } } = await supabase.auth.getUser();
const report = await getPerformanceReport(supabase, user.id, 7);

console.log('CPU Médio:', report.avgCpu);
console.log('GPU Médio:', report.avgGpu);
console.log('Total de Sessões:', report.totalSessions);
```

---

## ⚙️ Configurações

### Alterar frequência de salvamento

Em `js/performance-monitor.js` (linha ~60):

```javascript
// Padrão: 5 minutos
this.saveInterval = setInterval(() => {
    this.saveMetricsToDatabase();
}, 5 * 60 * 1000);  // ← Altere aqui
```

### Desabilitar completamente

```javascript
// No console
window.performanceMonitor.destroy();
```

---

## 🔐 Segurança

✅ RLS (Row Level Security) ativo  
✅ Usuários só veem seus próprios dados  
✅ Coleta silenciosa sem impacto visual  
✅ Sem dados sensíveis coletados  

---

## 📱 Compatibilidade

| Navegador | CPU | GPU | Sessão |
|-----------|-----|-----|--------|
| Chrome    | ✅  | ✅  | ✅     |
| Firefox   | ⚠️  | ⚠️  | ✅     |
| Safari    | ⚠️  | ⚠️  | ✅     |
| Edge      | ✅  | ✅  | ✅     |

⚠️ = Suporte limitado (pode não funcionar em todos os casos)

---

## 🐛 Troubleshooting

**Dados não são salvos:**
- Verifique se a tabela foi criada no Supabase
- Verifique as políticas RLS
- Abra o console (F12) e procure por erros

**CPU/GPU sempre 0:**
- Nem todos navegadores suportam `performance.memory`
- GPU é estimado via WebGL (pode não estar disponível)
- São aproximações, não medições exatas

---

**Versão:** 2.0.0 (Backend Only)  
**Data:** 22 de Abril de 2026
