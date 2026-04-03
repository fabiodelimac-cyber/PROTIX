// js/view-heat-produtos.js

let chartInstances = {};
let currentProduct = null;

export const getHeatProdutosHTML = () => {
    return `
        <style>
            /* Animação suave de transição de dados sem mover um pixel do lugar */
            #html-heatmap-container {
                transition: filter 0.3s ease, opacity 0.3s ease;
                will-change: filter, opacity;
            }
            .data-loading {
                filter: blur(8px);
                opacity: 0.4;
                pointer-events: none;
            }
        </style>

        <div class="card p-6 md:p-8 rounded-[2rem] border mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
            <div class="absolute right-0 top-0 opacity-5 text-8xl font-black -mt-4 -mr-4 pointer-events-none group-hover:scale-110 transition-transform">🔥</div>
            <div>
                <p class="text-[#685BC7] text-[10px] font-black uppercase tracking-widest mb-1">Análise de Perfil de Interação</p>
                <h2 class="text-2xl md:text-3xl font-bold">Heatmap de Produtos</h2>
            </div>
            <div class="w-full md:w-1/3 relative z-10">
                <label class="text-[9px] font-black uppercase text-muted mb-2 block">Selecione o Modelo Alvo</label>
                <select id="hp-master-select" class="w-full p-4 rounded-xl text-sm font-bold bg-[#131417] border border-[#2d3139] text-white focus:border-[#685BC7] outline-none transition-colors cursor-pointer shadow-inner">
                    <option value="">Carregando produtos...</option>
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <div class="card p-6 rounded-[2rem] border"><p class="text-muted text-[9px] font-black uppercase tracking-widest">Interações (Sessões)</p><h3 id="hp-k-vol" class="text-2xl md:text-3xl font-bold mt-2 font-numbers">0</h3></div>
            <div class="card p-6 rounded-[2rem] border"><p class="text-muted text-[9px] font-black uppercase tracking-widest">Pico de Interação</p><h3 id="hp-k-peak" class="text-lg md:text-xl font-bold mt-2 leading-tight">-</h3></div>
            <div class="card p-6 rounded-[2rem] border border-b-8 border-r-0 md:border-b-0 md:border-r-8 border-[#685BC7]"><p class="text-muted text-[9px] font-black uppercase tracking-widest">Top PDV</p><h3 id="hp-k-top" class="text-lg md:text-xl font-bold mt-2 truncate leading-tight">-</h3></div>
        </div>

        <div class="card p-6 md:p-10 rounded-[2.5rem] border mb-6 md:mb-8">
            <h4 class="text-sm font-black text-muted uppercase tracking-widest mb-6">Mapa de Concentração (Dia x Hora)</h4>
            <div class="overflow-x-auto custom-scrollbar pb-4">
                <div id="html-heatmap-container" class="min-w-[800px]">
                    </div>
            </div>
            <div class="flex items-center justify-end gap-2 mt-2">
                <span class="text-[9px] font-bold text-muted uppercase tracking-wider">Menos Frequente</span>
                <div class="w-24 h-2 rounded bg-gradient-to-r from-gray-500/10 to-[#685BC7]"></div>
                <span class="text-[9px] font-bold text-[#685BC7] uppercase tracking-wider">Pico de Uso</span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
            <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border"><h4 class="text-sm font-black text-muted mb-6 uppercase tracking-widest">Tendência Diária</h4><div class="chart-container" style="height: 300px;"><canvas id="hp-c-trend"></canvas></div></div>
            <div class="card p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border"><h4 class="text-sm font-black text-muted mb-6 uppercase tracking-widest">Distribuição por Rede</h4><div class="chart-container" style="height: 300px;"><canvas id="hp-c-rede"></canvas></div></div>
        </div>
    `;
};

export const destroyHeatProdutosCharts = () => {
    Object.keys(chartInstances).forEach(id => { if(chartInstances[id]) chartInstances[id].destroy(); });
    chartInstances = {};
};

export const renderHeatProdutos = (filteredData) => {
    if(!filteredData || filteredData.length === 0) return;
    const select = document.getElementById('hp-master-select');
    const products = [...new Set(filteredData.map(d => d.aparelho))].filter(x => x).sort();
    
    if(!currentProduct || !products.includes(currentProduct)) currentProduct = products[0] || null;

    if(select.options.length <= 1 || select.dataset.updated !== "true") {
        select.innerHTML = '';
        products.forEach(p => select.add(new Option(p, p)));
        select.value = currentProduct;
        select.dataset.updated = "true";
        select.addEventListener('change', (e) => {
            currentProduct = e.target.value;
            processHeatmapData(filteredData);
        });
    }
    processHeatmapData(filteredData);
};

function processHeatmapData(globalData) {
    if(!currentProduct) return;
    const container = document.getElementById('html-heatmap-container');
    
    // 1. Inicia o "Loading" visual (Blur no container todo)
    container.classList.add('data-loading');

    setTimeout(() => {
        destroyHeatProdutosCharts(); 
        const parseN = v => parseFloat((v || "0").toString().replace(/\./g, '').replace(',', '.')) || 0;
        const prodData = globalData.filter(d => d.aparelho === currentProduct);
        
        // KPIs
        const totalProd = prodData.reduce((a, b) => a + parseN(b.sessions), 0);
        document.getElementById('hp-k-vol').innerText = Math.round(totalProd).toLocaleString('pt-BR');

        const heatMapData = {}; const storeAgg = {}; const redeAgg = {}; const dateAgg = {};
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const horasComerciais = Array.from({length: 13}, (_, i) => i + 10); 
        diasSemana.forEach(d => { heatMapData[d] = {}; horasComerciais.forEach(h => heatMapData[d][h] = 0); });

        prodData.forEach(d => {
            const sess = parseN(d.sessions);
            const store = d['store name'] || 'N/A';
            const rede = d['rede'] || 'N/A';
            const pDate = d['pure_date'];
            storeAgg[store] = (storeAgg[store] || 0) + sess;
            redeAgg[rede] = (redeAgg[rede] || 0) + sess;
            if(pDate) dateAgg[pDate] = (dateAgg[pDate] || 0) + sess;
            if (d.datetime && d.pure_date) {
                const dateParts = d.pure_date.split('-');
                const dayName = diasSemana[new Date(dateParts[0], dateParts[1]-1, dateParts[2]).getDay()];
                const hour = parseInt(d.datetime.split(' ')[1]?.split(':')[0], 10);
                if (hour >= 10 && hour <= 22) heatMapData[dayName][hour] += sess;
            }
        });

        let maxSess = 0, peakText = '-';
        for(let d in heatMapData) for(let h in heatMapData[d]) if(heatMapData[d][h] > maxSess) { maxSess = heatMapData[d][h]; peakText = `${d}, ${h}h`; }
        
        document.getElementById('hp-k-peak').innerText = maxSess > 0 ? peakText : '-';
        document.getElementById('hp-k-top').innerText = Object.entries(storeAgg).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';

        // 2. Renderiza a tabela de forma estática (Substituição total)
        renderStaticHeatmap(container, heatMapData, diasSemana, horasComerciais, maxSess);

        // 3. Gráficos
        const sortedDates = Object.keys(dateAgg).sort();
        drawChart('hp-c-trend', 'line', { labels: sortedDates, values: sortedDates.map(k => dateAgg[k]) }, true);
        const sortedRedes = Object.entries(redeAgg).sort((a,b) => b[1]-a[1]);
        drawChart('hp-c-rede', 'bar', { labels: sortedRedes.map(e => e[0]), values: sortedRedes.map(e => e[1]) });

        // 4. Remove o Blur e revela os dados novos
        container.classList.remove('data-loading');
    }, 300); // Sincronizado com o CSS transition
}

function renderStaticHeatmap(container, dataMap, days, hours, maxVal) {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const emptyBg = isDark ? 'bg-gray-800/30' : 'bg-gray-100';

    let html = `<div class="grid grid-cols-[60px_repeat(13,minmax(40px,1fr))] gap-1">`;
    html += `<div></div>`;
    hours.forEach(h => html += `<div class="text-center text-[10px] font-black uppercase ${textColor}">${h}h</div>`);

    days.forEach(day => {
        html += `<div class="flex items-center justify-end pr-3 text-[10px] font-black uppercase ${textColor}">${day}</div>`;
        hours.forEach(hour => {
            const val = dataMap[day][hour] || 0;
            let opacity = maxVal > 0 ? (val / maxVal) : 0;
            opacity = Math.max(0.1, opacity); 
            let bgStyle = val > 0 ? `background-color: rgba(104, 91, 199, ${opacity});` : '';
            let classes = val > 0 ? `text-white font-bold shadow-[0_0_8px_rgba(104,91,199,0.3)]` : `${emptyBg} text-transparent`;
            html += `<div class="h-10 w-full rounded flex items-center justify-center text-[10px] ${classes}" style="${bgStyle}">${Math.round(val)}</div>`;
        });
    });
    html += `</div>`;
    container.innerHTML = html;
}

function drawChart(id, type, data, isArea = false) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    chartInstances[id] = new Chart(ctx, {
        type: type,
        data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: isArea ? 'rgba(104, 91, 199, 0.2)' : '#685BC7', borderColor: '#685BC7', fill: isArea, tension: 0.4, borderRadius: 8, borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: isDark ? '#8e94a0' : '#475569', font: { family: 'Chakra Petch', size: 11 } } },
                x: { grid: { display: false }, ticks: { color: isDark ? '#8e94a0' : '#475569', font: { family: 'Roboto', size: 10, weight: '900' } } }
            }
        }
    });
}