// js/view-overview.js

Chart.register(ChartDataLabels);

let chartInstances = {};
let insightTimeout = null;

export const getOverviewHTML = () => {
    const showWelcome = !sessionStorage.getItem('ps_welcome_shown');

    return `
        <style>
            #view-overview-wrapper { font-family: 'Archivo', sans-serif; }
            
            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .text-glow-accent { text-shadow: var(--glow-accent); }
            .neon-accent { background: var(--neon-bg); }
            .divide-adaptive > div { border-color: var(--glass-border); }

            /* EYE CANDY: Animações de Entrada Supremas */
            @keyframes slideUpFade {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOutWelcome {
                to { opacity: 0; height: 0; margin-bottom: 0; padding: 0; overflow: hidden; }
            }
            
            @keyframes smoothEntrance {
                from { opacity: 0; transform: translateY(30px); filter: blur(5px); }
                to { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            
            .welcome-msg { animation: slideUpFade 0.8s ease forwards; }
            .welcome-msg.hide { animation: fadeOutWelcome 0.5s ease forwards; }
            
            /* Classes de cascata para os cards */
            .anim-cascade { opacity: 0; animation: smoothEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .delay-4 { animation-delay: 0.4s; }
        </style>

        <div id="view-overview-wrapper" class="pb-10 overflow-hidden">
            
            ${showWelcome ? `
            <div id="welcome-container" class="welcome-msg mb-6 px-2">
                <h1 class="ds-title mb-1">
                    Seja bem-vindo(a)!
                </h1>
                <p class="ds-helper-text text-adaptive-muted">Sessão iniciada com sucesso.</p>
            </div>
            ` : ''}

            <div id="insight-box" class="anim-cascade delay-1 glass-panel p-5 md:p-6 rounded-2xl flex items-center gap-5 mb-6 md:mb-8 transition-all hover:scale-[1.01]">
                <div class="bg-gradient-to-br from-[#685BC7] to-[#8b5cf6] px-4 py-2 rounded-xl text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-[#685BC7]/30 shrink-0">INSIGHT</div>
                <p id="insight-text" class="text-sm md:text-base font-medium tracking-tight text-adaptive italic"></p>
            </div>

            <div class="anim-cascade delay-2 glass-panel rounded-[2.5rem] mb-8 md:mb-10 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-adaptive relative z-50">
                <div class="flex-1 p-8 md:p-10 flex flex-col justify-start relative z-10">
                    <p class="ds-kpi-label mb-4">Volume de Sessões</p>
                    <h3 id="k-sess" class="ds-kpi-value text-4xl md:text-5xl text-glow">0</h3>
                </div>
                <div class="flex-1 p-8 md:p-10 flex flex-col justify-start relative z-10">
                    <p class="ds-kpi-label mb-4">Pontos de Venda (Lojas)</p>
                    <h3 id="k-sto" class="ds-kpi-value text-4xl md:text-5xl leading-tight">0</h3>
                </div>
                <div class="flex-1 p-8 md:p-10 flex flex-col justify-start relative z-10 group cursor-help">
                    <p class="ds-kpi-label mb-4 flex items-center gap-1.5">
                        Aparelhos Demonstrados
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                    </p>
                    <h3 id="k-dev" class="ds-kpi-value text-4xl md:text-5xl">0</h3>
                    <div id="k-dev-tooltip" class="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-4 w-max min-w-[200px] max-w-sm bg-[rgba(18,19,23,0.95)] backdrop-blur-xl text-white text-[10px] p-5 rounded-2xl shadow-2xl z-50 border border-white/10 whitespace-nowrap font-medium"></div>
                </div>
                <div class="flex-1 p-8 md:p-10 flex flex-col justify-start relative neon-accent z-10 overflow-hidden rounded-r-[2.5rem]">
                    <div class="absolute right-0 top-0 opacity-[0.02] text-9xl font-black -mt-6 -mr-4 pointer-events-none">📊</div>
                    <p class="ds-kpi-label mb-4 relative z-10 text-[#685BC7]">Média por Ponto de Venda</p>
                    <h3 id="k-avg" class="ds-kpi-value text-4xl md:text-5xl text-glow-accent relative z-10">0</h3>
                    <div class="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#685BC7] to-transparent opacity-50"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10 hover:-translate-y-1 transition-transform duration-300">
                    <h4 class="ds-chart-title mb-8">Volume de Interações por Dia</h4>
                    <div class="chart-container" style="height: 250px;"><canvas id="c-timeline"></canvas></div>
                </div>
                <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10 hover:-translate-y-1 transition-transform duration-300">
                    <h4 class="ds-chart-title mb-8">Frequência de Uso por Hora</h4>
                    <div class="chart-container" style="height: 250px;"><canvas id="c-time"></canvas></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10 hover:-translate-y-1 transition-transform duration-300">
                    <h4 class="ds-chart-title mb-8">Engajamento por Rede</h4>
                    <div class="chart-container" style="height: 280px;"><canvas id="c-rede"></canvas></div>
                </div>
                
                <div class="anim-cascade delay-4 glass-panel p-6 md:p-8 rounded-[2.5rem] relative z-10 hover:-translate-y-1 transition-transform duration-300">
                    <div class="flex flex-col md:flex-row gap-6 h-full">
                        <div class="flex-1 flex flex-col">
                            <h4 class="ds-chart-title mb-2 text-center md:text-left">Interações por Local</h4>
                            <div class="chart-container relative flex-1 min-h-[220px]">
                                <canvas id="c-shop"></canvas>
                            </div>
                        </div>
                        <div class="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-[var(--glass-border)] pt-6 md:pt-0 md:pl-6">
                            <h4 class="ds-chart-title mb-2 text-center md:text-left">Interações por Linha</h4>
                            <div class="chart-container relative flex-1 min-h-[220px]">
                                <canvas id="c-linha"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const destroyOverviewCharts = () => {
    Object.keys(chartInstances).forEach(id => {
        if(chartInstances[id]) chartInstances[id].destroy();
    });
    chartInstances = {};
    if (insightTimeout) clearInterval(insightTimeout);
};

export const renderOverviewCharts = (filteredData) => {
    destroyOverviewCharts();

    const welcome = document.getElementById('welcome-container');
    if (welcome) {
        sessionStorage.setItem('ps_welcome_shown', 'true');
        setTimeout(() => {
            welcome.classList.add('hide');
            setTimeout(() => welcome.remove(), 500);
        }, 5000);
    }

    if(!filteredData || filteredData.length === 0) {
        document.getElementById('k-sess').innerText = '0';
        document.getElementById('k-sto').innerText = '0';
        document.getElementById('k-dev').innerText = '0';
        document.getElementById('k-avg').innerText = '0';
        document.getElementById('insight-text').innerText = 'Aguardando dados estruturados para processamento analítico.';
        return;
    }
    
    const parseN = v => parseFloat((v || "0").toString().replace(/\./g, '').replace(',', '.')) || 0;
    
    // KPIs
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
            const k = `${d['aparelho']} - <span class="text-white/40 font-normal">${d['tipo']}</span>`;
            if(!devSetMap[k]) devSetMap[k] = new Set();
            devSetMap[k].add(d['device code']);
        }
    });
    
    const sortedDevList = Object.entries(devSetMap).map(([k, set]) => [k, set.size]).sort((a, b) => b[1] - a[1]);
    document.getElementById('k-dev-tooltip').innerHTML = '<p class="ds-sidebar-title text-[#685BC7] mb-3 border-b border-white/10 pb-3">Modelos Operantes na Rede</p>' + 
        (sortedDevList.length > 0 
            ? sortedDevList.map(v => `<div class="mt-2.5 flex items-center justify-between gap-6"><span class="opacity-90">${v[0]}</span> <span class="font-black font-numbers text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-md border border-[#8b5cf6]/20">${v[1]}</span></div>`).join('') 
            : '<div class="opacity-50 mt-2">Nenhum modelo detectado</div>');
            
    // Heurística do Insight
    const devG = filteredData.reduce((a, o) => { a[o.aparelho] = (a[o.aparelho] || 0) + parseN(o.sessions); return a; }, {});
    const topDev = Object.entries(devG).sort((a,b) => b[1]-a[1])[0];
    const textInsight = topDev ? `PROSOLUTION ANALYTICS: O modelo ${topDev[0]} registrou a maior tração com ${Math.round(topDev[1]).toLocaleString('pt-BR')} interações validadas.` : 'Aguardando massa de dados.';
    
    const el = document.getElementById('insight-text'); 
    el.innerHTML = ""; 
    let i = 0;
    
    if (insightTimeout) clearInterval(insightTimeout);
    
    insightTimeout = setInterval(() => { 
        if (i < textInsight.length) {
            el.innerHTML += textInsight.charAt(i); 
            i++; 
        } else {
            clearInterval(insightTimeout);
        }
    }, 20); 

    // BINÁRIO: Loja de Rua vs Shopping
    let ruaTotal = 0, shopTotal = 0;
    
    // LINHA: Agrupamento
    const linhaAgg = {};

    filteredData.forEach(d => {
        const sess = parseN(d.sessions);
        
        const tipoOriginal = (d.shopping || '').toUpperCase().trim();
        if (tipoOriginal === 'LOJA DE RUA') ruaTotal += sess;
        else shopTotal += sess;
        
        const linha = (d['linha de produto'] || 'N/A').toUpperCase().trim();
        linhaAgg[linha] = (linhaAgg[linha] || 0) + sess;
    });

    const sortedLinhas = Object.keys(linhaAgg).sort((a,b) => linhaAgg[b] - linhaAgg[a]);

    // Renderizando os gráficos na nova ordem
    drawChart('c-timeline', 'line', aggregateWithStores(filteredData, 'pure_date', true), true);
    drawChart('c-time', 'line', aggregateWithStores(filteredData, 'faixa', true), true);
    drawChart('c-rede', 'bar', aggregateWithStores(filteredData, 'rede', false, true));
    
    drawChart('c-shop', 'doughnut', { labels: ['Loja de Rua', 'Shopping'], values: [ruaTotal, shopTotal] });
    drawChart('c-linha', 'doughnut', { labels: sortedLinhas, values: sortedLinhas.map(l => linhaAgg[l]) });
};

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

// Plugin Crosshair
const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: chart => {
        if (chart.config.type !== 'line') return;
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

function drawChart(id, type, data, isArea = false, isH = false) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    
    const labelColor = isDark ? '#FFFFFF' : '#131417';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    const tickColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.4)';
    const tooltipBg = isDark ? 'rgba(18, 19, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipTitle = isDark ? '#ffffff' : '#131417';
    const tooltipBody = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(19, 20, 23, 0.8)';
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    const pluginsArray = type === 'line' ? [crosshairPlugin] : [];
    
    let bg;
    let borderColor = '#685BC7';
    let borderWidth = type === 'bar' ? 0 : 2;

    if (type === 'doughnut') {
        bg = data.labels.map((_, i) => {
            if (id === 'c-shop') return i === 0 ? '#685BC7' : (isDark ? '#3B455E' : '#B2BECE');
            const colorsDark = ['#685BC7', '#526082', '#3B455E', '#242A38'];
            const colorsLight = ['#685BC7', '#8B9BB4', '#B2BECE', '#E2E8F0'];
            return isDark ? colorsDark[i % colorsDark.length] : colorsLight[i % colorsLight.length];
        });
        borderColor = isDark ? '#1c1e22' : '#ffffff'; 
        borderWidth = 3;
    } else {
        bg = '#685BC7';
        if(isArea) { 
            const grad = ctx.createLinearGradient(0, 0, 0, 400); 
            grad.addColorStop(0, 'rgba(104, 91, 199, 0.25)'); 
            grad.addColorStop(1, 'rgba(104, 91, 199, 0)'); 
            bg = grad; 
        }
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

    let tooltipConfig = { 
        backgroundColor: tooltipBg, 
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        titleFont: { family: 'Archivo', size: 10, weight: 800 }, 
        bodyFont: { family: 'Archivo', size: 11, weight: 500 },
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12
    };

    if ((id === 'c-store' || id === 'c-rede') && data.tooltipData) {
        tooltipConfig.callbacks = {
            title: ctx => { const code = ctx[0].label; return data.tooltipData[code] ? data.tooltipData[code].name || code : code; },
            label: ctx => {
                const code = ctx.label;
                if(data.tooltipData[code]) {
                    const devices = data.tooltipData[code].devices || data.tooltipData[code].stores;
                    if(devices) return Object.entries(devices).sort((a,b) => b[1]-a[1]).map(d => `${d[0]}: ${Math.round(d[1]).toLocaleString('pt-BR')}`);
                } return ctx.formattedValue;
            }
        };
    } else if (data.tooltipData) {
        tooltipConfig.callbacks = {
            title: ctx => { let lbl = ctx[0].label; if (id === 'c-timeline' && Array.isArray(lbl)) return lbl.join('\n'); if (id === 'c-timeline' && typeof lbl === 'string' && lbl.includes(',')) return lbl.replace(',', '\n'); return lbl; },
            label: ctx => {
                const key = typeof ctx.label === 'string' ? ctx.label.split(',')[0] : (Array.isArray(ctx.label) ? ctx.label[0] : ctx.label);
                const stores = data.tooltipData[key];
                if(stores) { return Object.entries(stores).sort((a,b) => b[1]-a[1]).map(s => `${s[0]}: ${Math.round(s[1]).toLocaleString('pt-BR')}`); }
                return ctx.formattedValue;
            }
        };
    }

    const chartConfig = {
        type: type,
        data: { 
            labels: xLabels, 
            datasets: [{ 
                data: data.values, 
                backgroundColor: bg, 
                borderColor: borderColor, 
                fill: isArea, 
                tension: 0.5, 
                borderRadius: type === 'bar' ? (isH ? {topRight: 6, bottomRight: 6} : {topLeft: 6, topRight: 6}) : 0, 
                borderWidth: borderWidth, 
                pointRadius: 0, 
                pointHoverRadius: 6,
                hoverOffset: type === 'doughnut' ? 8 : 0
            }] 
        },
        plugins: pluginsArray,
        options: {
            indexAxis: isH ? 'y' : 'x', 
            responsive: true, 
            maintainAspectRatio: false,
            cutout: type === 'doughnut' ? '65%' : undefined, 
            
            interaction: { 
                mode: isH ? 'nearest' : (type === 'doughnut' ? 'nearest' : 'index'), 
                intersect: isH || type === 'doughnut' ? true : false,   
                axis: isH ? 'y' : (type === 'doughnut' ? 'xy' : 'x')
            },

            layout: {
                padding: {
                    top: type === 'doughnut' ? 35 : (!isH ? 30 : 0), 
                    right: type === 'doughnut' ? 30 : (isH ? 50 : 0),
                    bottom: type === 'doughnut' ? 25 : 0,
                    left: type === 'doughnut' ? 30 : 0
                }
            },
            plugins: { 
                legend: { 
                    display: type === 'doughnut', 
                    position: 'bottom',
                    // A cor da legenda agora usa o tickColor (o mesmo cinza dos eixos)
                    labels: { color: tickColor, font: { family: 'Archivo', size: 10, weight: 700 }, usePointStyle: true, boxWidth: 6, padding: 15 }
                }, 
                tooltip: tooltipConfig,
                datalabels: {
                    display: true, 
                    font: { family: 'Archivo', size: type === 'doughnut' ? 13 : 10, weight: type === 'doughnut' ? 900 : 800 },
                    formatter: (value, ctx) => {
                        if (type === 'doughnut') {
                            let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            if (sum === 0) return '0%';
                            return (value * 100 / sum).toFixed(1).replace('.', ',') + '%';
                        }
                        return Math.round(value).toLocaleString('pt-BR');
                    },
                    anchor: 'end',
                    align: type === 'doughnut' ? 'end' : (isH ? 'right' : 'top'),
                    color: labelColor,
                    offset: type === 'doughnut' ? 5 : 6
                }
            },
            scales: { 
                y: { 
                    display: type !== 'doughnut',
                    grace: isH ? '0%' : '15%', 
                    beginAtZero: true, 
                    grid: { color: isH ? 'transparent' : gridColor, drawBorder: false }, 
                    ticks: { 
                        color: tickColor, 
                        font: { family: 'Archivo', size: 10, weight: 600 },
                        autoSkip: isH ? false : true 
                    }, 
                    border: { display: false } 
                },
                x: { 
                    display: type !== 'doughnut',
                    grace: isH ? '15%' : '0%', 
                    grid: { display: isH ? true : false, color: gridColor, drawBorder: false }, 
                    ticks: { color: tickColor, font: { family: 'Archivo', size: 9, weight: 700 } }, 
                    border: { display: false } 
                }
            }
        }
    };

    chartInstances[id] = new Chart(ctx, chartConfig);
}