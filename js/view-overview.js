// ATIVAÇÃO DO PLUGIN DE TEXTOS (O motor que faz os números aparecerem)
Chart.register(ChartDataLabels);

// VARIÁVEIS LOCAIS DO MÓDULO
let chartInstances = {};
let insightTimeout = null;

// ESTRUTURA HTML DA PÁGINA (Injetada dinamicamente)
export const getOverviewHTML = () => {
    return `
        <div id="insight-box" class="card p-5 rounded-2xl shadow-sm flex items-center gap-4 border mb-6 md:mb-8">
            <div class="bg-[#685BC7] px-3 py-1.5 rounded-lg text-white font-black text-[10px] italic tracking-tighter">INSIGHT</div>
            <p id="insight-text" class="text-xs md:text-base font-bold leading-tight italic"></p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div class="card p-6 md:p-8 rounded-[2rem] shadow-sm border"><p class="text-muted text-[9px] md:text-[10px] font-black uppercase tracking-widest">Sessões</p><h3 id="k-sess" class="text-2xl md:text-4xl font-bold mt-2 font-numbers">0</h3></div>
            <div class="card p-6 md:p-8 rounded-[2rem] shadow-sm border"><p class="text-muted text-[9px] md:text-[10px] font-black uppercase tracking-widest">Lojas</p><h3 id="k-sto" class="text-2xl md:text-4xl font-bold mt-2 font-numbers">0</h3></div>
            
            <div class="card p-6 md:p-8 rounded-[2rem] shadow-sm border group relative cursor-help">
                <p class="text-muted text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1">Aparelhos <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg></p>
                <h3 id="k-dev" class="text-2xl md:text-4xl font-bold mt-2 font-numbers">0</h3>
                <div id="k-dev-tooltip" class="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-xs bg-[#131417] text-white text-[10px] p-4 rounded-xl shadow-2xl z-50 border border-gray-700 whitespace-nowrap"></div>
            </div>

            <div class="card p-6 md:p-8 rounded-[2rem] shadow-sm border border-b-8 md:border-b-0 md:border-r-8 border-[#685BC7]"><p class="text-[#685BC7] text-[9px] md:text-[10px] font-black uppercase tracking-widest">Média/PDV</p><h3 id="k-avg" class="text-2xl md:text-4xl font-bold mt-2 font-numbers">0</h3></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border"><h4 class="text-sm md:text-base font-black text-muted mb-6 uppercase tracking-widest">01 Interações por dia</h4><div class="chart-container" style="height: 250px;"><canvas id="c-timeline"></canvas></div></div>
            <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border"><h4 class="text-sm md:text-base font-black text-muted mb-6 uppercase tracking-widest">02 Interações por loja</h4><div class="chart-container" style="height: 250px;"><canvas id="c-store"></canvas></div></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border"><h4 class="text-sm md:text-base font-black text-muted mb-6 uppercase tracking-widest">03 Interações por hora</h4><div class="chart-container" style="height: 250px;"><canvas id="c-time"></canvas></div></div>
            <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border"><h4 class="text-sm md:text-base font-black text-muted mb-6 uppercase tracking-widest">04 Interações por local</h4><div class="chart-container" style="height: 250px;"><canvas id="c-shop"></canvas></div></div>
        </div>

        <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border pb-8 md:pb-12"><h4 class="text-sm md:text-base font-black text-muted mb-6 uppercase tracking-widest">05 Interações por modelo</h4><div class="chart-container" style="height: 800px;"><canvas id="c-dev"></canvas></div></div>
    `;
};

// LIMPEZA DE MEMÓRIA (Necessário ao trocar de tela)
export const destroyOverviewCharts = () => {
    Object.keys(chartInstances).forEach(id => {
        if(chartInstances[id]) chartInstances[id].destroy();
    });
    chartInstances = {};
    if (insightTimeout) clearInterval(insightTimeout);
};

// LÓGICA PRINCIPAL DE RENDERIZAÇÃO
export const renderOverviewCharts = (filteredData) => {
    // BUG 4 FIX: Sempre destrua os gráficos antigos antes de desenhar os novos filtrados.
    destroyOverviewCharts();

    if(!filteredData || filteredData.length === 0) {
        document.getElementById('k-sess').innerText = '0';
        document.getElementById('k-sto').innerText = '0';
        document.getElementById('k-dev').innerText = '0';
        document.getElementById('k-avg').innerText = '0';
        document.getElementById('insight-text').innerText = 'Sem dados para o filtro selecionado.';
        return;
    }
    
    const parseN = v => parseFloat((v || "0").toString().replace(/\./g, '').replace(',', '.')) || 0;
    
    // --- 1. KPIs ---
    const totalSess = filteredData.reduce((a, b) => a + parseN(b.sessions), 0);
    const stores = [...new Set(filteredData.map(d => d['store name']))].filter(x => x).length;
    const devices = [...new Set(filteredData.map(d => d['device code']))].filter(x => x).length;
    
    document.getElementById('k-sess').innerText = Math.round(totalSess).toLocaleString('pt-BR');
    document.getElementById('k-sto').innerText = stores;
    document.getElementById('k-dev').innerText = devices;
    document.getElementById('k-avg').innerText = stores ? Math.round(totalSess/stores).toLocaleString('pt-BR') : 0;
    
    // Tooltip do Aparelho
    const devSetMap = {};
    filteredData.forEach(d => {
        if(d['aparelho'] && d['tipo'] && d['device code']) {
            const k = `${d['aparelho']} - <span class="text-gray-400 font-normal">${d['tipo']}</span>`;
            if(!devSetMap[k]) devSetMap[k] = new Set();
            devSetMap[k].add(d['device code']);
        }
    });
    
    const sortedDevList = Object.entries(devSetMap).map(([k, set]) => [k, set.size]).sort((a, b) => b[1] - a[1]);
    document.getElementById('k-dev-tooltip').innerHTML = '<p class="font-bold text-[#685BC7] mb-2 uppercase tracking-widest border-b border-gray-700 pb-2">Modelos Operantes</p>' + 
        (sortedDevList.length > 0 
            ? sortedDevList.map(v => `<div class="mt-1 flex items-center justify-between gap-4"><span class="opacity-90">${v[0]}</span> <span class="font-black text-white bg-gray-800 px-1.5 py-0.5 rounded">${v[1]}</span></div>`).join('') 
            : '<div>Nenhum modelo encontrado</div>');
            
    // --- 2. Heurística (Máquina de Escrever) ---
    const devG = filteredData.reduce((a, o) => { a[o.aparelho] = (a[o.aparelho] || 0) + parseN(o.sessions); return a; }, {});
    const topDev = Object.entries(devG).sort((a,b) => b[1]-a[1])[0];
    const textInsight = topDev ? `PROSOLUTION ANALYTICS: O modelo ${topDev[0]} gerou o maior impacto com ${Math.round(topDev[1])} interações no período selecionado.` : 'Sem dados para o período.';
    
    const el = document.getElementById('insight-text'); 
    el.innerHTML = ""; 
    let i = 0;
    
    // BUG 5 FIX: Limpar redundância extra para evitar sobreposição
    if (insightTimeout) clearInterval(insightTimeout);
    
    insightTimeout = setInterval(() => { 
        if (i < textInsight.length) {
            el.innerHTML += textInsight.charAt(i); 
            i++; 
        } else {
            clearInterval(insightTimeout);
        }
    }, 15);

    // --- 3. Preparação dos Gráficos ---
    const storeAgg = {};
    filteredData.forEach(d => {
        const code = d['store code'] || 'N/A'; const name = d['store name'] || 'N/A'; const dev = d['aparelho'] || 'N/A'; const sess = parseN(d.sessions);
        if(!storeAgg[code]) storeAgg[code] = { name: name, total: 0, devices: {} };
        storeAgg[code].total += sess; storeAgg[code].devices[dev] = (storeAgg[code].devices[dev] || 0) + sess;
    });
    const sortedCodes = Object.keys(storeAgg).sort((a,b) => storeAgg[b].total - storeAgg[a].total);
    const storeData = { labels: sortedCodes, values: sortedCodes.map(c => storeAgg[c].total), tooltipData: storeAgg };

    drawChart('c-timeline', 'line', aggregateWithStores(filteredData, 'pure_date', true), true);
    drawChart('c-store', 'bar', storeData);
    drawChart('c-time', 'line', aggregateWithStores(filteredData, 'faixa', true), true);
    drawChart('c-shop', 'bar', aggregateWithStores(filteredData, 'shopping'));
    drawChart('c-dev', 'bar', aggregateWithStores(filteredData, 'aparelho', false, true), false, true);
};

// --- FUNÇÕES AUXILIARES DE CHART.JS ---
function aggregateWithStores(data, key, isT = false, isR = false) {
    const g = data.reduce((acc, o) => { 
        const k = o[key] || 'N/A'; const sess = parseFloat((o.sessions || "0").toString().replace(/\./g, '').replace(',', '.')) || 0; const store = o['store name'] || 'N/A';
        if (!acc[k]) acc[k] = { total: 0, stores: {} };
        acc[k].total += sess; acc[k].stores[store] = (acc[k].stores[store] || 0) + sess; return acc; 
    }, {});
    let entries = Object.entries(g);
    if(isT) entries.sort((a,b) => a[0].localeCompare(b[0]));
    if(isR) entries.sort((a,b) => b[1].total - a[1].total);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1].total), tooltipData: entries.reduce((acc, e) => { acc[e[0]] = e[1].stores; return acc; }, {}) };
}

function drawChart(id, type, data, isArea = false, isH = false) {
    const ctx = document.getElementById(id).getContext('2d');
    
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#8e94a0' : '#475569'; 
    const labelColor = isDark ? '#FFFFFF' : '#131417';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(19, 20, 23, 0.05)';
    
    let bg = '#685BC7';
    if(isArea) { 
        const grad = ctx.createLinearGradient(0, 0, 0, 400); 
        grad.addColorStop(0, 'rgba(104, 91, 199, 0.5)'); 
        grad.addColorStop(1, 'rgba(104, 91, 199, 0)'); 
        bg = grad; 
    }

    let xLabels = data.labels;
    if (id === 'c-timeline') {
        xLabels = data.labels.map(dateStr => {
            const parts = dateStr.split('-');
            if(parts.length === 3) {
                const d = new Date(parts[0], parts[1]-1, parts[2]);
                const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']; return [dateStr, days[d.getDay()]]; 
            } return dateStr;
        });
    }

    let tooltipConfig = { backgroundColor: '#131417', titleFont: { family: 'Chakra Petch' }, bodyFont: { family: 'Roboto' } };
    if (id === 'c-store' && data.tooltipData) {
        tooltipConfig.callbacks = {
            title: ctx => { const code = ctx[0].label; return data.tooltipData[code] ? data.tooltipData[code].name : code; },
            label: ctx => {
                const code = ctx.label;
                if(data.tooltipData[code]) {
                    const devices = data.tooltipData[code].devices;
                    return Object.entries(devices).sort((a,b) => b[1]-a[1]).map(d => `${d[0]}: ${Math.round(d[1])}`);
                } return ctx.formattedValue;
            }
        };
    } else if (data.tooltipData) {
        tooltipConfig.callbacks = {
            title: ctx => { let lbl = ctx[0].label; if (id === 'c-timeline' && Array.isArray(lbl)) return lbl.join('\n'); if (id === 'c-timeline' && typeof lbl === 'string' && lbl.includes(',')) return lbl.replace(',', '\n'); return lbl; },
            label: ctx => {
                const key = typeof ctx.label === 'string' ? ctx.label.split(',')[0] : (Array.isArray(ctx.label) ? ctx.label[0] : ctx.label);
                const stores = data.tooltipData[key];
                if(stores) { return Object.entries(stores).sort((a,b) => b[1]-a[1]).map(s => `${s[0]}: ${Math.round(s[1])}`); }
                return ctx.formattedValue;
            }
        };
    }
    
    chartInstances[id] = new Chart(ctx, {
        type: type,
        data: { 
            labels: xLabels, 
            datasets: [{ 
                data: data.values, 
                backgroundColor: bg, 
                borderColor: '#685BC7', 
                fill: isArea, 
                tension: 0.4, 
                borderRadius: 8, 
                borderWidth: 3, 
                pointRadius: isArea ? 5 : 0 
            }] 
        },
        options: {
            indexAxis: isH ? 'y' : 'x', 
            responsive: true, 
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: !isH ? 25 : 0,
                    right: isH ? 40 : 0
                }
            },
            plugins: { 
                legend: { display: false }, 
                tooltip: tooltipConfig,
                datalabels: {
                    display: true,
                    font: { family: 'Chakra Petch', size: 11, weight: 'bold' },
                    formatter: Math.round,
                    anchor: 'end',
                    color: (ctx) => {
                        if (!isH) return labelColor;
                        const val = ctx.dataset.data[ctx.dataIndex];
                        const max = Math.max(...ctx.dataset.data) || 1;
                        return (val / max > 0.08) ? '#FFFFFF' : labelColor;
                    },
                    align: (ctx) => {
                        if (!isH) return 'top';
                        const val = ctx.dataset.data[ctx.dataIndex];
                        const max = Math.max(...ctx.dataset.data) || 1;
                        return (val / max > 0.08) ? 'left' : 'right';
                    },
                    offset: 4
                }
            },
            scales: { 
                y: { 
                    grace: isH ? '0%' : '15%', 
                    beginAtZero: true, 
                    grid: { color: isH ? 'transparent' : gridColor, drawBorder: false }, 
                    ticks: { 
                        color: textColor, 
                        font: { family: 'Chakra Petch', size: 11 },
                        autoSkip: isH ? false : true 
                    }, 
                    border: { display: false } 
                },
                x: { 
                    grace: isH ? '15%' : '0%', 
                    grid: { display: isH ? true : false, color: gridColor, drawBorder: false }, 
                    ticks: { color: textColor, font: { family: 'Roboto', size: 10, weight: '900' } }, 
                    border: { display: false } 
                }
            }
        }
    });
}