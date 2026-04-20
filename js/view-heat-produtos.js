// js/view-heat-produtos.js
import { appData } from './services/dataManager.js';

Chart.register(ChartDataLabels);

let chartInstances = {};
let currentProduct = null;
let unsubscribeData = null;
let currentRenderToken = 0;
let peakSlideInterval = null; // Intervalo para alternar entre picos

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

export const getHeatProdutosHTML = () => {
    return `
        <style>
            #view-heatmap-wrapper { font-family: 'Archivo', sans-serif; }
            #html-heatmap-container { transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease; will-change: filter, opacity; }
            .data-loading { filter: blur(12px); opacity: 0.3; pointer-events: none; }
            
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
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .anim-cascade { opacity: 0; animation: smoothEntrance 0.3s ease-in-out forwards; }
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .delay-4 { animation-delay: 0.4s; }

            /* Loading States */
            .skeleton-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite; }
            @keyframes skeleton-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            
            .chart-loading {
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
            
            /* Animação de Slide para KPI Alternado */
            .kpi-slide-container {
                position: relative;
                overflow: hidden;
                min-height: 80px;
            }
            
            .kpi-slide-item {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease;
            }
            
            .kpi-slide-item.active {
                transform: translateY(0);
                opacity: 1;
                position: relative;
            }
            
            .kpi-slide-item.slide-out-up {
                transform: translateY(-100%);
                opacity: 0;
            }
            
            .kpi-slide-item.slide-in-down {
                transform: translateY(100%);
                opacity: 0;
            }
            
            /* Filtro Flutuante */
            #hp-floating-filter {
                position: fixed;
                left: 0;
                right: 0;
                z-index: 50;
                padding: 0 24px;
                transform: translateY(-100%);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                opacity: 0;
                pointer-events: none;
                will-change: top;
            }
            
            #hp-floating-filter.visible {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }
            
            /* Posição dinâmica calculada via JS */
            
            #hp-floating-filter-inner {
                max-width: 500px;
                margin: 0 auto;
                padding: 16px 24px;
                border-radius: 20px;
                backdrop-filter: blur(24px) saturate(180%);
                -webkit-backdrop-filter: blur(24px) saturate(180%);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            body.dark #hp-floating-filter-inner {
                background: rgba(15, 16, 19, 0.72);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
            }
            
            body:not(.dark) #hp-floating-filter-inner {
                background: rgba(255, 255, 255, 0.72);
                border: 1px solid rgba(255, 255, 255, 0.9);
                box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255,255,255,0.5) inset;
            }
            
            #hp-floating-select {
                width: 100%;
                padding: 12px 16px;
                border-radius: 12px;
                outline: none;
                transition: all 0.3s ease;
                cursor: pointer;
                backdrop-filter: blur(12px);
                appearance: none;
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 1.1em;
                padding-right: 40px;
                font-family: 'Archivo', sans-serif;
                font-weight: 300;
                font-stretch: 110%;
                font-size: 12px;
            }
            
            body.dark #hp-floating-select {
                background-color: rgba(0, 0, 0, 0.45);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #ffffff;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            }
            
            body:not(.dark) #hp-floating-select {
                background-color: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(0, 0, 0, 0.1);
                color: #131417;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%230f172a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            }
            
            #hp-floating-select:focus {
                border-color: #685BC7;
            }

            body.dark #hp-master-select {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            }
            
            body:not(.dark) #hp-master-select {
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%230f172a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
            }
        </style>

        <!-- Filtro Flutuante -->
        <div id="hp-floating-filter" class="filters-closed">
            <div id="hp-floating-filter-inner">
                <label class="ds-filter-label mb-2 block text-center" style="font-family:'Archivo',sans-serif; font-weight:300; font-stretch:110%;">Modelo Alvo</label>
                <select id="hp-floating-select">
                    <option value="">VISÃO MACRO (TODOS)</option>
                </select>
            </div>
        </div>

        <div id="view-heatmap-wrapper" class="pb-10">
            <div class="anim-cascade delay-1 glass-panel p-6 md:p-8 rounded-[2rem] mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
                <div class="relative z-10">
                    <h2 class="ds-title">Heatmap Operacional</h2>
                </div>
                <div class="w-full md:w-1/3 relative z-10">
                    <label class="ds-filter-label mb-2 block" style="font-family:'Archivo',sans-serif; font-weight:300; font-stretch:110%;">Modelo Alvo</label>
                    <select id="hp-master-select" class="w-full p-3 rounded-xl ds-filter-input input-adaptive focus:border-[#685BC7] outline-none transition-colors cursor-pointer backdrop-blur-md" style="font-family:'Archivo',sans-serif; font-weight:300; font-stretch:110%; font-size:12px; appearance:none; background-repeat:no-repeat; background-position:right 12px center; background-size:1.1em; padding-right:40px;">
                        <option value="">Carregando produtos...</option>
                    </select>
                </div>
            </div>

            <div class="anim-cascade delay-2 glass-panel rounded-[2rem] mb-8 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-adaptive overflow-hidden relative">
                <div class="w-full md:w-1/4 p-6 md:p-8 flex flex-col justify-start shrink-0">
                    <p class="ds-kpi-label mb-3">Interações Globais</p>
                    <h3 id="hp-k-vol" class="ds-kpi-value text-2xl md:text-3xl text-glow">0</h3>
                </div>
                <div class="w-full md:w-1/4 p-6 md:p-8 flex flex-col justify-start shrink-0 kpi-slide-container">
                    <!-- Item 1: Pico de Demanda -->
                    <div id="hp-peak-primary" class="kpi-slide-item active">
                        <p class="ds-kpi-label mb-3">Pico de Demanda</p>
                        <h3 id="hp-k-peak" class="ds-kpi-value text-2xl md:text-3xl leading-tight">-</h3>
                        <p id="hp-k-peak-sub" class="ds-helper-text text-adaptive-muted mt-2 opacity-60">-</p>
                    </div>
                    <!-- Item 2: Pico Secundário -->
                    <div id="hp-peak-secondary" class="kpi-slide-item slide-in-down">
                        <p class="ds-kpi-label mb-3">Pico Secundário</p>
                        <h3 id="hp-k-peak-sec" class="ds-kpi-value text-2xl md:text-3xl leading-tight">-</h3>
                        <p id="hp-k-peak-sec-sub" class="ds-helper-text text-adaptive-muted mt-2 opacity-60">-</p>
                    </div>
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

                <div id="hp-drilldown-overlay" class="absolute inset-0 z-20 flex flex-col p-8 md:p-12 opacity-0 pointer-events-none translate-y-8" style="background: rgba(18, 19, 23, 0.92); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);">
                    <div class="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
                        <div>
                            <h3 class="text-2xl font-black text-white leading-tight">Análise Detalhada</h3>
                            <p id="hp-drill-subtitle" class="text-xs font-bold text-[#685BC7] uppercase tracking-widest mt-1">-</p>
                        </div>
                        <button id="btn-close-drilldown" class="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-xl">
                            ← Voltar
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 class="text-sm font-black text-white/60 uppercase tracking-widest mb-4 pb-2 border-b border-white/10">Por Aparelho</h4>
                                <div id="hp-drill-list-produtos" class="space-y-2"></div>
                            </div>
                            <div>
                                <h4 class="text-sm font-black text-white/60 uppercase tracking-widest mb-4 pb-2 border-b border-white/10">Por Rede</h4>
                                <div id="hp-drill-list-redes" class="space-y-2"></div>
                            </div>
                        </div>
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

            <!-- Índice de Consistência - OCULTO TEMPORARIAMENTE -->
            <!--
            <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] mb-8">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h4 class="ds-chart-title mb-2">Índice de Consistência</h4>
                        <p class="text-xs text-adaptive-muted uppercase tracking-wider">Previsibilidade do comportamento por dia da semana</p>
                    </div>
                    <div class="flex items-center gap-4 px-6 py-3 glass-panel rounded-2xl">
                        <div class="text-center">
                            <p class="text-[8px] font-black uppercase tracking-widest text-adaptive-muted mb-1">Desvio Padrão</p>
                            <p id="hp-consistency-std" class="text-lg font-black text-adaptive font-numbers">-</p>
                        </div>
                        <div class="h-8 w-px bg-white/10"></div>
                        <div class="text-center">
                            <p class="text-[8px] font-black uppercase tracking-widest text-adaptive-muted mb-1">Coef. Variação</p>
                            <p id="hp-consistency-cv" class="text-lg font-black font-numbers">-</p>
                        </div>
                    </div>
                </div>
                <div class="chart-container" style="height: 300px;"><canvas id="hp-c-consistency"></canvas></div>
                <div class="mt-4 flex items-center justify-center gap-6 text-xs">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-green-500"></div>
                        <span class="text-adaptive-muted">Alta Consistência (CV &lt; 20%)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span class="text-adaptive-muted">Média Consistência (CV 20-40%)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <span class="text-adaptive-muted">Baixa Consistência (CV &gt; 40%)</span>
                    </div>
                </div>
            </div>
            -->
        </div>
    `;
};

export const destroyHeatProdutosCharts = () => {
    Object.keys(chartInstances).forEach(id => { if(chartInstances[id]) chartInstances[id].destroy(); });
    chartInstances = {};
    
    const tooltip = document.getElementById('hp-global-tooltip');
    if (tooltip) tooltip.remove();
    
    // Remove o filtro flutuante ao sair da view
    const floatingFilter = document.getElementById('hp-floating-filter');
    if (floatingFilter) {
        floatingFilter.classList.remove('visible');
    }
    
    // Remove listener de scroll
    const contentWrapper = document.getElementById('app-content-wrapper');
    if (contentWrapper) {
        contentWrapper.dataset.scrollListenerAttached = '';
    }
    
    // Limpa o intervalo de alternância de picos
    if (peakSlideInterval) {
        clearInterval(peakSlideInterval);
        peakSlideInterval = null;
    }

    if (unsubscribeData) {
        unsubscribeData();
        unsubscribeData = null;
    }

};

export const renderHeatProdutos = () => {
    const select = document.getElementById('hp-master-select');
    const floatingSelect = document.getElementById('hp-floating-select');
    const floatingFilter = document.getElementById('hp-floating-filter');
    const btnVoltar = document.getElementById('btn-close-drilldown');
    const contentWrapper = document.getElementById('app-content-wrapper');
    const filterBar = document.getElementById('filterbar-row');

    // Sincroniza os dois selects
    if (select && floatingSelect && !select.dataset.listenerAttached) {
        select.addEventListener('change', (e) => {
            currentProduct = e.target.value || null;
            floatingSelect.value = e.target.value;
            executeRenderLogic();
        });
        select.dataset.listenerAttached = "true";
    }

    if (floatingSelect && !floatingSelect.dataset.listenerAttached) {
        floatingSelect.addEventListener('change', (e) => {
            currentProduct = e.target.value || null;
            if (select) select.value = e.target.value;
            executeRenderLogic();
        });
        floatingSelect.dataset.listenerAttached = "true";
    }

    // Função para atualizar a posição do filtro flutuante baseado no estado dos filtros globais
    let positionRafId = null;
    
    const syncFloatingPosition = () => {
        if (!floatingFilter) return;
        const floatingUi = document.getElementById('floating-ui');
        if (floatingUi) {
            const uiRect = floatingUi.getBoundingClientRect();
            floatingFilter.style.top = (uiRect.bottom + 12) + 'px';
        }
    };

    // Loop contínuo durante transições para manter posição sincronizada
    const startPositionSync = () => {
        if (positionRafId) return;
        const startTime = performance.now();
        const duration = 500; // Cobre a duração da transição da barra
        
        const tick = (now) => {
            syncFloatingPosition();
            if (now - startTime < duration) {
                positionRafId = requestAnimationFrame(tick);
            } else {
                positionRafId = null;
            }
        };
        positionRafId = requestAnimationFrame(tick);
    };

    const updateFloatingFilterPosition = () => {
        if (!floatingFilter || !filterBar) return;
        
        const filtersOpen = filterBar.classList.contains('filters-open');
        
        if (filtersOpen) {
            floatingFilter.classList.remove('filters-closed');
            floatingFilter.classList.add('filters-open');
        } else {
            floatingFilter.classList.remove('filters-open');
            floatingFilter.classList.add('filters-closed');
        }

        syncFloatingPosition();
        startPositionSync();
    };

    // Observa mudanças no estado dos filtros globais
    if (filterBar && !filterBar.dataset.observerAttached) {
        const observer = new MutationObserver(updateFloatingFilterPosition);
        observer.observe(filterBar, { attributes: true, attributeFilter: ['class'] });
        filterBar.dataset.observerAttached = "true";
        
        // Atualiza a posição inicial
        syncFloatingPosition();
        updateFloatingFilterPosition();
    }

    // Controla a visibilidade do filtro flutuante baseado no scroll
    if (contentWrapper && floatingFilter && !contentWrapper.dataset.scrollListenerAttached) {
        let lastScrollTop = 0;
        const threshold = 200; // Pixels para ativar o filtro flutuante
        
        contentWrapper.addEventListener('scroll', () => {
            const scrollTop = contentWrapper.scrollTop;
            
            if (scrollTop > threshold) {
                floatingFilter.classList.add('visible');
            } else {
                floatingFilter.classList.remove('visible');
            }
            
            lastScrollTop = scrollTop;
        });
        
        contentWrapper.dataset.scrollListenerAttached = "true";
    }

    if(btnVoltar && !btnVoltar.dataset.listenerAttached) {
        btnVoltar.addEventListener('click', closeDrilldown);
        btnVoltar.dataset.listenerAttached = "true";
    }

    if (unsubscribeData) unsubscribeData();
    unsubscribeData = appData.subscribe(async () => {
        await executeRenderLogic();
    });

    executeRenderLogic();
};


async function executeRenderLogic() {
    const renderToken = ++currentRenderToken;
    
    const container = document.getElementById('html-heatmap-container');
    if (!container) return;

    // Mostra loading nos KPIs com fade
    const kpiSpinner = '<div class="flex items-center justify-center"><div class="kpi-spinner"></div></div>';
    updateKPIWithFade('hp-k-vol', kpiSpinner, true);
    updateKPIWithFade('hp-k-peak', kpiSpinner, true);
    updateKPIWithFade('hp-k-top', kpiSpinner, true);

    // Mostra spinner no heatmap
    container.innerHTML = '<div class="chart-loading"><div class="spinner"></div></div>';
    
    // Mostra spinner nos gráficos
    const chartContainers = ['hp-c-radar', 'hp-c-canal', 'hp-c-semana', 'hp-c-trend']; // 'hp-c-consistency' comentado
    chartContainers.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const chartContainer = canvas.parentElement;
            if (!chartContainer.querySelector('.spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                chartContainer.appendChild(spinner);
                canvas.style.display = 'none';
            }
        }
    });

    closeDrilldown();

    try {
        const dbData = await appData.fetchHeatmapRPC(currentProduct);

        if (renderToken !== currentRenderToken) return;
        if (!document.getElementById('view-heatmap-wrapper')) return;

        Object.keys(chartInstances).forEach(id => { if(chartInstances[id]) chartInstances[id].destroy(); });
        chartInstances = {};

        if (!dbData) {
            container.innerHTML = '<div class="p-10 text-center opacity-50 text-adaptive w-full">⚠️ Conexão interrompida. Clique em um filtro para reconectar.</div>';
            return;
        }

        const kpis = dbData.kpis || {};
        const aparelhos = dbData.aparelhos || [];
        const heatmap = dbData.heatmap || [];
        const heatmapDrill = dbData.heatmap_drill || [];
        const heatmapCat = dbData.heatmap_cat || [];
        const heatmapRede = dbData.heatmap_rede || [];
        const radarProd = dbData.radar_prod || [];
        const radarCat = dbData.radar_cat || [];
        const canal = dbData.canal || [];
        const semana = dbData.semana || [];
        const diaSemana = dbData.dia_semana || [];

        // Popula o select de aparelhos
        const select = document.getElementById('hp-master-select');
        const floatingSelect = document.getElementById('hp-floating-select');
        
        if (select && !select.dataset.populated) {
            select.innerHTML = '<option value="">VISÃO MACRO (TODOS)</option>';
            aparelhos.forEach(a => select.add(new Option(a, a)));
            select.value = currentProduct || '';
            select.dataset.populated = 'true';
        }
        
        // Sincroniza o select flutuante
        if (floatingSelect && !floatingSelect.dataset.populated) {
            floatingSelect.innerHTML = '<option value="">VISÃO MACRO (TODOS)</option>';
            aparelhos.forEach(a => floatingSelect.add(new Option(a, a)));
            floatingSelect.value = currentProduct || '';
            floatingSelect.dataset.populated = 'true';
        }

        // KPIs
        updateKPIWithFade('hp-k-vol', Math.round(kpis.total_sessions || 0).toLocaleString('pt-BR'));
        
        // Pico de Demanda (Principal)
        const peakPrimaryDay = kpis.peak_primary_day || '';
        const peakPrimaryHour = kpis.peak_primary_hour;
        const peakPrimaryTotal = kpis.peak_primary_total;
        
        if (peakPrimaryDay && peakPrimaryHour !== null && peakPrimaryHour !== undefined) {
            updateKPIWithFade('hp-k-peak', `${peakPrimaryDay}, ${peakPrimaryHour}h`);
            if (peakPrimaryTotal) {
                updateKPIWithFade('hp-k-peak-sub', `${Math.round(peakPrimaryTotal).toLocaleString('pt-BR')} interações`);
            }
        } else {
            updateKPIWithFade('hp-k-peak', '-');
            updateKPIWithFade('hp-k-peak-sub', '-');
        }
        
        // Pico Secundário
        const peakSecondaryDay = kpis.peak_secondary_day || '';
        const peakSecondaryHour = kpis.peak_secondary_hour;
        const peakSecondaryTotal = kpis.peak_secondary_total;
        
        if (peakSecondaryDay && peakSecondaryHour !== null && peakSecondaryHour !== undefined) {
            updateKPIWithFade('hp-k-peak-sec', `${peakSecondaryDay}, ${peakSecondaryHour}h`);
            if (peakSecondaryTotal) {
                updateKPIWithFade('hp-k-peak-sec-sub', `${Math.round(peakSecondaryTotal).toLocaleString('pt-BR')} interações`);
            }
        } else {
            updateKPIWithFade('hp-k-peak-sec', '-');
            updateKPIWithFade('hp-k-peak-sec-sub', '-');
        }
        
        // Inicia a alternância entre picos
        startPeakSlideshow(peakSecondaryDay && peakSecondaryHour !== null && peakSecondaryHour !== undefined);
        
        updateKPIWithFade('hp-k-top', kpis.top_store || '-');

        // Monta estruturas para o heatmap
        const diasPT = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
        const diasAbrev = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const horasComerciais = Array.from({length: 13}, (_, i) => i + 10);

        const heatMapData = {};
        const catDataMap = {};
        const drillDataMap = {};
        const redeDataMap = {};

        diasPT.forEach(d => {
            heatMapData[d] = {};
            catDataMap[d] = {};
            drillDataMap[d] = {};
            redeDataMap[d] = {};
            horasComerciais.forEach(h => {
                heatMapData[d][h] = 0;
                catDataMap[d][h] = {};
                drillDataMap[d][h] = {};
                redeDataMap[d][h] = {};
            });
        });

        heatmap.forEach(row => {
            const dayPT = row.day_name;
            const hour = row.hour;
            if (heatMapData[dayPT] && heatMapData[dayPT][hour] !== undefined) {
                heatMapData[dayPT][hour] = row.total || 0;
            }
        });

        heatmapCat.forEach(row => {
            const dayPT = row.day_name;
            const hour = row.hour;
            const linha = row.linha_de_produto || 'N/A';
            if (catDataMap[dayPT] && catDataMap[dayPT][hour]) {
                catDataMap[dayPT][hour][linha] = row.total || 0;
            }
        });

        heatmapDrill.forEach(row => {
            const dayPT = row.day_name;
            const hour = row.hour;
            const aparelho = row.aparelho || 'N/A';
            if (drillDataMap[dayPT] && drillDataMap[dayPT][hour]) {
                drillDataMap[dayPT][hour][aparelho] = row.total || 0;
            }
        });

        heatmapRede.forEach(row => {
            const dayPT = row.day_name;
            const hour = row.hour;
            const rede = row.rede || 'N/A';
            if (redeDataMap[dayPT] && redeDataMap[dayPT][hour]) {
                redeDataMap[dayPT][hour][rede] = row.total || 0;
            }
        });

        let maxSess = 0;
        for(let d in heatMapData) {
            for(let h in heatMapData[d]) {
                if(heatMapData[d][h] > maxSess) maxSess = heatMapData[d][h];
            }
        }

        if (heatmap.length === 0) {
            container.innerHTML = '<div class="p-10 text-center opacity-50 text-adaptive w-full">Nenhum dado encontrado para os filtros atuais.</div>';
        } else {
            renderStaticHeatmap(container, heatMapData, catDataMap, drillDataMap, redeDataMap, diasPT, diasAbrev, horasComerciais, maxSess);
        }

        // Radar
        const hourlyProd = Array(13).fill(0);
        const hourlyCat = Array(13).fill(0);
        radarProd.forEach(r => { const idx = r.hour - 10; if(idx >= 0 && idx < 13) hourlyProd[idx] = r.total || 0; });
        radarCat.forEach(r => { const idx = r.hour - 10; if(idx >= 0 && idx < 13) hourlyCat[idx] = r.total || 0; });

        const labelsHoras = horasComerciais.map(h => `${h}h`);
        drawRadarChart('hp-c-radar', labelsHoras, hourlyProd, hourlyCat);

        // Canal
        const canalAgg = {};
        horasComerciais.forEach(h => { canalAgg[h] = { 'Rua': 0, 'Shopping': 0 }; });
        canal.forEach(r => {
            if (canalAgg[r.hour]) canalAgg[r.hour][r.tipo] = r.total || 0;
        });
        drawComparisonChart('hp-c-canal', labelsHoras, [
            { label: 'Rua', data: horasComerciais.map(h => canalAgg[h]['Rua']), color: '#8b5cf6' },
            { label: 'Shopping', data: horasComerciais.map(h => canalAgg[h]['Shopping']), color: '#f43f5e' }
        ]);

        // Semana
        const semanaAgg = {};
        horasComerciais.forEach(h => { semanaAgg[h] = { 'Dias Úteis': 0, 'Fim de Semana': 0 }; });
        semana.forEach(r => {
            if (semanaAgg[r.hour]) semanaAgg[r.hour][r.tipo] = r.total || 0;
        });
        drawComparisonChart('hp-c-semana', labelsHoras, [
            { label: 'Úteis', data: horasComerciais.map(h => semanaAgg[h]['Dias Úteis']), color: '#f43f5e' },
            { label: 'FDS', data: horasComerciais.map(h => semanaAgg[h]['Fim de Semana']), color: '#8b5cf6' }
        ]);

        // Dia da semana
        const diaSemanaAgg = { 
            'Segunda-feira': 0, 
            'Terça-feira': 0, 
            'Quarta-feira': 0, 
            'Quinta-feira': 0, 
            'Sexta-feira': 0, 
            'Sábado': 0, 
            'Domingo': 0 
        };
        diaSemana.forEach(r => {
            const dayPT = r.day_name;
            if (diaSemanaAgg[dayPT] !== undefined) diaSemanaAgg[dayPT] = r.total || 0;
        });
        const labelsSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
        const valuesSemana = labelsSemana.map(d => diaSemanaAgg[d]);
        
        // Calcula a média
        const mediaSemana = valuesSemana.reduce((a, b) => a + b, 0) / valuesSemana.length;
        
        // Cria escala de cores do menor para o maior
        const minVal = Math.min(...valuesSemana);
        const maxVal = Math.max(...valuesSemana);
        const colorsSemana = valuesSemana.map(val => {
            if (maxVal === minVal) return 'rgba(104, 91, 199, 0.8)';
            const intensity = (val - minVal) / (maxVal - minVal);
            // Escala de roxo: do mais claro (menor) ao mais escuro (maior)
            const alpha = 0.3 + (intensity * 0.7); // De 0.3 a 1.0
            return `rgba(104, 91, 199, ${alpha})`;
        });
        
        drawChartWithAverage('hp-c-trend', 'bar', { labels: labelsSemana, values: valuesSemana, colors: colorsSemana }, mediaSemana, false, true);

        // Índice de Consistência - OCULTO TEMPORARIAMENTE
        /*
        // Calcula desvio padrão e coeficiente de variação
        const stdDev = Math.sqrt(valuesSemana.reduce((sum, val) => sum + Math.pow(val - mediaSemana, 2), 0) / valuesSemana.length);
        const coefficientOfVariation = mediaSemana > 0 ? (stdDev / mediaSemana) * 100 : 0;
        
        // Atualiza KPIs de consistência
        document.getElementById('hp-consistency-std').innerText = Math.round(stdDev).toLocaleString('pt-BR');
        
        const cvEl = document.getElementById('hp-consistency-cv');
        const cvValue = coefficientOfVariation.toFixed(1);
        cvEl.innerText = `${cvValue}%`;
        
        // Cor do coeficiente baseado no valor
        if (coefficientOfVariation < 20) {
            cvEl.style.color = '#22c55e'; // Verde - Alta consistência
        } else if (coefficientOfVariation < 40) {
            cvEl.style.color = '#eab308'; // Amarelo - Média consistência
        } else {
            cvEl.style.color = '#ef4444'; // Vermelho - Baixa consistência
        }
        
        // Desenha gráfico de dispersão
        drawConsistencyChart('hp-c-consistency', labelsSemana, valuesSemana, mediaSemana, stdDev, coefficientOfVariation);
        */

    } catch (e) {
        console.error("Crash interceptado na renderização do Heatmap:", e);
    } finally {
        // Remove loading de todos os gráficos
        const chartContainers = ['hp-c-radar', 'hp-c-canal', 'hp-c-semana', 'hp-c-trend']; // 'hp-c-consistency' comentado
        chartContainers.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const chartContainer = canvas.parentElement;
                const spinner = chartContainer.querySelector('.spinner');
                if (spinner) spinner.remove();
                canvas.style.display = 'block';
            }
        });
    }
}


function renderStaticHeatmap(container, dataMap, catDataMap, drillDataMap, redeDataMap, days, daysAbrev, hours, maxVal) {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? 'text-white/30' : 'text-gray-400';
    const emptyBg = isDark ? 'bg-white/[0.02] border-white/[0.02]' : 'bg-black/[0.03] border-black/[0.03]';

    // Adiciona blur durante a transição
    container.style.filter = 'blur(8px)';
    container.style.opacity = '0.4';
    
    setTimeout(() => {
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
        
        days.forEach((day, dayIndex) => {
            html += `<div class="flex items-center justify-end pr-4 text-[9px] font-black uppercase tracking-widest ${textColor}">${daysAbrev[dayIndex]}</div>`;
            hours.forEach(hour => {
                const val = dataMap[day][hour] || 0;
                const breakdowns = catDataMap[day][hour] || {};
                const drilldowns = drillDataMap[day][hour] || {};
                const redes = redeDataMap[day][hour] || {};
                
                const bdJson = JSON.stringify(breakdowns).replace(/"/g, '&quot;');
                const drillJson = JSON.stringify(drilldowns).replace(/"/g, '&quot;');
                const redeJson = JSON.stringify(redes).replace(/"/g, '&quot;');
                
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
                              data-rede="${redeJson}"
                         >${Math.round(val)}</div>`;
            });
        });
        html += `</div>`;
        container.innerHTML = html;

        // Remove blur após renderizar
        setTimeout(() => {
            container.style.filter = 'blur(0px)';
            container.style.opacity = '1';
        }, 50);

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

            cell.addEventListener('click', () => {
                if (total === 0) return;
                
                tooltip.style.opacity = '0';
                tooltip.style.display = 'none';

                const day = cell.getAttribute('data-day');
                const hour = cell.getAttribute('data-hour');
                const drillData = JSON.parse(cell.getAttribute('data-drill') || '{}');
                const redeData = JSON.parse(cell.getAttribute('data-rede') || '{}');
                
                openDrilldown(day, hour, total, drillData, redeData);
            });
        });
    }, 100);
}

function openDrilldown(day, hour, total, drillData, redeData) {
    const container = document.getElementById('html-heatmap-container');
    const overlay = document.getElementById('hp-drilldown-overlay');
    const subtitle = document.getElementById('hp-drill-subtitle');
    const listProdutos = document.getElementById('hp-drill-list-produtos');
    const listRedes = document.getElementById('hp-drill-list-redes');

    subtitle.innerText = `${day} às ${hour}h • Total: ${total}`;
    
    // Lista de produtos
    const itemsProdutos = Object.entries(drillData).sort((a,b) => b[1] - a[1]);
    let htmlProdutos = '';
    
    if (itemsProdutos.length === 0) {
        htmlProdutos = '<div class="text-white/40 text-sm italic p-4">Nenhum aparelho registrado</div>';
    } else {
        itemsProdutos.forEach(([prod, vol], index) => {
            htmlProdutos += `
                <div class="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors" style="animation: smoothEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.05}s; opacity: 0;">
                    <span class="text-sm font-bold text-white/90 truncate mr-4">${prod}</span>
                    <span class="text-lg font-black text-[#685BC7] font-numbers">${Math.round(vol)}</span>
                </div>
            `;
        });
    }
    
    // Lista de redes
    const itemsRedes = Object.entries(redeData).sort((a,b) => b[1] - a[1]);
    let htmlRedes = '';
    
    if (itemsRedes.length === 0) {
        htmlRedes = '<div class="text-white/40 text-sm italic p-4">Nenhuma rede registrada</div>';
    } else {
        itemsRedes.forEach(([rede, vol], index) => {
            htmlRedes += `
                <div class="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors" style="animation: smoothEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.05}s; opacity: 0;">
                    <span class="text-sm font-bold text-white/90 truncate mr-4">${rede}</span>
                    <span class="text-lg font-black text-[#f43f5e] font-numbers">${Math.round(vol)}</span>
                </div>
            `;
        });
    }

    listProdutos.innerHTML = htmlProdutos;
    listRedes.innerHTML = htmlRedes;

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

// Função especial para gráfico com linha de média e escala de cores
function drawChartWithAverage(id, type, data, average, isArea = false, showPercentage = false) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    const totalData = showPercentage ? data.values.reduce((a, b) => a + b, 0) : 0;
    
    chartInstances[id] = new Chart(ctx, {
        type: type,
        data: { 
            labels: data.labels, 
            datasets: [
                {
                    type: 'bar',
                    data: data.values, 
                    backgroundColor: data.colors || '#685BC7',
                    borderRadius: 6,
                    borderWidth: 0
                },
                {
                    type: 'line',
                    label: 'Média',
                    data: new Array(data.labels.length).fill(average),
                    borderColor: 'rgba(139, 92, 246, 0.6)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { 
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                        font: { family: 'Archivo', size: 9, weight: 700 },
                        usePointStyle: true,
                        pointStyle: 'line',
                        padding: 10,
                        filter: (item) => item.text === 'Média'
                    }
                },
                datalabels: {
                    display: showPercentage, 
                    align: 'end', 
                    anchor: 'end', 
                    color: isDark ? '#ffffff' : '#131417', 
                    font: { family: 'Archivo', size: 12, weight: 800 },
                    formatter: (value, context) => {
                        if (context.datasetIndex === 1) return null; // Não mostra label na linha de média
                        return totalData === 0 ? '0%' : ((value / totalData) * 100).toFixed(1).replace('.', ',') + '%';
                    }
                },
                tooltip: { 
                    backgroundColor: isDark ? 'rgba(18, 19, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                    titleFont: { family: 'Archivo', size: 10, weight: 800 }, 
                    bodyFont: { family: 'Archivo', size: 11, weight: 500 }, 
                    padding: 12, 
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return `Média: ${Math.round(context.parsed.y).toLocaleString('pt-BR')}`;
                            }
                            return `Interações: ${Math.round(context.parsed.y).toLocaleString('pt-BR')}`;
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grace: showPercentage ? '15%' : '5%', 
                    grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }, 
                    ticks: { 
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', 
                        font: { family: 'Archivo', size: 10, weight: 600 } 
                    }, 
                    border: { display: false } 
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { 
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', 
                        font: { family: 'Archivo', size: 9, weight: 700 } 
                    }, 
                    border: { display: false } 
                }
            }
        }
    });
}

// Função para gráfico de consistência (dispersão com bandas)
function drawConsistencyChart(id, labels, values, mean, stdDev, cv) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    
    // Define cor baseado no coeficiente de variação
    let pointColor, bandColor;
    if (cv < 20) {
        pointColor = 'rgba(34, 197, 94, 0.8)'; // Verde
        bandColor = 'rgba(34, 197, 94, 0.1)';
    } else if (cv < 40) {
        pointColor = 'rgba(234, 179, 8, 0.8)'; // Amarelo
        bandColor = 'rgba(234, 179, 8, 0.1)';
    } else {
        pointColor = 'rgba(239, 68, 68, 0.8)'; // Vermelho
        bandColor = 'rgba(239, 68, 68, 0.1)';
    }
    
    // Cria datasets
    const scatterData = labels.map((label, index) => ({
        x: index,
        y: values[index]
    }));
    
    chartInstances[id] = new Chart(ctx, {
        type: 'scatter',
        data: {
            labels: labels,
            datasets: [
                // Banda superior (média + 1 desvio padrão)
                {
                    type: 'line',
                    label: '+1 Desvio',
                    data: labels.map(() => mean + stdDev),
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                },
                // Linha de média
                {
                    type: 'line',
                    label: 'Média',
                    data: labels.map(() => mean),
                    borderColor: 'rgba(139, 92, 246, 0.6)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                },
                // Banda inferior (média - 1 desvio padrão)
                {
                    type: 'line',
                    label: '-1 Desvio',
                    data: labels.map(() => Math.max(0, mean - stdDev)),
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: '+1',
                    backgroundColor: bandColor,
                    tension: 0
                },
                // Pontos de dispersão
                {
                    type: 'scatter',
                    label: 'Interações',
                    data: scatterData,
                    backgroundColor: pointColor,
                    borderColor: pointColor,
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    pointStyle: 'circle'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'point', intersect: true },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                        font: { family: 'Archivo', size: 9, weight: 700 },
                        usePointStyle: true,
                        padding: 10,
                        filter: (item) => item.text === 'Média' || item.text === 'Interações'
                    }
                },
                datalabels: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(18, 19, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleFont: { family: 'Archivo', size: 10, weight: 800 },
                    bodyFont: { family: 'Archivo', size: 11, weight: 500 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            if (context[0].datasetIndex === 3) {
                                return labels[context[0].parsed.x];
                            }
                            return '';
                        },
                        label: function(context) {
                            if (context.datasetIndex === 3) {
                                const value = Math.round(context.parsed.y);
                                const diff = value - mean;
                                const diffPercent = mean > 0 ? ((diff / mean) * 100).toFixed(1) : 0;
                                const sign = diff >= 0 ? '+' : '';
                                return [
                                    `Interações: ${value.toLocaleString('pt-BR')}`,
                                    `Desvio: ${sign}${Math.round(diff).toLocaleString('pt-BR')} (${sign}${diffPercent}%)`
                                ];
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '10%',
                    grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' },
                    ticks: {
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
                        font: { family: 'Archivo', size: 10, weight: 600 }
                    },
                    border: { display: false },
                    title: {
                        display: true,
                        text: 'Interações',
                        color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)',
                        font: { family: 'Archivo', size: 10, weight: 700 }
                    }
                },
                x: {
                    type: 'category',
                    labels: labels,
                    grid: { display: false },
                    ticks: {
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
                        font: { family: 'Archivo', size: 9, weight: 700 }
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// ==========================================
// ALTERNÂNCIA ENTRE PICOS (SLIDESHOW)
// ==========================================
function startPeakSlideshow(hasSecondary) {
    // Limpa intervalo anterior se existir
    if (peakSlideInterval) {
        clearInterval(peakSlideInterval);
        peakSlideInterval = null;
    }
    
    // Se não há pico secundário, não inicia o slideshow
    if (!hasSecondary) {
        const primaryEl = document.getElementById('hp-peak-primary');
        const secondaryEl = document.getElementById('hp-peak-secondary');
        
        if (primaryEl) {
            primaryEl.classList.add('active');
            primaryEl.classList.remove('slide-out-up');
        }
        if (secondaryEl) {
            secondaryEl.classList.remove('active');
            secondaryEl.classList.add('slide-in-down');
        }
        return;
    }
    
    let currentSlide = 0; // 0 = primary, 1 = secondary
    
    const primaryEl = document.getElementById('hp-peak-primary');
    const secondaryEl = document.getElementById('hp-peak-secondary');
    
    if (!primaryEl || !secondaryEl) return;
    
    // Função para alternar slides
    const switchSlide = () => {
        if (currentSlide === 0) {
            // Mostra secundário, esconde primário
            primaryEl.classList.remove('active');
            primaryEl.classList.add('slide-out-up');
            
            secondaryEl.classList.remove('slide-in-down');
            secondaryEl.classList.add('active');
            
            currentSlide = 1;
        } else {
            // Mostra primário, esconde secundário
            secondaryEl.classList.remove('active');
            secondaryEl.classList.add('slide-in-down');
            
            primaryEl.classList.remove('slide-out-up');
            primaryEl.classList.add('active');
            
            currentSlide = 0;
        }
    };
    
    // Alterna a cada 5 segundos
    peakSlideInterval = setInterval(switchSlide, 5000);
}
