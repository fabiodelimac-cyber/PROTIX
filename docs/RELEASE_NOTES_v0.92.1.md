# 🚀 Release Notes - v0.92.1 (Hotfix)

**Data**: 27 de Abril de 2026  
**Tipo**: Hotfix  
**Versão anterior**: 0.92.0-rc2

---

## 🎯 Resumo Executivo

Este hotfix corrige o filtro de data hierárquico que não exibia meses anteriores (março/2026) no slicer visual, mesmo com os gráficos da dashboard exibindo os dados corretamente desde 31/03.

---

## 🐛 Problemas Corrigidos

### 1. Filtro de Data Não Exibia Março (Crítico)

**Sintoma**:
- Filtro de data mostrava datas apenas a partir de 06/04/2026
- Gráficos da dashboard exibiam dados desde 31/03/2026 normalmente
- Todos os outros filtros estavam em "TODOS"

**Causa Raiz**:
A query de carga inicial da tabela `interactions` tinha um `.limit(10000)` com ordenação descendente por data:

```javascript
// ANTES — cortava os dados mais antigos
const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('pure_date', { ascending: false })
    .limit(10000); // ← com mais de 10k registros, março ficava fora
```

Com a tabela `interactions` ultrapassando 10.000 registros, os dados de março ficavam fora do corte. Os gráficos funcionavam porque usam **RPCs do PostgreSQL** que consultam todos os dados diretamente no banco, sem esse limite.

**Solução**:
```javascript
// DEPOIS — carrega todos os dados
const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .order('pure_date', { ascending: false });
```

**Resultado**:
- ✅ Filtro de data exibe todos os meses disponíveis, incluindo março
- ✅ Consistência entre o filtro visual e os dados dos gráficos

---

### 2. Filtro de Data — Comparação Incorreta com Filtros Array

**Sintoma**:
- Ao ter filtros de shopping ou PDV ativos, o filtro de data podia ficar vazio

**Causa Raiz**:
A lógica de filtragem no `updateDropdownUI` comparava todos os filtros como string simples, inclusive filtros que armazenam arrays de valores:

```javascript
// ANTES — quebrava com arrays
if (item[fKey] && String(item[fKey]) !== String(currentFilters[fKey])) matches = false;
// String(['Loja A', 'Loja B']) → "Loja A,Loja B" ≠ "Loja A" → descartava tudo
```

**Solução**:
```javascript
// DEPOIS — trata arrays corretamente
if (Array.isArray(filterVal)) {
    if (filterVal.length > 0 && (!itemVal || !filterVal.includes(itemVal))) matches = false;
} else {
    if (filterVal && itemVal && String(itemVal) !== String(filterVal)) matches = false;
}
```

**Resultado**:
- ✅ Filtro de data funciona corretamente com qualquer combinação de filtros ativos

---

## 📊 Antes vs Depois

### ❌ Antes (v0.92.0-rc2)

```
Tabela interactions: 12.000+ registros
    ↓
Query com .limit(10000) + order DESC
    ↓
Retorna apenas registros de 06/04 em diante
    ↓
Filtro de data: mostra apenas abril 😡
    ↓
Gráficos (via RPC): mostram desde março ✅
    ↓
Inconsistência confusa para o usuário
```

### ✅ Depois (v0.92.1)

```
Tabela interactions: 12.000+ registros
    ↓
Query sem limite + order DESC
    ↓
Retorna todos os registros
    ↓
Filtro de data: mostra março e abril ✅
    ↓
Gráficos (via RPC): mostram desde março ✅
    ↓
Consistência total
```

---

## 🔍 Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `js/app.js` | Removido `.limit(10000)` da query de carga de dados |
| `js/app.js` | Corrigida comparação de filtros array no slicer de data |
| `CHANGELOG.md` | Adicionada entrada v0.92.1 |
| `docs/RELEASE_NOTES_v0.92.1.md` | Este documento |

---

## 🧪 Validação

- ✅ Filtro de data exibe março/2026
- ✅ Filtro de data exibe abril/2026
- ✅ Gráficos e filtro consistentes
- ✅ Filtros de shopping/PDV não afetam a exibição de datas
- ✅ Seleção de datas continua funcionando normalmente

---

**Versão**: 0.92.1  
**Status**: ✅ Produção  
**Compatibilidade**: Todas as versões anteriores
