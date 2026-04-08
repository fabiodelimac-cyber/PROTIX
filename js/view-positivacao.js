// js/view-positivacao.js

export const getPositivacaoHTML = () => {
    return `
        <style>
            #view-positivacao-wrapper { font-family: 'Montserrat', sans-serif; }
            
            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .text-glow-accent { text-shadow: var(--glow-accent); }
            .text-glow-green { text-shadow: var(--glow-green); }
            .neon-accent { background: var(--neon-bg); }
            
            /* Tabela Ajustada para Escala 1080p */
            .table-border { border-color: var(--glass-border); }
            .bg-sticky { background-color: var(--bg-sticky); backdrop-filter: blur(10px); }
            .hover-row:hover td { background-color: var(--hover-table); }
        </style>

        <div id="view-positivacao-wrapper">
            <div class="glass-panel rounded-[2.5rem] mb-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-adaptive overflow-hidden relative">
                
                <div class="flex-1 p-8 flex flex-col justify-start relative z-10">
                    <p class="ds-kpi-label mb-4">Volume de Lojas Analisadas</p>
                    <h3 id="kp-lojas" class="ds-kpi-value text-4xl text-glow">0</h3>
                </div>
                
                <div class="flex-1 p-8 flex flex-col justify-start relative neon-accent z-10">
                    <p class="ds-kpi-label mb-4 text-[#685BC7]">Aparelho com Maior Capilaridade</p>
                    <h3 id="kp-cap" class="ds-kpi-value text-2xl text-glow-accent truncate">-</h3>
                    <div class="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#685BC7] to-transparent opacity-50"></div>
                </div>
                
                <div class="flex-1 p-8 flex flex-col justify-start relative z-10">
                    <p class="ds-kpi-label mb-4">Aparelhos Únicos Identificados</p>
                    <h3 id="kp-mod" class="ds-kpi-value text-4xl">0</h3>
                </div>
            </div>

            <div class="glass-panel p-4 md:p-6 rounded-[2.5rem] flex flex-col" style="height: calc(100vh - 280px); min-height: 500px;">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 shrink-0">
                    <h4 class="ds-chart-title">Matriz de Execução e Presença</h4>
                    
                    <div class="flex bg-[var(--input-bg)] p-1 rounded-2xl border border-[var(--glass-border)]">
                        <button id="mode-store" class="px-5 py-2 text-[8px] font-bold uppercase tracking-[0.1em] rounded-xl bg-[#685BC7] text-white shadow-lg transition-all duration-300">
                            Visão por Loja
                        </button>
                        <button id="mode-device" class="px-5 py-2 text-[8px] font-bold uppercase tracking-[0.1em] rounded-xl text-adaptive-strong hover:text-adaptive transition-all duration-300">
                            Visão por Aparelho
                        </button>
                    </div>
                </div>
                
                <div class="overflow-auto w-full flex-1 border border-[var(--glass-border)] rounded-2xl custom-scrollbar relative bg-[var(--table-wrapper-bg)]">
                    <table id="matrix-table" class="w-full text-left border-collapse"></table>
                </div>
            </div>
        </div>
    `;
};

let currentMode = 'store';

export const renderPositivacao = (data) => {
    const table = document.getElementById('matrix-table');
    if (!table || !data.length) return;

    const aparelhos = [...new Set(data.map(d => d.aparelho))].filter(x => x).sort();
    const lojas = [...new Set(data.map(d => d['store name']))].filter(x => x).sort();

    const presenceMap = {};
    data.forEach(d => {
        if(d['store name'] && d.aparelho) {
            const key = `${d['store name']}|${d.aparelho}`;
            presenceMap[key] = true;
        }
    });

    if (currentMode === 'store') {
        renderStoreMatrix(table, lojas, aparelhos, presenceMap);
    } else {
        renderDeviceMatrix(table, aparelhos, lojas, presenceMap);
    }

    calculateKPIs(lojas, aparelhos, presenceMap);
    setupToggles(data);
};

function renderStoreMatrix(table, rows, cols, map) {
    let html = `<thead><tr><th class="p-3 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)]">Ponto de Venda</th>`;
    cols.forEach(c => html += `<th class="p-3 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.1em] border-b table-border text-center min-w-[120px] sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)]">${c}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(r => {
        html += `<tr class="hover-row transition-colors duration-200"><td class="p-3 text-[10px] font-bold text-adaptive border-b table-border sticky left-0 z-10 bg-sticky whitespace-nowrap shadow-[2px_0_10px_rgba(0,0,0,0.02)]">${r}</td>`;
        cols.forEach(c => {
            const isPos = map[`${r}|${c}`];
            html += `<td class="p-3 border-b table-border text-center cursor-default">
                ${isPos ? '<span class="text-[#22c55e] text-xl text-glow-green">●</span>' : '<span class="text-adaptive-muted opacity-10 text-[10px]">―</span>'}
            </td>`;
        });
        html += `</tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

function renderDeviceMatrix(table, rows, cols, map) {
    let html = `<thead><tr><th class="p-3 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)]">Modelo do Aparelho</th>`;
    cols.forEach(c => html += `<th class="p-3 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.1em] border-b table-border text-center min-w-[120px] sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)]">${c}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(r => {
        html += `<tr class="hover-row transition-colors duration-200"><td class="p-3 text-[10px] font-bold text-adaptive border-b table-border sticky left-0 z-10 bg-sticky whitespace-nowrap shadow-[2px_0_10px_rgba(0,0,0,0.02)]">${r}</td>`;
        cols.forEach(c => {
            const isPos = map[`${c}|${r}`];
            html += `<td class="p-3 border-b table-border text-center cursor-default">
                ${isPos ? '<span class="text-[#22c55e] text-xl text-glow-green">●</span>' : '<span class="text-adaptive-muted opacity-10 text-[10px]">―</span>'}
            </td>`;
        });
        html += `</tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

function calculateKPIs(lojas, aparelhos, map) {
    document.getElementById('kp-lojas').innerText = lojas.length;
    document.getElementById('kp-mod').innerText = aparelhos.length;

    const capMap = {};
    Object.keys(map).forEach(key => {
        const dev = key.split('|')[1];
        capMap[dev] = (capMap[dev] || 0) + 1;
    });
    
    const sortedDevs = Object.entries(capMap).sort((a,b) => b[1]-a[1]);
    const topDev = sortedDevs[0];

    document.getElementById('kp-cap').innerHTML = topDev 
        ? `${topDev[0]} <span class="ds-helper-text text-adaptive-muted ml-2 block md:inline">(${topDev[1]} Lojas)</span>` 
        : '-';
}

function setupToggles(data) {
    const btnStore = document.getElementById('mode-store');
    const btnDevice = document.getElementById('mode-device');

    const setActive = (btn) => {
        btn.classList.add('bg-[#685BC7]', 'text-white', 'shadow-lg');
        btn.classList.remove('text-adaptive-strong', 'hover:text-adaptive', 'bg-transparent');
    };

    const setInactive = (btn) => {
        btn.classList.remove('bg-[#685BC7]', 'text-white', 'shadow-lg');
        btn.classList.add('text-adaptive-strong', 'hover:text-adaptive', 'bg-transparent');
    };

    if (currentMode === 'store') {
        setActive(btnStore);
        setInactive(btnDevice);
    } else {
        setActive(btnDevice);
        setInactive(btnStore);
    }

    btnStore.onclick = () => {
        if(currentMode === 'store') return;
        currentMode = 'store';
        setActive(btnStore);
        setInactive(btnDevice);
        renderPositivacao(data);
    };

    btnDevice.onclick = () => {
        if(currentMode === 'device') return;
        currentMode = 'device';
        setActive(btnDevice);
        setInactive(btnStore);
        renderPositivacao(data);
    };
}