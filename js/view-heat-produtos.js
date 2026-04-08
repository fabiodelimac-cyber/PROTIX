// js/view-heat-produtos.js

Chart.register(ChartDataLabels);

let chartInstances = {};
let currentProduct = 'ALL'; 
let latestFilteredData = []; 

export const getHeatProdutosHTML = () => {
    return `
        <style>
            #view-heatmap-wrapper { font-family: 'Archivo', sans-serif; }
            #html-heatmap-container { transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease; will-change: filter, opacity; }
            .data-loading { filter: blur(12px); opacity: 0.3; pointer-events: none; }
            
            /* Classes de Drilldown */
            .heatmap-blurred { filter: blur(12px) saturate(60%); opacity: 0.3; pointer-events: none; }
            #hp-drilldown-overlay { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-adaptive-strong { color: var(--text-muted-strong); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .neon-accent { background: var(--neon-bg); }
            .input-adaptive { background: var(--input-bg); border: 1px solid var(--glass-border); color: var(--text-main); }
            .divide-adaptive > div { border-color: var(--glass-border); }

            @keyframes smoothEntrance {
                from { opacity: 0; transform: translateY(30px); filter: blur(5px); }
                to { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            .anim-cascade { opacity: 0; animation: smoothEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .delay-4 { animation-delay: 0.4s; }
        </style>

        <div id="view-heatmap-wrapper" class="pb-10">
            <div class="anim-cascade delay-1 glass-panel p-6 md:p-8 rounded-[2rem] mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
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

            <div class="anim-cascade delay-2 glass-panel rounded-[2rem] mb-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-adaptive overflow-hidden relative">
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

            <div class="anim-cascade delay-3 glass-panel p-8 md:p-12 rounded-[2.5rem] mb-8 relative overflow-hidden">
                <div class="flex justify-between items-end mb-8 relative z-10">
                    <h4 class="ds-chart-title">Concentração (Dia x Hora)</h4>
                    <div class="hidden md:flex items-center gap-3">
                        <span class="text-[8px] font-bold text-[#8b5cf6] uppercase tracking-[0.2em]">Menor</span>
                        <div class="w-32 h-1.5 rounded-full" style="background: linear-gradient(to right, rgba(139, 92, 246, 0.15), rgba(244, 63, 94, 1));"></div>
                        <span class="text-[8px] font-bold text-[#f43f5e] uppercase tracking-[0.2em]">Maior</span>
                    </div>
                </div>
                
                <div class="overflow-x-auto custom-scrollbar pb-6 relative z-10">
                    <div id="html-heatmap-container" class="min-w-[800px]"></div>
                </div>

                <div id="hp-drilldown-overlay" class="absolute inset-0 z-20 flex flex-col p-8 md:p-12 opacity-0 pointer-events-none translate-y-8" style="background: rgba(18, 19, 23, 0.85); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);">
                    <div class="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
                        <div>
                            <h3 class="text-2xl font-black text-white leading-tight">Distribuição por Aparelho</h3>
                            <p id="hp-drill-subtitle" class="text-xs font-bold text-[#685BC7] uppercase tracking-widest mt-1">-</p>
                        </div>
                        <button id="btn-close-drilldown" class="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-xl">
                            ← Voltar
                        </button>
                    </div>
                    <div id="hp-drill-list" class="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-2">
                        </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2rem]">
                    <h4 class="ds-chart-title mb-8">DNA de Retenção (Perfil Horário)</h4>
                    <div class="chart-container" style="height: 450px;"><canvas id="hp-c-radar"></canvas></div>
                </div>
                <div class="anim-cascade delay-4 flex flex-col gap-6 md:gap-8">
                    <div class="glass-panel p-8 rounded-[2rem] flex-1">
                        <h4 class="ds-chart-title mb-8">Canal: Loja de Rua vs Shopping</h4>
                        <div class="chart-container" style="height: 200px;"><canvas id="hp-c-canal"></canvas></div>
                    </div>
                    <div class="glass-panel p-8 rounded-[2rem] flex-1">
                        <h4 class="ds-chart-title mb-8">Dias Úteis vs Fim de Semana</h4>
                        <div class="chart-container" style="height: 200px;"><canvas id="hp-c-semana"></canvas></div>
                    </div>
                </div>
            </div>

            <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] mb-8">
                <h4 class="ds-chart-title mb-8">Comparativo por Dia da Semana</h4>
                <div class="chart-container" style="height: 300px;"><canvas id="hp-c-trend"></canvas></div>
            </div>
        </div>
    `;
};

export const destroyHeatProdutosCharts = () => {
    Object.keys(chartInstances).forEach(id => { if(chartInstances[id]) chartInstances[id].destroy(); });
    chartInstances = {};
    
    const tooltip = document.getElementById('hp-global-tooltip');
    if (tooltip) tooltip.remove();
};

export const renderHeatProdutos = (filteredData) => {
    if(!filteredData || filteredData.length === 0) return;
    latestFilteredData = filteredData; 
    
    const select = document.getElementById('hp-master-select');
    const products = [...new Set(filteredData.map(d => d.aparelho))].filter(x => x).sort();
    
    if(!currentProduct || (currentProduct !== 'ALL' && !products.includes(currentProduct))) currentProduct = 'ALL';

    select.innerHTML = '';
    select.add(new Option('VISÃO MACRO (TODOS)', 'ALL')); 
    products.forEach(p => select.add(new Option(p, p)));
    select.value = currentProduct;
    
    if (!select.dataset.listenerAttached) {
        select.addEventListener('change', (e) => {
            currentProduct = e.target.value;
            processHeatmapData(latestFilteredData);
        });
        select.dataset.listenerAttached = "true";
    }

    // Listener do Botão Voltar do Drilldown
    const btnVoltar = document.getElementById('btn-close-drilldown');
    if(btnVoltar && !btnVoltar.dataset.listenerAttached) {
        btnVoltar.addEventListener('click', closeDrilldown);
        btnVoltar.dataset.listenerAttached = "true";
    }

    processHeatmapData(latestFilteredData);
};

function processHeatmapData(globalData) {
    if(!currentProduct) return;
    const container = document.getElementById('html-heatmap-container');
    container.classList.add('data-loading');
    closeDrilldown(); // Garante que recalcular os dados feche o overlay se estiver aberto

    setTimeout(() => {
        destroyHeatProdutosCharts(); 
        const parseN = v => parseFloat((v || "0").toString().replace(/\./g, '').replace(',', '.')) || 0;
        
        const prodData = currentProduct === 'ALL' 
            ? globalData.filter(d => d.aparelho && d.aparelho.trim() !== '') 
            : globalData.filter(d => d.aparelho === currentProduct);
        
        const categoryData = globalData.filter(d => d.aparelho && d.aparelho !== currentProduct);

        const totalProd = prodData.reduce((a, b) => a + parseN(b.sessions), 0);
        document.getElementById('hp-k-vol').innerText = Math.round(totalProd).toLocaleString('pt-BR');

        const heatMapData = {}; 
        const catDataMap = {}; // Para o Tooltip (Linha de Produto)
        const drillDataMap = {}; // Novo: Para o Drilldown (Aparelho específico)
        const storeAgg = {}; 
        const canalAgg = {}; const semanaAgg = {};
        const diaSemanaAgg = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0, 'Dom': 0 };
        
        const hourlyProd = Array(13).fill(0);
        const hourlyCat = Array(13).fill(0);

        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const horasComerciais = Array.from({length: 13}, (_, i) => i + 10); 
        
        diasSemana.forEach(d => { 
            heatMapData[d] = {}; 
            catDataMap[d] = {}; 
            drillDataMap[d] = {};
            horasComerciais.forEach(h => { 
                heatMapData[d][h] = 0; 
                catDataMap[d][h] = {}; 
                drillDataMap[d][h] = {};
            }); 
        });

        horasComerciais.forEach(h => {
            canalAgg[h] = { 'Rua': 0, 'Shopping': 0 };
            semanaAgg[h] = { 'Dias Úteis': 0, 'Fim de Semana': 0 };
        });

        prodData.forEach(d => {
            const sess = parseN(d.sessions);
            const store = d['store name'] || 'N/A';
            const cat = d['linha de produto'] || 'N/A';
            const aparelho = d.aparelho || 'N/A';
            const shopVal = (d['shopping'] || '').toString().trim().toUpperCase();
            const isShopping = (shopVal === 'LOJA DE RUA') ? 'Rua' : 'Shopping';
            storeAgg[store] = (storeAgg[store] || 0) + sess;

            if (d.datetime && d.pure_date) {
                const dateParts = d.pure_date.split('-');
                const dtObj = new Date(dateParts[0], dateParts[1]-1, dateParts[2]);
                const dayName = diasSemana[dtObj.getDay()];
                const hour = parseInt(d.datetime.split(' ')[1]?.split(':')[0], 10);
                
                if (diaSemanaAgg[dayName] !== undefined) diaSemanaAgg[dayName] += sess;

                if (hour >= 10 && hour <= 22) {
                    heatMapData[dayName][hour] += sess;
                    
                    if (!catDataMap[dayName][hour][cat]) catDataMap[dayName][hour][cat] = 0;
                    catDataMap[dayName][hour][cat] += sess;

                    if (!drillDataMap[dayName][hour][aparelho]) drillDataMap[dayName][hour][aparelho] = 0;
                    drillDataMap[dayName][hour][aparelho] += sess;

                    canalAgg[hour][isShopping] += sess;
                    semanaAgg[hour][(dtObj.getDay() === 0 || dtObj.getDay() === 6) ? 'Fim de Semana' : 'Dias Úteis'] += sess;
                    hourlyProd[hour - 10] += sess;
                }
            }
        });

        categoryData.forEach(d => {
            const hour = parseInt(d.datetime?.split(' ')[1]?.split(':')[0], 10);
            if (hour >= 10 && hour <= 22) hourlyCat[hour - 10] += parseN(d.sessions);
        });

        let maxSess = 0, peakText = '-';
        for(let d in heatMapData) for(let h in heatMapData[d]) if(heatMapData[d][h] > maxSess) { maxSess = heatMapData[d][h]; peakText = `${d}, ${h}h`; }
        
        document.getElementById('hp-k-peak').innerText = maxSess > 0 ? peakText : '-';
        document.getElementById('hp-k-top').innerText = Object.entries(storeAgg).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';

        renderStaticHeatmap(container, heatMapData, catDataMap, drillDataMap, diasSemana, horasComerciais, maxSess);

        const labelsHoras = horasComerciais.map(h => `${h}h`);
        
        drawRadarChart('hp-c-radar', labelsHoras, hourlyProd, hourlyCat);
        
        drawComparisonChart('hp-c-canal', labelsHoras, [
            { label: 'Rua', data: horasComerciais.map(h => canalAgg[h]['Rua']), color: '#8b5cf6' },
            { label: 'Shopping', data: horasComerciais.map(h => canalAgg[h]['Shopping']), color: '#f43f5e' }
        ]);
        drawComparisonChart('hp-c-semana', labelsHoras, [
            { label: 'Úteis', data: horasComerciais.map(h => semanaAgg[h]['Dias Úteis']), color: '#f43f5e' },
            { label: 'FDS', data: horasComerciais.map(h => semanaAgg[h]['Fim de Semana']), color: '#8b5cf6' }
        ]);

        const labelsSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        drawChart('hp-c-trend', 'bar', { labels: labelsSemana, values: labelsSemana.map(d => diaSemanaAgg[d]) }, false, true);

        container.classList.remove('data-loading');
    }, 400); 
}

function renderStaticHeatmap(container, dataMap, catDataMap, drillDataMap, days, hours, maxVal) {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? 'text-white/30' : 'text-gray-400'; 
    const emptyBg = isDark ? 'bg-white/[0.02] border-white/[0.02]' : 'bg-black/[0.03] border-black/[0.03]';

    let tooltip = document.getElementById('hp-global-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'hp-global-tooltip';
        tooltip.style.cssText = `
            position: fixed; pointer-events: none; z-index: 99999; display: none; opacity: 0;
            min-width: 200px; padding: 16px; border-radius: 16px;
            background: var(--glass-bg, rgba(18, 19, 23, 0.9));
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
            box-shadow: var(--glass-shadow, 0 10px 40px rgba(0, 0, 0, 0.5));
            color: var(--text-main, #fff); font-family: 'Archivo', sans-serif;
            transition: opacity 0.15s ease-out;
        `;
        document.body.appendChild(tooltip);
    }

    let html = `<div class="grid grid-cols-[60px_repeat(13,minmax(40px,1fr))] gap-1"><div></div>`;
    hours.forEach(h => html += `<div class="text-center text-[9px] font-black uppercase tracking-widest ${textColor} pb-2">${h}h</div>`);
    
    days.forEach(day => {
        html += `<div class="flex items-center justify-end pr-4 text-[9px] font-black uppercase tracking-widest ${textColor}">${day}</div>`;
        hours.forEach(hour => {
            const val = dataMap[day][hour] || 0;
            const breakdowns = catDataMap[day][hour] || {};
            const drilldowns = drillDataMap[day][hour] || {};
            
            const bdJson = JSON.stringify(breakdowns).replace(/"/g, '&quot;'); 
            const drillJson = JSON.stringify(drilldowns).replace(/"/g, '&quot;'); 
            
            let bgStyle = '';
            let baseClasses = `heatmap-cell h-10 w-full flex items-center justify-center text-[12px] transition-all duration-300 z-10`;
            let colorClasses = '';
            
            if (val > 0) {
                let ratio = maxVal > 0 ? (val / maxVal) : 0;
                let alpha = 0.15 + (ratio * 0.85);
                let hue = 260 + (ratio * 90);
                bgStyle = `background-color: hsla(${hue}, 85%, 55%, ${alpha}); box-shadow: 0 0 12px hsla(${hue}, 85%, 55%, ${alpha * 0.4}); border: 1px solid hsla(${hue}, 85%, 70%, ${alpha * 0.5});`;
                
                let textClass = ratio > 0.35 ? `text-white font-bold` : (isDark ? `text-white/50 font-medium` : `text-black/50 font-medium`);
                colorClasses = ` ${textClass} rounded-lg cursor-pointer hover:scale-110 hover:z-20`; 
            } else { 
                colorClasses = ` border ${emptyBg} text-transparent rounded-lg cursor-default`; 
            }

            html += `<div class="${baseClasses}${colorClasses}" 
                          style="${bgStyle} font-stretch: 140%;"
                          data-day="${day}"
                          data-hour="${hour}"
                          data-total="${Math.round(val)}"
                          data-bd="${bdJson}"
                          data-drill="${drillJson}"
                     >${Math.round(val)}</div>`;
        });
    });
    html += `</div>`;
    container.innerHTML = html;

    const cells = container.querySelectorAll('.heatmap-cell');
    cells.forEach(cell => {
        const total = parseInt(cell.getAttribute('data-total') || 0);

        cell.addEventListener('mouseenter', () => {
            if (total === 0 || container.classList.contains('heatmap-blurred')) return;

            const day = cell.getAttribute('data-day');
            const hour = cell.getAttribute('data-hour');
            const bd = JSON.parse(cell.getAttribute('data-bd') || '{}');

            const bdKeys = Object.keys(bd).sort((a,b) => bd[b] - bd[a]);
            let bdHTML = bdKeys.map(k => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:4px;">
                    <span style="font-size:10px; text-transform:uppercase; font-weight:700; color:var(--text-muted, #9ca3af);">${k}</span>
                    <span style="font-size:12px; font-weight:900;">${Math.round(bd[k])}</span>
                </div>
            `).join('');

            if (bdHTML === '') bdHTML = `<div style="font-size:10px; color:var(--text-muted, #9ca3af); font-style:italic;">Sem detalhes</div>`;

            tooltip.innerHTML = `
                <div style="border-bottom: 1px solid var(--glass-border, rgba(255,255,255,0.1)); padding-bottom: 8px; margin-bottom: 8px;">
                    <p style="font-size:9px; font-weight:900; color:#685BC7; text-transform:uppercase; letter-spacing:0.1em; margin:0 0 2px 0;">${day} • ${hour}h</p>
                    <p style="font-size:16px; font-weight:900; line-height:1; margin:0;">${total} <span style="font-size:9px; font-weight:400; color:var(--text-muted, #9ca3af); text-transform:uppercase; letter-spacing:0;">interações</span></p>
                    <p style="font-size:8px; margin-top:4px; opacity:0.5; font-weight:bold;">CLIQUE PARA DRILL-DOWN</p>
                </div>
                ${bdHTML}
            `;

            tooltip.style.display = 'block';
            tooltip.style.opacity = '0'; 
        });

        cell.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'none' || container.classList.contains('heatmap-blurred')) return;

            const tW = tooltip.offsetWidth;
            const tH = tooltip.offsetHeight;
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            const gap = 15;
            let x = e.clientX + gap;
            let y = e.clientY + gap;

            if (x + tW > winW - gap) x = e.clientX - tW - gap;
            if (y + tH > winH - gap) y = e.clientY - tH - gap;

            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
            tooltip.style.opacity = '1'; 
        });

        cell.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.display = 'none';
        });

        // AÇÃO DO DRILL-DOWN
        cell.addEventListener('click', () => {
            if (total === 0) return;
            
            tooltip.style.opacity = '0';
            tooltip.style.display = 'none';

            const day = cell.getAttribute('data-day');
            const hour = cell.getAttribute('data-hour');
            const drillData = JSON.parse(cell.getAttribute('data-drill') || '{}');
            
            openDrilldown(day, hour, total, drillData);
        });
    });
}

function openDrilldown(day, hour, total, drillData) {
    const container = document.getElementById('html-heatmap-container');
    const overlay = document.getElementById('hp-drilldown-overlay');
    const subtitle = document.getElementById('hp-drill-subtitle');
    const listContainer = document.getElementById('hp-drill-list');

    // Popula Dados
    subtitle.innerText = `${day} às ${hour}h • Total: ${total}`;
    
    const items = Object.entries(drillData).sort((a,b) => b[1] - a[1]);
    let html = '';
    
    items.forEach(([prod, vol], index) => {
        html += `
            <div class="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors" style="animation: smoothEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.05}s; opacity: 0;">
                <span class="text-sm font-bold text-white/90 truncate mr-4">${prod}</span>
                <span class="text-lg font-black text-[#685BC7] font-numbers">${Math.round(vol)}</span>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Transição de Estado
    container.classList.add('heatmap-blurred');
    overlay.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-8');
    overlay.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
}

function closeDrilldown() {
    const container = document.getElementById('html-heatmap-container');
    const overlay = document.getElementById('hp-drilldown-overlay');
    
    if(container && overlay) {
        container.classList.remove('heatmap-blurred');
        overlay.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        overlay.classList.add('opacity-0', 'pointer-events-none', 'translate-y-8');
    }
}

function drawRadarChart(id, labels, prodData, catData) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    
    const maxProd = Math.max(...prodData) || 1;
    const maxCat = Math.max(...catData) || 1;
    const normProd = prodData.map(v => (v / maxProd) * 100);
    const normCat = catData.map(v => (v / maxCat) * 100);

    chartInstances[id] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Este Produto',
                    data: normProd,
                    borderColor: '#685BC7',
                    backgroundColor: 'rgba(104, 91, 199, 0.25)',
                    borderWidth: 4,
                    pointRadius: 0
                },
                {
                    label: 'Média Categoria',
                    data: normCat,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                    grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                    pointLabels: { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', font: { family: 'Archivo', size: 11, weight: 700 } },
                    ticks: { display: false }, 
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                datalabels: { display: false }, 
                legend: { position: 'bottom', labels: { color: isDark ? '#fff' : '#000', font: { family: 'Archivo', size: 10, weight: 700 }, usePointStyle: true } },
                tooltip: { enabled: false }
            }
        }
    });
}

function drawComparisonChart(id, labels, datasets) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    chartInstances[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets.map(ds => ({
                label: ds.label, data: ds.data, borderColor: ds.color, backgroundColor: ds.color + '15', fill: true, tension: 0.5, borderWidth: 2, pointRadius: 0, pointHoverRadius: 6
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                datalabels: { display: false },
                legend: { display: true, position: 'top', align: 'end', labels: { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', font: { family: 'Archivo', size: 10, weight: 700 }, boxWidth: 6, usePointStyle: true } },
                tooltip: { backgroundColor: isDark ? 'rgba(18, 19, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)', titleFont: { family: 'Archivo', size: 10, weight: 800 }, bodyFont: { family: 'Archivo', size: 11, weight: 500 }, padding: 12, cornerRadius: 8 }
            },
            scales: { 
                y: { beginAtZero: true, grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }, ticks: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', font: { family: 'Archivo', size: 10, weight: 600 } }, border: { display: false } },
                x: { grid: { display: false }, ticks: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', font: { family: 'Archivo', size: 9, weight: 700 } }, border: { display: false } }
            }
        }
    });
}

function drawChart(id, type, data, isArea = false, showPercentage = false) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    const totalData = showPercentage ? data.values.reduce((a, b) => a + b, 0) : 0;
    chartInstances[id] = new Chart(ctx, {
        type: type,
        data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: isArea ? 'rgba(104, 91, 199, 0.15)' : '#685BC7', borderColor: '#685BC7', fill: isArea, tension: 0.5, borderRadius: type === 'bar' ? 6 : 0, borderWidth: type === 'bar' ? 0 : 2, pointRadius: 0, pointHoverRadius: 6 }] },
        options: { 
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { display: false }, 
                datalabels: { 
                    display: showPercentage, align: 'end', anchor: 'end', color: isDark ? '#ffffff' : '#131417', font: { family: 'Archivo', size: 12, weight: 800 },
                    formatter: (value) => totalData === 0 ? '0%' : ((value / totalData) * 100).toFixed(1).replace('.', ',') + '%'
                },
                tooltip: { backgroundColor: isDark ? 'rgba(18, 19, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)', titleFont: { family: 'Archivo', size: 10, weight: 800 }, bodyFont: { family: 'Archivo', size: 11, weight: 500 }, padding: 12, cornerRadius: 8 }
            },
            scales: { 
                y: { beginAtZero: true, grace: showPercentage ? '15%' : '0%', grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }, ticks: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', font: { family: 'Archivo', size: 10, weight: 600 } }, border: { display: false } },
                x: { grid: { display: false }, ticks: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', font: { family: 'Archivo', size: 9, weight: 700 } }, border: { display: false } }
            }
        }
    });
}