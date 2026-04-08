// js/view-heat-produtos.js

let chartInstances = {};
let currentProduct = 'ALL'; 
let latestFilteredData = []; 

export const getHeatProdutosHTML = () => {
    return `
        <style>
            #view-heatmap-wrapper { font-family: 'Montserrat', sans-serif; }
            
            #html-heatmap-container { transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease; will-change: filter, opacity; }
            .data-loading { filter: blur(12px); opacity: 0.3; pointer-events: none; }

            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-adaptive-strong { color: var(--text-muted-strong); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .neon-accent { background: var(--neon-bg); }
            .input-adaptive { background: var(--input-bg); border: 1px solid var(--glass-border); color: var(--text-main); }
            .divide-adaptive > div { border-color: var(--glass-border); }
        </style>

        <div id="view-heatmap-wrapper" class="pb-10">
            <div class="glass-panel p-6 md:p-8 rounded-[2rem] mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
                <div class="absolute -right-6 -top-6 opacity-[0.03] text-8xl font-black pointer-events-none group-hover:scale-105 transition-transform duration-700">🔥</div>
                <div class="relative z-10">
                    <h2 class="ds-title">Heatmap de Produtos</h2>
                </div>
                <div class="w-full md:w-1/3 relative z-10">
                    <label class="ds-filter-label mb-2 block">Selecione o Modelo Alvo</label>
                    <select id="hp-master-select" class="w-full p-3 rounded-xl ds-filter-input input-adaptive focus:border-[#685BC7] outline-none transition-colors cursor-pointer backdrop-blur-md appearance-none">
                        <option value="ALL">Carregando produtos...</option>
                    </select>
                </div>
            </div>

            <div class="glass-panel rounded-[2rem] mb-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-adaptive overflow-hidden relative">
                <div class="w-full md:w-1/4 p-6 md:p-8 flex flex-col justify-start shrink-0">
                    <p class="ds-kpi-label mb-3">Interações Globais</p>
                    <h3 id="hp-k-vol" class="ds-kpi-value text-2xl md:text-3xl text-glow">0</h3>
                </div>
                <div class="w-full md:w-1/4 p-6 md:p-8 flex flex-col justify-start shrink-0">
                    <p class="ds-kpi-label mb-3">Pico de Demanda</p>
                    <h3 id="hp-k-peak" class="ds-kpi-value text-2xl md:text-3xl leading-tight">-</h3>
                </div>
                <div class="flex-1 p-6 md:p-8 flex flex-col justify-start relative neon-accent">
                    <p class="ds-kpi-label mb-3 relative z-10 text-[#685BC7]">PDV de Maior Interação</p>
                    <h3 id="hp-k-top" class="ds-kpi-value text-lg md:text-xl leading-tight whitespace-normal break-words relative z-10">-</h3>
                    <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#685BC7] to-transparent opacity-50"></div>
                </div>
            </div>

            <div class="glass-panel p-8 md:p-12 rounded-[2.5rem] mb-10 md:mb-12">
                <div class="flex justify-between items-end mb-8">
                    <h4 class="ds-chart-title">Concentração (Dia x Hora)</h4>
                    <div class="hidden md:flex items-center gap-3">
                        <span class="text-[8px] font-bold text-[#8b5cf6] uppercase tracking-[0.2em]">Menor</span>
                        <div class="w-32 h-1.5 rounded-full" style="background: linear-gradient(to right, rgba(139, 92, 246, 0.15), rgba(244, 63, 94, 1));"></div>
                        <span class="text-[8px] font-bold text-[#f43f5e] uppercase tracking-[0.2em]">Maior</span>
                    </div>
                </div>
                <div class="overflow-x-auto custom-scrollbar pb-6">
                    <div id="html-heatmap-container" class="min-w-[800px]"></div>
                </div>
            </div>

            <div class="mb-8 px-4 text-center md:text-left">
                <h4 class="ds-chart-title text-center md:text-left">Análise Comparativa</h4>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
                <div class="glass-panel p-8 md:p-10 rounded-[2rem]">
                    <h4 class="ds-chart-title mb-8">Canal: Loja de Rua vs Shopping</h4>
                    <div class="chart-container" style="height: 300px;"><canvas id="hp-c-canal"></canvas></div>
                </div>
                <div class="glass-panel p-8 md:p-10 rounded-[2rem]">
                    <h4 class="ds-chart-title mb-8">Comportamento: Dias Úteis vs Final de Semana</h4>
                    <div class="chart-container" style="height: 300px;"><canvas id="hp-c-semana"></canvas></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div class="glass-panel p-8 md:p-10 rounded-[2.5rem]">
                    <h4 class="ds-chart-title mb-8">Curva de Tendência Diária</h4>
                    <div class="chart-container" style="height: 300px;"><canvas id="hp-c-trend"></canvas></div>
                </div>
                <div class="glass-panel p-8 md:p-10 rounded-[2.5rem]">
                    <h4 class="ds-chart-title mb-8">Distribuição por Rede Parceira</h4>
                    <div class="chart-container" style="height: 300px;"><canvas id="hp-c-rede"></canvas></div>
                </div>
            </div>
        </div>
    `;
};

export const destroyHeatProdutosCharts = () => {
    Object.keys(chartInstances).forEach(id => { if(chartInstances[id]) chartInstances[id].destroy(); });
    chartInstances = {};
};

export const renderHeatProdutos = (filteredData) => {
    if(!filteredData || filteredData.length === 0) return;
    
    latestFilteredData = filteredData; 
    
    const select = document.getElementById('hp-master-select');
    const products = [...new Set(filteredData.map(d => d.aparelho))].filter(x => x).sort();
    
    if(!currentProduct || (currentProduct !== 'ALL' && !products.includes(currentProduct))) currentProduct = 'ALL';

    select.innerHTML = '';
    select.add(new Option('🔥 VISÃO MACRO (TODOS)', 'ALL')); 
    products.forEach(p => select.add(new Option(p, p)));
    select.value = currentProduct;
    
    if (!select.dataset.listenerAttached) {
        select.addEventListener('change', (e) => {
            currentProduct = e.target.value;
            processHeatmapData(latestFilteredData);
        });
        select.dataset.listenerAttached = "true";
    }

    processHeatmapData(latestFilteredData);
};

function processHeatmapData(globalData) {
    if(!currentProduct) return;
    const container = document.getElementById('html-heatmap-container');
    container.classList.add('data-loading');

    setTimeout(() => {
        destroyHeatProdutosCharts(); 
        const parseN = v => parseFloat((v || "0").toString().replace(/\./g, '').replace(',', '.')) || 0;
        
        const prodData = currentProduct === 'ALL' 
            ? globalData.filter(d => d.aparelho && d.aparelho.trim() !== '') 
            : globalData.filter(d => d.aparelho === currentProduct);
        
        const totalProd = prodData.reduce((a, b) => a + parseN(b.sessions), 0);
        document.getElementById('hp-k-vol').innerText = Math.round(totalProd).toLocaleString('pt-BR');

        const heatMapData = {}; const storeAgg = {}; const redeAgg = {}; const dateAgg = {};
        const canalAgg = {}; const semanaAgg = {};
        
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const horasComerciais = Array.from({length: 13}, (_, i) => i + 10); 
        
        diasSemana.forEach(d => { heatMapData[d] = {}; horasComerciais.forEach(h => heatMapData[d][h] = 0); });
        horasComerciais.forEach(h => {
            canalAgg[h] = { 'Rua': 0, 'Shopping': 0 };
            semanaAgg[h] = { 'Dias Úteis': 0, 'Fim de Semana': 0 };
        });

        prodData.forEach(d => {
            const sess = parseN(d.sessions);
            const store = d['store name'] || 'N/A';
            const rede = d['rede'] || 'N/A';
            const pDate = d['pure_date'];
            
            const shopVal = (d['shopping'] || '').toString().trim().toUpperCase();
            const isShopping = (shopVal === 'LOJA DE RUA') ? 'Rua' : 'Shopping';
            
            storeAgg[store] = (storeAgg[store] || 0) + sess;
            redeAgg[rede] = (redeAgg[rede] || 0) + sess;
            if(pDate) dateAgg[pDate] = (dateAgg[pDate] || 0) + sess;

            if (d.datetime && d.pure_date) {
                const dateParts = d.pure_date.split('-');
                const dtObj = new Date(dateParts[0], dateParts[1]-1, dateParts[2]);
                const dayName = diasSemana[dtObj.getDay()];
                const hour = parseInt(d.datetime.split(' ')[1]?.split(':')[0], 10);
                
                const isWeekend = (dtObj.getDay() === 0 || dtObj.getDay() === 6) ? 'Fim de Semana' : 'Dias Úteis';

                if (hour >= 10 && hour <= 22) {
                    heatMapData[dayName][hour] += sess;
                    canalAgg[hour][isShopping] += sess;
                    semanaAgg[hour][isWeekend] += sess;
                }
            }
        });

        let maxSess = 0, peakText = '-';
        for(let d in heatMapData) for(let h in heatMapData[d]) if(heatMapData[d][h] > maxSess) { maxSess = heatMapData[d][h]; peakText = `${d}, ${h}h`; }
        
        document.getElementById('hp-k-peak').innerText = maxSess > 0 ? peakText : '-';
        document.getElementById('hp-k-top').innerText = Object.entries(storeAgg).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';

        renderStaticHeatmap(container, heatMapData, diasSemana, horasComerciais, maxSess);

        const labelsHoras = horasComerciais.map(h => `${h}h`);
        const colorLow = '#8b5cf6';
        const colorHigh = '#f43f5e';
        
        drawComparisonChart('hp-c-canal', labelsHoras, [
            { label: 'Loja de Rua', data: horasComerciais.map(h => canalAgg[h]['Rua']), color: colorLow },
            { label: 'Shopping', data: horasComerciais.map(h => canalAgg[h]['Shopping']), color: colorHigh }
        ]);

        drawComparisonChart('hp-c-semana', labelsHoras, [
            { label: 'Dias Úteis', data: horasComerciais.map(h => semanaAgg[h]['Dias Úteis']), color: colorHigh },
            { label: 'Final de Semana', data: horasComerciais.map(h => semanaAgg[h]['Fim de Semana']), color: colorLow }
        ]);

        const sortedDates = Object.keys(dateAgg).sort();
        drawChart('hp-c-trend', 'line', { labels: sortedDates, values: sortedDates.map(k => dateAgg[k]) }, true);
        const sortedRedes = Object.entries(redeAgg).sort((a,b) => b[1]-a[1]);
        drawChart('hp-c-rede', 'bar', { labels: sortedRedes.map(e => e[0]), values: sortedRedes.map(e => e[1]) });

        container.classList.remove('data-loading');
    }, 400); 
}

function renderStaticHeatmap(container, dataMap, days, hours, maxVal) {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? 'text-white/30' : 'text-gray-400'; 
    const emptyBg = isDark ? 'bg-white/[0.02] border-white/[0.02]' : 'bg-black/[0.03] border-black/[0.03]';

    let html = `<div class="grid grid-cols-[60px_repeat(13,minmax(40px,1fr))] gap-1"><div></div>`;
    hours.forEach(h => html += `<div class="text-center text-[9px] font-black uppercase tracking-widest ${textColor} pb-2">${h}h</div>`);
    
    days.forEach(day => {
        html += `<div class="flex items-center justify-end pr-4 text-[9px] font-black uppercase tracking-widest ${textColor}">${day}</div>`;
        hours.forEach(hour => {
            const val = dataMap[day][hour] || 0;
            let bgStyle = '';
            let classes = `border ${emptyBg} text-transparent`;
            
            if (val > 0) {
                let ratio = maxVal > 0 ? (val / maxVal) : 0;
                let alpha = 0.15 + (ratio * 0.85);
                let hue = 260 + (ratio * 90);
                
                bgStyle = `background-color: hsla(${hue}, 85%, 55%, ${alpha}); box-shadow: 0 0 12px hsla(${hue}, 85%, 55%, ${alpha * 0.4}); border: 1px solid hsla(${hue}, 85%, 70%, ${alpha * 0.5});`;
                
                let textClass = ratio > 0.35 ? `text-white font-bold` : (isDark ? `text-white/50 font-medium` : `text-black/50 font-medium`);
                classes = `${textClass} rounded-lg`; 
            } else {
                classes += ` rounded-lg`;
            }
            
            html += `<div class="h-10 w-full flex items-center justify-center text-[10px] transition-all duration-300 hover:scale-110 cursor-crosshair z-10 hover:z-20 ${classes}" style="${bgStyle}">${Math.round(val)}</div>`;
        });
    });
    html += `</div>`;
    container.innerHTML = html;
}

const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: chart => {
        if (chart.tooltip && chart.tooltip._active && chart.tooltip._active.length) {
            const isDark = document.body.classList.contains('dark');
            const activePoint = chart.tooltip._active[0];
            const ctx = chart.ctx;
            const x = activePoint.element.x;
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
        }
    }
};

function drawComparisonChart(id, labels, datasets) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    
    const gridColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    const tickColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)';
    const legendColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)';
    const tooltipBg = isDark ? 'rgba(18, 19, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipTitle = isDark ? '#fff' : '#131417';
    const tooltipBody = isDark ? '#fff' : '#131417';

    chartInstances[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets.map(ds => ({
                label: ds.label,
                data: ds.data,
                borderColor: ds.color,
                backgroundColor: ds.color + '15', 
                fill: true,
                tension: 0.5, 
                borderWidth: 2,
                pointRadius: 0, 
                pointHoverRadius: 6
            }))
        },
        plugins: [crosshairPlugin], 
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { display: true, position: 'top', align: 'end', labels: { color: legendColor, font: { family: 'Montserrat', size: 9, weight: 'bold' }, boxWidth: 6, usePointStyle: true } },
                datalabels: { display: false },
                tooltip: { backgroundColor: tooltipBg, titleColor: tooltipTitle, bodyColor: tooltipBody, titleFont: {family: 'Montserrat', size: 10}, bodyFont: {family: 'Chakra Petch', size: 12}, padding: 12, cornerRadius: 8, borderColor: gridColor, borderWidth: 1 }
            },
            scales: { 
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Chakra Petch', size: 10 } }, border: { display: false } },
                x: { grid: { display: false }, ticks: { color: tickColor, font: { family: 'Montserrat', size: 9, weight: '700' } }, border: { display: false } }
            }
        }
    });
}

function drawChart(id, type, data, isArea = false) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    const pluginsArray = type === 'line' ? [crosshairPlugin] : []; 
    
    const gridColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    const tickColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)';
    const tooltipBg = isDark ? 'rgba(18, 19, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    const tooltipTitle = isDark ? '#fff' : '#131417';
    const tooltipBody = isDark ? '#fff' : '#131417';

    chartInstances[id] = new Chart(ctx, {
        type: type,
        data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: isArea ? 'rgba(104, 91, 199, 0.15)' : '#685BC7', borderColor: '#685BC7', fill: isArea, tension: 0.5, borderRadius: type === 'bar' ? 4 : 0, borderWidth: type === 'bar' ? 0 : 2, pointRadius: 0, pointHoverRadius: 6 }] },
        plugins: pluginsArray,
        options: { 
            responsive: true, maintainAspectRatio: false, 
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { display: false }, datalabels: { display: false },
                tooltip: { backgroundColor: tooltipBg, titleColor: tooltipTitle, bodyColor: tooltipBody, titleFont: {family: 'Montserrat', size: 10}, bodyFont: {family: 'Chakra Petch', size: 12}, padding: 12, cornerRadius: 8, borderColor: gridColor, borderWidth: 1 }
            },
            scales: { 
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Chakra Petch', size: 10 } }, border: { display: false } },
                x: { grid: { display: false }, ticks: { color: tickColor, font: { family: 'Montserrat', size: 9, weight: '700' } }, border: { display: false } }
            }
        }
    });
}