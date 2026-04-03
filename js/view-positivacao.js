// js/view-positivacao.js

export const getPositivacaoHTML = () => {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div class="card p-6 rounded-[2rem] border"><p class="text-muted text-[9px] font-black uppercase tracking-widest">Lojas Analisadas</p><h3 id="kp-lojas" class="text-2xl md:text-3xl font-bold mt-2 font-numbers">0</h3></div>
            
            <div class="card p-6 rounded-[2rem] border border-b-8 border-r-0 md:border-b-0 md:border-r-8 border-[#685BC7] relative overflow-hidden group">
                <p class="text-[#685BC7] text-[9px] font-black uppercase tracking-widest relative z-10">Top Capilaridade</p>
                <h3 id="kp-cap" class="text-xl md:text-2xl font-bold mt-2 truncate font-numbers relative z-10">-</h3>
                <div class="absolute right-0 top-0 opacity-5 text-8xl font-black -mt-4 -mr-4 pointer-events-none group-hover:scale-110 transition-transform">🏆</div>
            </div>
            
            <div class="card p-6 rounded-[2rem] border"><p class="text-muted text-[9px] font-black uppercase tracking-widest">Modelos Únicos</p><h3 id="kp-mod" class="text-2xl md:text-3xl font-bold mt-2 font-numbers">0</h3></div>
        </div>

        <div class="card p-6 md:p-10 rounded-[2.5rem] border flex flex-col" style="height: calc(100vh - 280px); min-height: 400px;">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <h4 class="text-sm font-black text-muted uppercase tracking-widest">Matriz de Execução</h4>
                <div class="flex bg-[#131417] p-1 rounded-xl border border-[#2d3139] shadow-inner">
                    <button id="mode-store" class="px-4 py-2 text-[10px] font-bold uppercase rounded-lg bg-[#685BC7] text-white transition-all">Por Loja</button>
                    <button id="mode-device" class="px-4 py-2 text-[10px] font-bold uppercase rounded-lg text-gray-500 hover:text-white transition-all">Por Aparelho</button>
                </div>
            </div>
            
            <div class="overflow-auto w-full flex-1 border border-[#2d3139] rounded-xl custom-scrollbar relative">
                <table id="matrix-table" class="w-full text-left border-collapse">
                    </table>
            </div>
        </div>
    `;
};

let currentMode = 'store'; // 'store' ou 'device'

export const renderPositivacao = (data) => {
    const table = document.getElementById('matrix-table');
    if (!table || !data.length) return;

    const aparelhos = [...new Set(data.map(d => d.aparelho))].filter(x => x).sort();
    const lojas = [...new Set(data.map(d => d['store name']))].filter(x => x).sort();

    // Mapeamento de Presença (Binary Map)
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
    const isDark = document.body.classList.contains('dark');
    const bgHeader = isDark ? 'bg-[#1c1e22]' : 'bg-white';
    const borderColor = isDark ? 'border-[#2d3139]' : 'border-gray-200';

    let html = `<thead><tr><th class="p-4 text-[10px] font-black text-muted uppercase border-b ${borderColor} sticky top-0 left-0 z-30 ${bgHeader} shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">Loja / PDV</th>`;
    cols.forEach(c => html += `<th class="p-4 text-[9px] font-black text-muted uppercase border-b ${borderColor} text-center min-w-[120px] sticky top-0 z-20 ${bgHeader} shadow-[0_2px_5px_rgba(0,0,0,0.05)]">${c}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(r => {
        html += `<tr><td class="p-4 text-xs font-bold border-b ${borderColor} sticky left-0 z-10 ${bgHeader} whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">${r}</td>`;
        cols.forEach(c => {
            const isPos = map[`${r}|${c}`];
            html += `<td class="p-4 border-b ${borderColor} text-center transition-colors hover:bg-gray-500/10 cursor-default">
                ${isPos ? '<span class="text-green-500 text-sm md:text-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">●</span>' : '<span class="text-gray-500/20 text-xs md:text-sm">―</span>'}
            </td>`;
        });
        html += `</tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

function renderDeviceMatrix(table, rows, cols, map) {
    const isDark = document.body.classList.contains('dark');
    const bgHeader = isDark ? 'bg-[#1c1e22]' : 'bg-white';
    const borderColor = isDark ? 'border-[#2d3139]' : 'border-gray-200';

    let html = `<thead><tr><th class="p-4 text-[10px] font-black text-muted uppercase border-b ${borderColor} sticky top-0 left-0 z-30 ${bgHeader} shadow-[2px_2px_5px_rgba(0,0,0,0.1)]">Modelo do Aparelho</th>`;
    cols.forEach(c => html += `<th class="p-4 text-[9px] font-black text-muted uppercase border-b ${borderColor} text-center min-w-[150px] sticky top-0 z-20 ${bgHeader} shadow-[0_2px_5px_rgba(0,0,0,0.05)]">${c}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(r => {
        html += `<tr><td class="p-4 text-xs font-bold border-b ${borderColor} sticky left-0 z-10 ${bgHeader} whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">${r}</td>`;
        cols.forEach(c => {
            const isPos = map[`${c}|${r}`];
            html += `<td class="p-4 border-b ${borderColor} text-center transition-colors hover:bg-gray-500/10 cursor-default">
                ${isPos ? '<span class="text-green-500 text-sm md:text-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">●</span>' : '<span class="text-gray-500/20 text-xs md:text-sm">―</span>'}
            </td>`;
        });
        html += `</tr>`;
    });
    table.innerHTML = html + `</tbody>`;
}

function calculateKPIs(lojas, aparelhos, map) {
    document.getElementById('kp-lojas').innerText = lojas.length;
    document.getElementById('kp-mod').innerText = aparelhos.length;

    // Top Capilaridade
    const capMap = {};
    Object.keys(map).forEach(key => {
        const dev = key.split('|')[1];
        capMap[dev] = (capMap[dev] || 0) + 1;
    });
    
    const sortedDevs = Object.entries(capMap).sort((a,b) => b[1]-a[1]);
    const topDev = sortedDevs[0];

    // Exibe o nome do aparelho e em quantas lojas ele está
    document.getElementById('kp-cap').innerHTML = topDev 
        ? `${topDev[0]} <span class="text-[10px] font-normal text-muted tracking-wide ml-1 block md:inline">(${topDev[1]} Lojas)</span>` 
        : '-';
}

function setupToggles(data) {
    const btnStore = document.getElementById('mode-store');
    const btnDevice = document.getElementById('mode-device');

    btnStore.onclick = () => {
        if(currentMode === 'store') return;
        currentMode = 'store';
        btnStore.classList.add('bg-[#685BC7]', 'text-white'); btnStore.classList.remove('text-gray-500');
        btnDevice.classList.remove('bg-[#685BC7]', 'text-white'); btnDevice.classList.add('text-gray-500');
        renderPositivacao(data);
    };

    btnDevice.onclick = () => {
        if(currentMode === 'device') return;
        currentMode = 'device';
        btnDevice.classList.add('bg-[#685BC7]', 'text-white'); btnDevice.classList.remove('text-gray-500');
        btnStore.classList.remove('bg-[#685BC7]', 'text-white'); btnStore.classList.add('text-gray-500');
        renderPositivacao(data);
    };
}