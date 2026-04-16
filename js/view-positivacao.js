// js/view-positivacao.js
import { appData } from './services/dataManager.js';

export const getPositivacaoHTML = () => {
    return `
        <style>
            #view-positivacao-wrapper { font-family: 'Archivo', sans-serif; }
            
            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-adaptive-strong { color: var(--text-muted-strong); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .text-glow-accent { text-shadow: var(--glow-accent); }
            .text-glow-green { text-shadow: var(--glow-green); }
            .neon-accent { background: var(--neon-bg); }
            .divide-adaptive > div { border-color: var(--glass-border); }
            
            .table-border { border-color: var(--glass-border); }
            .bg-sticky { background-color: var(--bg-sticky); backdrop-filter: blur(10px); }
            .hover-row:hover td { background-color: var(--hover-table); }

            #matrix-table { transition: opacity 0.3s ease; }
            
            /* Seletor de Modo de Cobertura */
            .coverage-mode-selector {
                display: flex;
                background: var(--input-bg);
                padding: 4px;
                border-radius: 12px;
                border: 1px solid var(--glass-border);
                gap: 4px;
            }
            
            .coverage-mode-btn {
                padding: 6px 14px;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
                background: transparent;
            }
            
            body.dark .coverage-mode-btn {
                color: rgba(255, 255, 255, 0.5);
            }
            
            body:not(.dark) .coverage-mode-btn {
                color: rgba(0, 0, 0, 0.5);
            }
            
            .coverage-mode-btn.active {
                background: #685BC7 !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(104, 91, 199, 0.3);
            }
            
            .coverage-mode-btn:hover:not(.active) {
                background: rgba(104, 91, 199, 0.1);
            }
            
            /* Barra de Progresso de Cobertura */
            .coverage-bar {
                height: 8px;
                background: var(--glass-border);
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }
            
            .coverage-bar-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .coverage-excellent { background: linear-gradient(90deg, #22c55e, #16a34a); }
            .coverage-good { background: linear-gradient(90deg, #8b5cf6, #685BC7); }
            .coverage-medium { background: linear-gradient(90deg, #f59e0b, #d97706); }
            .coverage-low { background: linear-gradient(90deg, #ef4444, #dc2626); }

            /* Loading States */
            .skeleton-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite; }
            @keyframes skeleton-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            
            .table-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 200px;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--glass-border);
                border-top-color: #685BC7;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            @keyframes smoothEntrance {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .anim-cascade { opacity: 0; animation: smoothEntrance 0.3s ease-in-out forwards; }
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
        </style>

        <div id="view-positivacao-wrapper" class="pb-10">
            <div class="anim-cascade delay-1 glass-panel rounded-[2.5rem] mb-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-adaptive overflow-hidden relative">
                
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

            <div class="anim-cascade delay-2 glass-panel p-6 md:p-8 rounded-[2.5rem] flex flex-col mb-8 relative z-10">
                <div class="mb-6 shrink-0">
                    <h4 class="ds-chart-title">Distribuição Total por Modelo</h4>
                </div>
                
                <div class="overflow-auto w-full border border-[var(--glass-border)] rounded-2xl custom-scrollbar relative bg-[var(--table-wrapper-bg)] max-h-[500px]">
                    <table id="product-table" class="w-full text-left border-collapse"></table>
                </div>
            </div>

            <div class="anim-cascade delay-3 glass-panel p-6 md:p-8 rounded-[2.5rem] flex flex-col mb-8 relative z-10">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 shrink-0">
                    <div>
                        <h4 class="ds-chart-title mb-2">Taxa de Cobertura por Linha de Produto</h4>
                        <p class="text-[9px] font-semibold uppercase tracking-wider text-adaptive-muted">Análise de distribuição e presença</p>
                    </div>
                    
                    <div class="coverage-mode-selector">
                        <button id="coverage-mode-rede" class="coverage-mode-btn active">Por Rede</button>
                        <button id="coverage-mode-shopping" class="coverage-mode-btn">Por Tipo de Loja</button>
                    </div>
                </div>
                
                <div id="coverage-container" class="overflow-auto w-full border border-[var(--glass-border)] rounded-2xl custom-scrollbar relative bg-[var(--table-wrapper-bg)] max-h-[600px]">
                    <!-- Conteúdo dinâmico será inserido aqui -->
                </div>
            </div>

            <div class="anim-cascade delay-3 glass-panel p-6 md:p-8 rounded-[2.5rem] flex flex-col relative z-10">
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
                
                <div class="overflow-auto w-full border border-[var(--glass-border)] rounded-2xl custom-scrollbar relative bg-[var(--table-wrapper-bg)] max-h-[800px]">
                    <table id="matrix-table" class="w-full text-left border-collapse"></table>
                </div>
            </div>
        </div>
    `;
};

// Estado da view
let currentMode = 'store';
let unsubscribeData = null;
let currentRenderToken = 0;
let coverageMode = 'rede'; // Estado do seletor de cobertura (rede/shopping/loja)

// Helper para aplicar fade suave nos KPIs
function updateKPIWithFade(elementId, newContent, isHTML = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    // Fade out
    el.classList.add('kpi-fade-out');
    
    setTimeout(() => {
        // Atualiza o conteúdo
        if (isHTML) {
            el.innerHTML = newContent;
        } else {
            el.innerText = newContent;
        }
        
        // Remove fade-out e adiciona fade-in
        el.classList.remove('kpi-fade-out');
        el.classList.add('kpi-fade-in');
        
        // Remove a classe de fade-in após a animação
        setTimeout(() => {
            el.classList.remove('kpi-fade-in');
        }, 200);
    }, 150);
}

export const renderPositivacao = () => {
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

    const switchMatrixWithTransition = () => {
        const matrixTable = document.getElementById('matrix-table');
        if (matrixTable) {
            matrixTable.style.opacity = 0;
            setTimeout(() => { matrixTable.style.opacity = 1; }, 300);
        }
    };

    if (btnStore && btnDevice) {
        btnStore.onclick = () => {
            if (currentMode === 'store') return;
            currentMode = 'store';
            setActive(btnStore); setInactive(btnDevice);
            switchMatrixWithTransition();
            executeRenderLogic();
        };

        btnDevice.onclick = () => {
            if (currentMode === 'device') return;
            currentMode = 'device';
            setActive(btnDevice); setInactive(btnStore);
            switchMatrixWithTransition();
            executeRenderLogic();
        };

        if (currentMode === 'store') { setActive(btnStore); setInactive(btnDevice); }
        else { setActive(btnDevice); setInactive(btnStore); }
    }

    // Configuração do Seletor de Cobertura
    const btnCoverageRede = document.getElementById('coverage-mode-rede');
    const btnCoverageShopping = document.getElementById('coverage-mode-shopping');

    if (btnCoverageRede && btnCoverageShopping) {
        btnCoverageRede.onclick = () => {
            if (coverageMode === 'rede') return;
            coverageMode = 'rede';
            btnCoverageRede.classList.add('active');
            btnCoverageShopping.classList.remove('active');
            executeRenderLogic();
        };

        btnCoverageShopping.onclick = () => {
            if (coverageMode === 'shopping') return;
            coverageMode = 'shopping';
            btnCoverageShopping.classList.add('active');
            btnCoverageRede.classList.remove('active');
            executeRenderLogic();
        };
    }

    // Conecta ao DataManager — reage a mudanças de filtro
    if (unsubscribeData) unsubscribeData();
    unsubscribeData = appData.subscribe(async () => {
        await executeRenderLogic();
    });

    executeRenderLogic();
};

async function executeRenderLogic() {
    // Anticolisão: mesmo padrão da overview
    const renderToken = ++currentRenderToken;

    const matrixTable = document.getElementById('matrix-table');
    const productTable = document.getElementById('product-table');
    if (!matrixTable) return;

    // Mostra loading nos KPIs com fade
    const kpiSpinner = '<div class="flex items-center justify-center"><div class="kpi-spinner"></div></div>';
    updateKPIWithFade('kp-lojas', kpiSpinner, true);
    updateKPIWithFade('kp-cap', kpiSpinner, true);
    updateKPIWithFade('kp-mod', kpiSpinner, true);

    // Mostra spinner nas tabelas
    matrixTable.innerHTML = `<tr><td class="p-8 text-center"><div class="table-loading"><div class="spinner"></div></div></td></tr>`;
    if (productTable) {
        productTable.innerHTML = `<tr><td class="p-8 text-center"><div class="table-loading"><div class="spinner"></div></div></td></tr>`;
    }

    try {
        const dbData = await appData.fetchPositivacaoRPC();

        // Anticolisão: descarta se um filtro mais recente já disparou
        if (renderToken !== currentRenderToken) return;

        // Segurança de DOM: usuário pode ter trocado de aba
        if (!document.getElementById('view-positivacao-wrapper')) return;

        // Falha de rede
        if (!dbData) {
            matrixTable.innerHTML = `<tr><td class="p-8 text-center text-adaptive-muted text-xs font-bold uppercase tracking-widest opacity-50">⚠️ Conexão interrompida. Clique em um filtro para reconectar.</td></tr>`;
            return;
        }

        const kpis    = dbData.kpis    || {};
        const produtos = dbData.produtos || [];
        const matriz  = dbData.matriz  || [];
        const coberturaRede = dbData.cobertura_linha_rede || [];
        const coberturaShopping = dbData.cobertura_linha_shopping || [];
        const coberturaLoja = dbData.cobertura_linha_loja || [];

        // Sem dados para os filtros aplicados
        if (!kpis.total_lojas || kpis.total_lojas === 0) {
            matrixTable.innerHTML = `<tr><td class="p-8 text-center opacity-50 text-adaptive">Nenhum dado encontrado para os filtros atuais.</td></tr>`;
            if (productTable) productTable.innerHTML = '';
            const coverageContainer = document.getElementById('coverage-container');
            if (coverageContainer) coverageContainer.innerHTML = '';
            updateKPIWithFade('kp-lojas', '0');
            updateKPIWithFade('kp-mod', '0');
            updateKPIWithFade('kp-cap', '-');
            return;
        }

        // KPIs
        updateKPIWithFade('kp-lojas', kpis.total_lojas.toString());
        updateKPIWithFade('kp-mod', kpis.total_aparelhos.toString());
        updateKPIWithFade('kp-cap', kpis.top_capilaridade
            ? `${kpis.top_capilaridade} <span class="ds-helper-text text-adaptive-muted ml-2 block md:inline">(${kpis.top_capilaridade_lojas} Lojas)</span>`
            : '-', true);

        // Tabela de produtos
        renderProductTable(productTable, produtos);
        
        // Tabela de cobertura
        renderCoverageTable(coberturaRede, coberturaShopping, coberturaLoja);

        // Monta o mapa de presença para a matriz
        const presenceMap = {};
        matriz.forEach(row => {
            presenceMap[`${row.store_name}|${row.aparelho}`] = true;
        });

        const lojas     = [...new Set(matriz.map(r => r.store_name))].filter(Boolean).sort();
        const aparelhos = [...new Set(matriz.map(r => r.aparelho))].filter(Boolean).sort();

        if (currentMode === 'store') {
            renderStoreMatrix(matrixTable, lojas, aparelhos, presenceMap);
        } else {
            renderDeviceMatrix(matrixTable, aparelhos, lojas, presenceMap);
        }

    } catch (e) {
        console.error("Crash interceptado na renderização da Positivação:", e);
    }
}

// ==========================================
// TABELA DE PRODUTOS
// ==========================================
function renderProductTable(table, produtos) {
    if (!table) return;

    let html = `
        <thead>
            <tr>
                <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)] w-1/4">Linha de Produto</th>
                <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-1/4">Aparelho</th>
                <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border text-center sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-1/4">Ativos (Unidades)</th>
                <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border text-center sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-1/4">Presença (PDVs)</th>
            </tr>
        </thead>
        <tbody>
    `;

    (produtos || []).forEach(p => {
        html += `
            <tr class="hover-row transition-colors duration-200">
                <td class="p-4 text-[11px] font-semibold text-adaptive-strong border-b table-border sticky left-0 z-10 bg-sticky whitespace-nowrap shadow-[2px_0_10px_rgba(0,0,0,0.02)]">${p.linha_de_produto || '-'}</td>
                <td class="p-4 text-[12px] font-bold text-adaptive border-b table-border whitespace-nowrap">${p.aparelho || '-'}</td>
                <td class="p-4 text-[13px] font-black text-[#685BC7] border-b table-border text-center font-numbers bg-[#685BC7]/5">${p.qtd_unidades ?? 0}</td>
                <td class="p-4 text-[13px] font-black text-[#8b5cf6] border-b table-border text-center font-numbers">${p.qtd_lojas ?? 0}</td>
            </tr>
        `;
    });

    html += `</tbody>`;
    table.innerHTML = html;
}

// ==========================================
// MATRIZES DE EXECUÇÃO
// ==========================================
function renderStoreMatrix(table, rows, cols, map) {
    let html = `<thead><tr>
        <th class="p-3 md:p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)] min-w-[110px] max-w-[130px] md:min-w-auto md:max-w-none whitespace-normal md:whitespace-nowrap leading-tight">Ponto de Venda</th>`;
    cols.forEach(c => html += `<th class="p-3 md:p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.1em] border-b table-border text-center min-w-[70px] md:min-w-[120px] sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)]">${c}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(r => {
        html += `<tr class="hover-row transition-colors duration-200">
            <td class="p-3 md:p-4 text-[9.5px] md:text-[11px] font-bold text-adaptive border-b table-border sticky left-0 z-10 bg-sticky shadow-[2px_0_10px_rgba(0,0,0,0.02)] min-w-[110px] max-w-[130px] md:max-w-none whitespace-normal md:whitespace-nowrap leading-tight break-words">${r}</td>`;
        cols.forEach(c => {
            const isPos = map[`${r}|${c}`];
            html += `<td class="p-3 md:p-4 border-b table-border text-center cursor-default">
                ${isPos
                    ? '<span class="text-[#22c55e] text-xl text-glow-green drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">●</span>'
                    : '<span class="text-adaptive-muted opacity-10 text-[10px]">―</span>'}
            </td>`;
        });
        html += `</tr>`;
    });

    table.innerHTML = html + `</tbody>`;
}

function renderDeviceMatrix(table, rows, cols, map) {
    let html = `<thead><tr>
        <th class="p-3 md:p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)] min-w-[110px] max-w-[130px] md:min-w-auto md:max-w-none whitespace-normal md:whitespace-nowrap leading-tight">Modelo do Aparelho</th>`;
    cols.forEach(c => html += `<th class="p-3 md:p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.1em] border-b table-border text-center min-w-[70px] md:min-w-[120px] sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)]">${c}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(r => {
        html += `<tr class="hover-row transition-colors duration-200">
            <td class="p-3 md:p-4 text-[9.5px] md:text-[11px] font-bold text-adaptive border-b table-border sticky left-0 z-10 bg-sticky shadow-[2px_0_10px_rgba(0,0,0,0.02)] min-w-[110px] max-w-[130px] md:max-w-none whitespace-normal md:whitespace-nowrap leading-tight break-words">${r}</td>`;
        cols.forEach(c => {
            const isPos = map[`${c}|${r}`];
            html += `<td class="p-3 md:p-4 border-b table-border text-center cursor-default">
                ${isPos
                    ? '<span class="text-[#22c55e] text-xl text-glow-green drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">●</span>'
                    : '<span class="text-adaptive-muted opacity-10 text-[10px]">―</span>'}
            </td>`;
        });
        html += `</tr>`;
    });

    table.innerHTML = html + `</tbody>`;
}

// ==========================================
// TABELA DE COBERTURA
// ==========================================
function renderCoverageTable(coberturaRede, coberturaShopping, coberturaLoja) {
    const container = document.getElementById('coverage-container');
    if (!container) return;

    let html = '';

    if (coverageMode === 'rede') {
        // Agrupa por linha de produto
        const linhasMap = {};
        coberturaRede.forEach(item => {
            if (!linhasMap[item.linha_de_produto]) {
                linhasMap[item.linha_de_produto] = [];
            }
            linhasMap[item.linha_de_produto].push(item);
        });

        if (Object.keys(linhasMap).length === 0) {
            container.innerHTML = '<div class="p-8 text-center opacity-50 text-adaptive">Nenhum dado de cobertura disponível</div>';
            return;
        }

        html = `
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)] min-w-[150px]">Linha de Produto</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-w-[120px]">Rede</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border text-center sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-[100px]">Lojas com Linha</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border text-center sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-[100px]">Total Lojas</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-w-[200px]">Cobertura</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.keys(linhasMap).sort().forEach(linha => {
            const redes = linhasMap[linha].sort((a, b) => b.percentual_cobertura - a.percentual_cobertura);
            
            redes.forEach((item, idx) => {
                const perc = item.percentual_cobertura || 0;
                let coverageClass = 'coverage-low';
                if (perc >= 80) coverageClass = 'coverage-excellent';
                else if (perc >= 60) coverageClass = 'coverage-good';
                else if (perc >= 40) coverageClass = 'coverage-medium';

                html += `
                    <tr class="hover-row transition-colors duration-200">
                        ${idx === 0 ? `<td rowspan="${redes.length}" class="p-4 text-[11px] font-bold text-adaptive border-b table-border sticky left-0 z-10 bg-sticky shadow-[2px_0_10px_rgba(0,0,0,0.02)] align-top">${linha}</td>` : ''}
                        <td class="p-4 text-[11px] font-semibold text-adaptive-strong border-b table-border">${item.rede}</td>
                        <td class="p-4 text-[12px] font-black text-[#685BC7] border-b table-border text-center font-numbers">${item.lojas_com_linha}</td>
                        <td class="p-4 text-[11px] font-semibold text-adaptive-muted border-b table-border text-center font-numbers">${item.total_lojas_rede}</td>
                        <td class="p-4 border-b table-border">
                            <div class="flex items-center gap-3">
                                <div class="coverage-bar flex-1">
                                    <div class="coverage-bar-fill ${coverageClass}" style="width: ${perc}%"></div>
                                </div>
                                <span class="text-[12px] font-black font-numbers text-adaptive min-w-[45px] text-right">${perc.toFixed(1).replace('.', ',')}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });

        html += `</tbody></table>`;

    } else {
        // Modo Shopping (Tipo de Loja)
        // Agrupa por linha de produto
        const linhasMap = {};
        coberturaShopping.forEach(item => {
            if (!linhasMap[item.linha_de_produto]) {
                linhasMap[item.linha_de_produto] = [];
            }
            linhasMap[item.linha_de_produto].push(item);
        });

        if (Object.keys(linhasMap).length === 0) {
            container.innerHTML = '<div class="p-8 text-center opacity-50 text-adaptive">Nenhum dado de cobertura disponível</div>';
            return;
        }

        html = `
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 left-0 z-30 bg-sticky shadow-[2px_2px_10px_rgba(0,0,0,0.05)] min-w-[150px]">Linha de Produto</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-w-[120px]">Tipo de Loja</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border text-center sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-[100px]">Lojas com Linha</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border text-center sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-[100px]">Total Lojas</th>
                        <th class="p-4 text-[9px] font-black text-adaptive-muted uppercase tracking-[0.2em] border-b table-border sticky top-0 z-20 bg-sticky shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-w-[200px]">Cobertura</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.keys(linhasMap).sort().forEach(linha => {
            const tipos = linhasMap[linha].sort((a, b) => b.percentual_cobertura - a.percentual_cobertura);
            
            tipos.forEach((item, idx) => {
                const perc = item.percentual_cobertura || 0;
                let coverageClass = 'coverage-low';
                if (perc >= 80) coverageClass = 'coverage-excellent';
                else if (perc >= 60) coverageClass = 'coverage-good';
                else if (perc >= 40) coverageClass = 'coverage-medium';

                html += `
                    <tr class="hover-row transition-colors duration-200">
                        ${idx === 0 ? `<td rowspan="${tipos.length}" class="p-4 text-[11px] font-bold text-adaptive border-b table-border sticky left-0 z-10 bg-sticky shadow-[2px_0_10px_rgba(0,0,0,0.02)] align-top">${linha}</td>` : ''}
                        <td class="p-4 text-[11px] font-semibold text-adaptive-strong border-b table-border">${item.tipo}</td>
                        <td class="p-4 text-[12px] font-black text-[#685BC7] border-b table-border text-center font-numbers">${item.lojas_com_linha}</td>
                        <td class="p-4 text-[11px] font-semibold text-adaptive-muted border-b table-border text-center font-numbers">${item.total_lojas_tipo}</td>
                        <td class="p-4 border-b table-border">
                            <div class="flex items-center gap-3">
                                <div class="coverage-bar flex-1">
                                    <div class="coverage-bar-fill ${coverageClass}" style="width: ${perc}%"></div>
                                </div>
                                <span class="text-[12px] font-black font-numbers text-adaptive min-w-[45px] text-right">${perc.toFixed(1).replace('.', ',')}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });

        html += `</tbody></table>`;
    }

    container.innerHTML = html;
}
