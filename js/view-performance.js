// js/view-performance.js
import { appData } from './services/dataManager.js';

Chart.register(ChartDataLabels);

let chartInstances = {};
let unsubscribeData = null;
let currentRenderToken = 0;

export const getPerformanceHTML = () => {
    return `
        <style>
            #view-performance-wrapper { font-family: 'Archivo', sans-serif; }
            
            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); font-family: 'Archivo', sans-serif; }
            .text-adaptive-muted { color: var(--text-muted); font-family: 'Archivo', sans-serif; }
            .text-adaptive-strong { color: var(--text-muted-strong); font-family: 'Archivo', sans-serif; }
            .text-glow { text-shadow: var(--glow-shadow); }
            .neon-accent { background: var(--neon-bg); }
            
            /* Tipografia consistente */
            .font-numbers { font-family: 'Michroma', sans-serif; }
            
            @keyframes smoothEntrance {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .anim-cascade { opacity: 0; animation: smoothEntrance 0.3s ease-in-out forwards; }
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .delay-4 { animation-delay: 0.4s; }
            
            /* Loading States */
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
            
            /* Badges de Ranking */
            .rank-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-weight: 900;
                font-size: 12px;
                font-family: 'Archivo', sans-serif;
            }
            
            .rank-gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; }
            .rank-silver { background: linear-gradient(135deg, #C0C0C0, #808080); color: #000; }
            .rank-bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); color: #fff; }
            .rank-default { background: rgba(104, 91, 199, 0.2); color: var(--text-main); }
            
            /* Tabela de Ranking */
            .ranking-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0 8px;
            }
            
            .ranking-row {
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                transition: all 0.3s ease;
            }
            
            .ranking-row:hover {
                background: rgba(104, 91, 199, 0.1);
                transform: translateX(4px);
            }
            
            .ranking-row td {
                padding: 16px;
                font-family: 'Archivo', sans-serif;
            }
            
            .ranking-row td:first-child {
                border-radius: 12px 0 0 12px;
            }
            
            .ranking-row td:last-child {
                border-radius: 0 12px 12px 0;
            }
            
            /* Setas de Tendência */
            .trend-arrow {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-weight: 900;
                font-size: 14px;
                font-family: 'Archivo', sans-serif;
                font-stretch: 130%;
            }
            
            .trend-up { color: #22c55e; }
            .trend-down { color: #ef4444; }
            .trend-neutral { color: #9ca3af; }
            
            /* Cards de Crescimento */
            .growth-card {
                position: relative;
                overflow: hidden;
                min-height: 140px;
            }
            
            .growth-chart-container {
                position: absolute;
                bottom: 12px;
                left: 12px;
                right: 12px;
                height: 60px;
                opacity: 0.8;
            }
            
            /* Gauge/Medidor */
            .health-gauge {
                position: relative;
                width: 120px;
                height: 120px;
                margin: 0 auto;
            }
            
            .gauge-bg {
                fill: none;
                stroke: var(--glass-border);
                stroke-width: 8;
            }
            
            .gauge-fill {
                fill: none;
                stroke-width: 8;
                stroke-linecap: round;
                transition: stroke-dashoffset 1s ease;
            }
            
            .gauge-text {
                font-size: 24px;
                font-weight: 900;
                font-family: 'Michroma', sans-serif;
                fill: var(--text-main);
            }
            
            /* Health Cards - New Compact Layout */
            .health-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
                max-height: 400px;
                overflow-y: auto;
                padding: 4px;
                border-radius: 16px;
            }
            
            .health-grid::-webkit-scrollbar {
                width: 6px;
            }
            
            .health-grid::-webkit-scrollbar-track {
                background: var(--glass-border);
                border-radius: 3px;
            }
            
            .health-grid::-webkit-scrollbar-thumb {
                background: var(--text-muted);
                border-radius: 3px;
            }
            
            .health-grid::-webkit-scrollbar-thumb:hover {
                background: var(--text-main);
            }
            
            /* Health Cards */
            .health-card {
                cursor: pointer;
                transition: all 0.3s ease;
                min-height: 140px;
            }
            
            .health-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 32px rgba(104, 91, 199, 0.2);
            }
            
            .health-card .health-gauge {
                width: 60px;
                height: 60px;
                margin: 0 auto;
            }
            
            /* Store Report Layout */
            #health-detail-view {
                animation: slideInFromRight 0.4s ease-out;
            }
            
            #health-detail-view.slide-out {
                animation: slideOutToRight 0.4s ease-in forwards;
            }
            
            @keyframes slideInFromRight {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutToRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(20px);
                }
            }
            
            #health-cards-view.hidden {
                display: none;
            }
            
            #health-cards-view.slide-in {
                animation: slideInFromLeft 0.4s ease-out;
            }
            
            @keyframes slideInFromLeft {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            /* Info Toggle Button */
            #health-info-toggle {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 1px solid transparent;
                cursor: pointer;
                flex-shrink: 0;
                transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s, box-shadow 0.3s, border-color 0.3s, color 0.3s;
                font-size: 14px;
                font-weight: 700;
            }
            
            body.dark #health-info-toggle {
                background: rgba(255,255,255,0.05);
                border-color: rgba(255,255,255,0.09);
                color: rgba(255,255,255,0.6);
                backdrop-filter: blur(24px);
            }
            
            body:not(.dark) #health-info-toggle {
                background: rgba(255,255,255,0.65);
                border-color: rgba(255,255,255,0.95);
                color: #64748b;
                backdrop-filter: blur(24px);
                box-shadow: 0 4px 12px rgba(15,23,42,0.05);
            }
            
            body.dark #health-info-toggle:hover {
                border-color: rgba(104,91,199,0.5);
                box-shadow: 0 0 15px rgba(104,91,199,0.4);
                color: #fff;
            }
            
            body:not(.dark) #health-info-toggle:hover {
                border-color: rgba(104,91,199,0.4);
                box-shadow: 0 0 15px rgba(104,91,199,0.2);
                color: var(--ps-blue);
            }
            
            #health-info-toggle.active {
                background: var(--ps-blue) !important;
                color: white !important;
                border-color: var(--ps-blue) !important;
                box-shadow: 0 4px 15px rgba(104,91,199,0.4) !important;
            }
            
            /* Health Info Panel Animation */
            #health-info-panel {
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            }
            
            #health-info-panel.info-hidden {
                max-height: 0;
                opacity: 0;
                transform: translateY(-10px);
                pointer-events: none;
                margin-bottom: 0;
            }
            
            #health-info-panel.info-open {
                max-height: 200px;
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
                margin-bottom: 24px;
            }
            
            /* Modal */
            #health-detail-modal {
                z-index: 1000;
            }
            
            #health-detail-modal.show {
                display: flex !important;
            }
        </style>
        
        <div id="view-performance-wrapper" class="pb-10 overflow-hidden">
            
            <!-- Ranking de PDVs -->
            <div class="anim-cascade delay-1 glass-panel p-8 md:p-10 rounded-[2.5rem] mb-8">
                <h4 class="ds-chart-title mb-6">Ranking de PDVs</h4>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Top 10 -->
                    <div>
                        <h5 class="text-sm uppercase tracking-wider mb-4 text-adaptive-muted" style="font-family: 'Archivo', sans-serif; font-weight: 200; font-stretch: 120%;">🏆 Top 10 Lojas</h5>
                        <div id="perf-top10-container" class="space-y-2">
                            <div class="chart-loading"><div class="spinner"></div></div>
                        </div>
                    </div>
                    
                    <!-- Bottom 10 -->
                    <div>
                        <h5 class="text-sm uppercase tracking-wider mb-4 text-adaptive-muted" style="font-family: 'Archivo', sans-serif; font-weight: 200; font-stretch: 120%;">⚠️ Bottom 10 Lojas</h5>
                        <div id="perf-bottom10-container" class="space-y-2">
                            <div class="chart-loading"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>
            </div>
                
            <!-- Eficiência por Aparelho -->
            <div class="anim-cascade delay-2 glass-panel p-8 md:p-10 rounded-[2.5rem] mb-8">
                <div class="mb-6">
                    <h4 class="ds-chart-title mb-2">Eficiência por Aparelho</h4>
                    <p class="text-xs text-adaptive-muted uppercase tracking-wider">Interações por unidade ativa (ROI de exposição)</p>
                </div>
                <div class="chart-container relative" style="height: 400px;">
                    <canvas id="perf-c-efficiency"></canvas>
                </div>
            </div>
            
            <!-- Tendência de Crescimento -->
            <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-[2.5rem] mb-8">
                <div class="mb-6">
                    <h4 class="ds-chart-title mb-2">Performance Média de Interação</h4>
                    <p class="text-xs text-adaptive-muted uppercase tracking-wider">Último dia vs média do período selecionado</p>
                </div>
                <div id="perf-growth-container">
                    <div class="chart-loading"><div class="spinner"></div></div>
                </div>
            </div>
            
            <!-- Score de Saúde do PDV -->
            <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] mb-8 relative">
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="ds-chart-title">Score de Saúde dos PDVs</h4>
                        <button id="health-info-toggle" title="Informações sobre o Score de Saúde">
                            ?
                        </button>
                    </div>
                    
                    <!-- Painel de Informações (inicialmente oculto) -->
                    <div id="health-info-panel" class="info-hidden">
                        <p class="text-xs text-adaptive-muted uppercase tracking-wider mb-4">Índice composto baseado em 3 pilares fundamentais</p>
                        
                        <!-- Explicação dos Componentes -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 glass-panel rounded-xl">
                            <div class="text-center">
                                <div class="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                                    <span class="text-white text-sm font-bold">V</span>
                                </div>
                                <h6 class="text-xs font-bold text-adaptive mb-1">Volume (40%)</h6>
                                <p class="text-[10px] text-adaptive-muted">Total de interações da loja normalizado pelo máximo do período</p>
                            </div>
                            <div class="text-center">
                                <div class="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                                    <span class="text-white text-sm font-bold">D</span>
                                </div>
                                <h6 class="text-xs font-bold text-adaptive mb-1">Diversidade (30%)</h6>
                                <p class="text-[10px] text-adaptive-muted">Quantidade de aparelhos diferentes ativos na loja</p>
                            </div>
                            <div class="text-center">
                                <div class="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                                    <span class="text-white text-sm font-bold">C</span>
                                </div>
                                <h6 class="text-xs font-bold text-adaptive mb-1">Consistência (30%)</h6>
                                <p class="text-[10px] text-adaptive-muted">Regularidade das interações ao longo dos dias (baixa variação = alta consistência)</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Grid de Cards (View Padrão) -->
                <div id="health-cards-view">
                    <div id="perf-health-container" class="health-grid">
                        <div class="chart-loading"><div class="spinner"></div></div>
                    </div>
                </div>
                
                <!-- Store Report Detalhado (View Expandida) -->
                <div id="health-detail-view" class="hidden">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-4">
                            <button id="health-back-btn" class="flex items-center gap-2 px-4 py-2 glass-panel rounded-xl hover:bg-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                                <span class="text-sm font-bold text-adaptive">Voltar</span>
                            </button>
                            <div>
                                <h5 id="store-report-title" class="text-xl font-black text-adaptive">-</h5>
                                <p class="text-xs text-adaptive-muted">Relatório Detalhado de Performance</p>
                            </div>
                        </div>
                        <div class="health-gauge" style="width: 80px; height: 80px;">
                            <svg viewBox="0 0 100 100">
                                <circle class="gauge-bg" cx="50" cy="50" r="35"></circle>
                                <circle id="store-report-gauge" class="gauge-fill" cx="50" cy="50" r="35" 
                                        stroke-dasharray="219.8"
                                        stroke-dashoffset="219.8"
                                        transform="rotate(-90 50 50)"></circle>
                                <text id="store-report-score" class="gauge-text" x="50" y="58" text-anchor="middle" style="font-size: 20px;">-</text>
                            </svg>
                        </div>
                    </div>
                    
                    <!-- Auditoria Detalhada -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- Volume -->
                        <div class="glass-panel p-6 rounded-2xl">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span class="text-white font-bold">V</span>
                                </div>
                                <div>
                                    <h6 class="text-sm font-bold text-adaptive">Volume</h6>
                                    <p class="text-xs text-adaptive-muted">40% do score total</p>
                                </div>
                            </div>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Interações da loja:</span>
                                    <span id="audit-store-sessions" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Máximo do período:</span>
                                    <span id="audit-max-sessions" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Percentual:</span>
                                    <span id="audit-volume-percent" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <hr class="border-white/10">
                                <div class="flex justify-between">
                                    <span class="text-sm font-bold text-adaptive">Pontuação:</span>
                                    <span id="audit-volume-score" class="text-sm font-black text-blue-500" style="font-family: 'Michroma', sans-serif;">-/40</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Diversidade -->
                        <div class="glass-panel p-6 rounded-2xl">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span class="text-white font-bold">D</span>
                                </div>
                                <div>
                                    <h6 class="text-sm font-bold text-adaptive">Diversidade</h6>
                                    <p class="text-xs text-adaptive-muted">30% do score total</p>
                                </div>
                            </div>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Aparelhos da loja:</span>
                                    <span id="audit-store-devices" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Máximo do período:</span>
                                    <span id="audit-max-devices" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Percentual:</span>
                                    <span id="audit-diversity-percent" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <hr class="border-white/10">
                                <div class="flex justify-between">
                                    <span class="text-sm font-bold text-adaptive">Pontuação:</span>
                                    <span id="audit-diversity-score" class="text-sm font-black text-purple-500" style="font-family: 'Michroma', sans-serif;">-/30</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Consistência -->
                        <div class="glass-panel p-6 rounded-2xl">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                    <span class="text-white font-bold">C</span>
                                </div>
                                <div>
                                    <h6 class="text-sm font-bold text-adaptive">Consistência</h6>
                                    <p class="text-xs text-adaptive-muted">30% do score total</p>
                                </div>
                            </div>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Média diária:</span>
                                    <span id="audit-daily-avg" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Desvio padrão:</span>
                                    <span id="audit-daily-std" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-xs text-adaptive-muted">Coef. variação:</span>
                                    <span id="audit-consistency-cv" class="text-xs font-bold text-adaptive" style="font-family: 'Michroma', sans-serif;">-</span>
                                </div>
                                <hr class="border-white/10">
                                <div class="flex justify-between">
                                    <span class="text-sm font-bold text-adaptive">Pontuação:</span>
                                    <span id="audit-consistency-score" class="text-sm font-black text-green-500" style="font-family: 'Michroma', sans-serif;">-/30</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Resumo Final -->
                    <div class="mt-6 glass-panel p-6 rounded-2xl">
                        <h6 class="text-lg font-bold text-adaptive mb-4">Cálculo Final do Score</h6>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <p class="text-xs text-adaptive-muted mb-1">Volume</p>
                                <p id="final-volume-score" class="text-xl font-black text-blue-500" style="font-family: 'Michroma', sans-serif;">-</p>
                            </div>
                            <div>
                                <p class="text-xs text-adaptive-muted mb-1">Diversidade</p>
                                <p id="final-diversity-score" class="text-xl font-black text-purple-500" style="font-family: 'Michroma', sans-serif;">-</p>
                            </div>
                            <div>
                                <p class="text-xs text-adaptive-muted mb-1">Consistência</p>
                                <p id="final-consistency-score" class="text-xl font-black text-green-500" style="font-family: 'Michroma', sans-serif;">-</p>
                            </div>
                            <div class="border-l border-white/20 pl-4">
                                <p class="text-xs text-adaptive-muted mb-1">Score Total</p>
                                <p id="final-total-score" class="text-2xl font-black text-[#685BC7]" style="font-family: 'Michroma', sans-serif;">-</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    `;
};

export const renderPerformance = () => {
    if (unsubscribeData) unsubscribeData();
    unsubscribeData = appData.subscribe(async () => {
        await executeRenderLogic();
    });
    executeRenderLogic();
    
    // Configura o botão de informações após renderizar
    setTimeout(() => {
        setupHealthInfoToggle();
    }, 100);
};

export const destroyPerformanceCharts = () => {
    Object.keys(chartInstances).forEach(id => {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
        }
    });
    chartInstances = {};
    
    if (unsubscribeData) {
        unsubscribeData();
        unsubscribeData = null;
    }
};

async function executeRenderLogic() {
    const renderToken = ++currentRenderToken;
    
    try {
        const dbData = await appData.fetchPerformanceRPC();
        
        if (renderToken !== currentRenderToken) return;
        if (!document.getElementById('view-performance-wrapper')) return;
        
        // Destroi gráficos anteriores
        Object.keys(chartInstances).forEach(id => { 
            if(chartInstances[id]) chartInstances[id].destroy(); 
        });
        chartInstances = {};
        
        if (!dbData) {
            console.warn('⚠️ Performance: Sem dados retornados');
            return;
        }
        
        console.log('📊 Performance data received:', dbData); // DEBUG
        
        // Renderiza cada seção
        renderTop10(dbData.top10 || []);
        renderBottom10(dbData.bottom10 || []);
        renderEfficiencyChart(dbData.efficiency || []);
        renderGrowthTrends(dbData.growth || []);
        renderHealthScores(dbData.health || []);
        
    } catch (e) {
        console.error("Erro na renderização de Performance:", e);
    }
}

function renderTop10(data) {
    const container = document.getElementById('perf-top10-container');
    if (!container || data.length === 0) {
        container.innerHTML = '<p class="text-adaptive-muted text-sm italic">Nenhum dado disponível</p>';
        return;
    }
    
    let html = '';
    data.forEach((item, index) => {
        const rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : 'rank-default';
        html += `
            <div class="ranking-row flex items-center gap-5 p-5 rounded-xl">
                <div class="rank-badge ${rankClass}">${index + 1}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-adaptive" style="font-family: 'Archivo', sans-serif; font-weight: 200; word-wrap: break-word; overflow-wrap: break-word;">${item.store_name}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-black text-adaptive" style="font-family: 'Michroma', sans-serif;">${Math.round(item.total).toLocaleString('pt-BR')}</p>
                    <p class="text-[10px] text-adaptive-muted uppercase" style="font-family: 'Archivo', sans-serif;">interações</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderBottom10(data) {
    const container = document.getElementById('perf-bottom10-container');
    if (!container || data.length === 0) {
        container.innerHTML = '<p class="text-adaptive-muted text-sm italic">Nenhum dado disponível</p>';
        return;
    }
    
    let html = '';
    data.forEach((item, index) => {
        html += `
            <div class="ranking-row flex items-center gap-5 p-5 rounded-xl opacity-70">
                <div class="rank-badge rank-default">${index + 1}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-adaptive" style="font-family: 'Archivo', sans-serif; font-weight: 200; word-wrap: break-word; overflow-wrap: break-word;">${item.store_name}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-black text-adaptive" style="font-family: 'Michroma', sans-serif;">${Math.round(item.total).toLocaleString('pt-BR')}</p>
                    <p class="text-[10px] text-adaptive-muted uppercase" style="font-family: 'Archivo', sans-serif;">interações</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderEfficiencyChart(data) {
    const ctx = document.getElementById('perf-c-efficiency');
    if (!ctx || data.length === 0) return;
    
    const isDark = document.body.classList.contains('dark');
    
    // Obtém todas as linhas de produto únicas dos dados
    const uniqueLines = [...new Set(data.map(item => item.linha_de_produto || 'N/A'))];
    
    // Define cores bem distintas e complementares ao roxo
    const colorPalette = [
        { bg: 'rgba(104, 91, 199, 0.7)', border: '#685BC7' },    // Roxo original
        { bg: 'rgba(34, 197, 94, 0.7)', border: '#22c55e' },     // Verde
        { bg: 'rgba(239, 68, 68, 0.7)', border: '#ef4444' },     // Vermelho
        { bg: 'rgba(245, 158, 11, 0.7)', border: '#f59e0b' },    // Laranja
        { bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },    // Azul
        { bg: 'rgba(236, 72, 153, 0.7)', border: '#ec4899' },    // Rosa
        { bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981' },    // Teal
        { bg: 'rgba(139, 69, 19, 0.7)', border: '#8b4513' },     // Marrom
        { bg: 'rgba(75, 85, 99, 0.7)', border: '#4b5563' },      // Cinza
        { bg: 'rgba(168, 85, 247, 0.7)', border: '#a855f7' }     // Violeta
    ];
    
    // Cria um mapeamento de linha para cor
    const lineColors = {};
    uniqueLines.forEach((line, index) => {
        const colorIndex = index % colorPalette.length;
        lineColors[line] = {
            ...colorPalette[colorIndex],
            name: line || 'N/A'
        };
    });
    
    // Agrupa dados por linha de produto
    const datasets = uniqueLines.map(line => {
        const lineData = data
            .filter(item => (item.linha_de_produto || 'N/A') === line)
            .map(item => ({
                x: item.qtd_unidades || 0,
                y: item.efficiency || 0,
                r: Math.sqrt((item.total_sessions || 0) / 100) * 5,
                label: item.aparelho
            }));
        
        return {
            label: lineColors[line].name,
            data: lineData,
            backgroundColor: lineColors[line].bg,
            borderColor: lineColors[line].border,
            borderWidth: 2
        };
    }).filter(dataset => dataset.data.length > 0); // Remove datasets vazios
    
    chartInstances['perf-c-efficiency'] = new Chart(ctx, {
        type: 'bubble',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                        font: { family: 'Archivo', size: 11, weight: 700 },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            
                            // Limita o texto da legenda para não ficar muito longo
                            labels.forEach(label => {
                                if (label.text.length > 15) {
                                    label.text = label.text.substring(0, 12) + '...';
                                }
                            });
                            
                            return labels;
                        }
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
                        title: (context) => context[0].raw.label,
                        label: (context) => [
                            `Linha: ${context.dataset.label}`,
                            `Unidades: ${Math.round(context.raw.x)}`,
                            `Eficiência: ${context.raw.y.toFixed(1)} int/unidade`,
                            `Volume Total: ${Math.round(Math.pow(context.raw.r / 5, 2) * 100).toLocaleString('pt-BR')}`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Quantidade de Unidades',
                        color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)',
                        font: { family: 'Archivo', size: 11, weight: 700 }
                    },
                    grid: { 
                        color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        drawOnChartArea: true
                    },
                    ticks: { 
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
                        font: { family: 'Archivo', size: 10, weight: 600 }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Eficiência (Interações / Unidade)',
                        color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)',
                        font: { family: 'Archivo', size: 11, weight: 700 }
                    },
                    grid: { 
                        color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        drawOnChartArea: true
                    },
                    ticks: { 
                        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)',
                        font: { family: 'Archivo', size: 10, weight: 600 }
                    }
                }
            },
            onHover: (event, activeElements) => {
                event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
            }
        },
        plugins: [{
            id: 'crosshairs',
            afterDraw: (chart) => {
                const { ctx, chartArea: { left, top, right, bottom } } = chart;
                
                // Calcula o centro do gráfico
                const centerX = left + (right - left) / 2;
                const centerY = top + (bottom - top) / 2;
                
                // Estilo das linhas pontilhadas
                ctx.save();
                ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                
                // Linha vertical (centro)
                ctx.beginPath();
                ctx.moveTo(centerX, top);
                ctx.lineTo(centerX, bottom);
                ctx.stroke();
                
                // Linha horizontal (centro)
                ctx.beginPath();
                ctx.moveTo(left, centerY);
                ctx.lineTo(right, centerY);
                ctx.stroke();
                
                ctx.restore();
            }
        }]
    });
}

function renderGrowthTrends(data) {
    const container = document.getElementById('perf-growth-container');
    if (!container || data.length === 0) {
        container.innerHTML = '<p class="text-adaptive-muted text-sm italic">Nenhum dado disponível</p>';
        return;
    }
    
    console.log('Growth data received:', data); // DEBUG
    
    // Agrupa dados por linha de produto
    const groupedData = {};
    data.forEach(item => {
        const linha = item.linha_de_produto || 'Outros';
        if (!groupedData[linha]) {
            groupedData[linha] = [];
        }
        groupedData[linha].push(item);
    });
    
    console.log('Grouped data:', groupedData); // DEBUG
    
    // Ordena as linhas de produto alfabeticamente
    const sortedLines = Object.keys(groupedData).sort();
    
    let html = '';
    
    if (sortedLines.length === 0) {
        html = '<p class="text-adaptive-muted text-sm italic">Nenhuma linha de produto encontrada</p>';
    } else {
        sortedLines.forEach(linha => {
            const produtos = groupedData[linha];
            
            // Cabeçalho da linha de produto
            html += `
                <div class="mb-8">
                    <h5 class="text-sm font-black uppercase tracking-wider text-adaptive mb-4 pb-2 border-b border-white/10" style="font-family: 'Archivo', sans-serif;">
                        ${linha} (${produtos.length} produtos)
                    </h5>
                    
                    <!-- Grid de produtos desta linha -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            `;
            
            // Cards dos produtos (já ordenados alfabeticamente pelo SQL)
            produtos.forEach((item, index) => {
                const growth = item.growth_rate || 0;
                const lastDayValue = item.last_day_sessions || 0;
                const avgValue = item.avg_daily_sessions || 0;
                const lastDate = item.last_date || '';
                const totalDays = item.unique_dates || item.total_days || 0;
                
                const isPositive = growth > 0;
                const isNeutral = growth === 0;
                const trendClass = isNeutral ? 'trend-neutral' : isPositive ? 'trend-up' : 'trend-down';
                const arrow = isNeutral ? '→' : isPositive ? '↗' : '↘';
                
                const canvasId = `growth-chart-${linha.replace(/\s+/g, '')}-${index}`;
                
                html += `
                    <div class="glass-panel p-6 rounded-2xl growth-card">
                        <p class="text-xs font-bold text-adaptive-muted uppercase tracking-wider mb-2" style="font-family: 'Archivo', sans-serif; font-weight: 300; font-stretch: 140%;">${item.aparelho}</p>
                        <div class="flex items-center justify-between mb-2">
                            <span class="trend-arrow ${trendClass}">
                                <span style="font-size: 24px;">${arrow}</span>
                                <span style="font-family: 'Michroma', sans-serif;">${isPositive ? '+' : ''}${growth.toFixed(1)}%</span>
                            </span>
                        </div>
                        <div class="text-[9px] text-adaptive-muted mb-4" style="font-family: 'Archivo', sans-serif;">
                            <div class="flex justify-between">
                                <span>Último dia (${formatDate(lastDate)}):</span>
                                <span style="font-family: 'Michroma', sans-serif;">${Math.round(lastDayValue).toLocaleString('pt-BR')}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Média (${totalDays} dias):</span>
                                <span style="font-family: 'Michroma', sans-serif;">${Math.round(avgValue).toLocaleString('pt-BR')}</span>
                            </div>
                        </div>
                        
                        <!-- Mini gráfico de linha -->
                        <div class="growth-chart-container">
                            <canvas id="${canvasId}"></canvas>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    
    // Renderiza os mini gráficos
    sortedLines.forEach(linha => {
        const produtos = groupedData[linha];
        produtos.forEach((item, index) => {
            const canvasId = `growth-chart-${linha.replace(/\s+/g, '')}-${index}`;
            renderMiniLineChart(
                canvasId, 
                item.growth_rate || 0, 
                item.last_day_sessions || 0, 
                item.avg_daily_sessions || 0
            );
        });
    });
}

// Função auxiliar para formatar data
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (e) {
        return dateString;
    }
}

function renderMiniLineChart(canvasId, growthRate, lastDayValue, avgValue) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Define o tamanho baseado no container
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Gera dados simulando o período com pico no último dia
    const points = 30;
    const avgVal = avgValue || 50;
    const lastVal = lastDayValue || 50;
    
    const data = Array.from({length: points}, (_, i) => {
        if (i === points - 1) {
            // Último ponto = valor do último dia
            const maxValue = Math.max(avgVal, lastVal, 1);
            return height * 0.9 - ((lastVal / maxValue) * height * 0.7);
        } else {
            // Pontos anteriores = flutuação em torno da média
            const baseValue = avgVal;
            const noise = Math.sin(i * 0.4) * (avgVal * 0.15); // Variação de ±15%
            const value = Math.max(0, baseValue + noise);
            
            // Normaliza para o canvas
            const maxValue = Math.max(avgVal, lastVal, 1);
            const normalizedValue = height * 0.9 - ((value / maxValue) * height * 0.7);
            return Math.max(height * 0.1, Math.min(height * 0.9, normalizedValue));
        }
    });
    
    // Limpa o canvas
    ctx.clearRect(0, 0, width, height);
    
    // Define a cor da linha baseada no crescimento
    let color;
    if (growthRate > 0) color = '#22c55e';
    else if (growthRate < 0) color = '#ef4444';
    else color = '#9ca3af';
    
    // Desenha linha da média (referência)
    const maxValue = Math.max(avgVal, lastVal, 1);
    const avgLineY = height * 0.9 - ((avgVal / maxValue) * height * 0.7);
    
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, avgLineY);
    ctx.lineTo(width, avgLineY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
    
    // Desenha área preenchida
    ctx.fillStyle = color + '20'; // 20% opacity
    ctx.beginPath();
    ctx.moveTo(0, height);
    data.forEach((y, i) => {
        const x = (i / (points - 1)) * width;
        ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Desenha a linha principal
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((y, i) => {
        const x = (i / (points - 1)) * width;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Destaca o último ponto
    const lastX = width;
    const lastY = data[data.length - 1];
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, 2 * Math.PI);
    ctx.fill();
}

function renderHealthScores(data) {
    const container = document.getElementById('perf-health-container');
    if (!container || data.length === 0) {
        container.innerHTML = '<p class="text-adaptive-muted text-sm italic col-span-full">Nenhum dado disponível</p>';
        return;
    }
    
    // Extrai os valores globais máximos (são iguais para todas as lojas)
    const globalMaxSessions = data.length > 0 ? (data[0].max_sessions || 0) : 0;
    const globalMaxAparelhos = data.length > 0 ? (data[0].max_aparelhos || 0) : 0;
    
    let html = '';
    data.forEach((item, index) => {
        const score = item.health_score || 0;
        const circumference = 2 * Math.PI * 25; // Raio menor para cards compactos
        const offset = circumference - (score / 100) * circumference;
        
        // Cor baseada no score
        let color;
        if (score >= 80) color = '#22c55e';
        else if (score >= 60) color = '#eab308';
        else if (score >= 40) color = '#f97316';
        else color = '#ef4444';
        
        // Usa os componentes reais do banco ou calcula proporcionalmente
        const volumeScore = item.volume_score || Math.round(score * 0.4);
        const diversityScore = item.diversity_score || Math.round(score * 0.3);
        const consistencyScore = item.consistency_score || Math.round(score * 0.3);
        
        html += `
            <div class="glass-panel p-4 rounded-xl text-center health-card" 
                 data-store="${item.store_name}"
                 data-score="${score}"
                 data-volume="${volumeScore}"
                 data-diversity="${diversityScore}"
                 data-consistency="${consistencyScore}"
                 data-color="${color}"
                 data-total-sessions="${item.total_sessions || 0}"
                 data-qtd-aparelhos="${item.qtd_aparelhos || 0}"
                 data-qtd-dias="${item.qtd_dias || 0}"
                 data-max-sessions="${globalMaxSessions}"
                 data-max-aparelhos="${globalMaxAparelhos}"
                 data-avg-daily="${item.avg_daily_sessions || 0}"
                 data-stddev-daily="${item.stddev_daily_sessions || 0}">
                <p class="text-xs font-bold text-adaptive-muted uppercase tracking-wider mb-3 truncate" style="font-family: 'Archivo', sans-serif;">${item.store_name}</p>
                <svg class="health-gauge" viewBox="0 0 60 60">
                    <circle class="gauge-bg" cx="30" cy="30" r="25"></circle>
                    <circle class="gauge-fill" cx="30" cy="30" r="25" 
                            stroke="${color}"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}"
                            transform="rotate(-90 30 30)"></circle>
                    <text class="gauge-text" x="30" y="36" text-anchor="middle" style="font-size: 14px;">${Math.round(score)}</text>
                </svg>
                <p class="text-[9px] text-adaptive-muted mt-2 uppercase" style="font-family: 'Archivo', sans-serif;">Score de Saúde</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Aguarda o DOM ser atualizado antes de configurar listeners
    setTimeout(() => {
        // Adiciona event listeners para os cards
        const healthCards = container.querySelectorAll('.health-card');
        healthCards.forEach(card => {
            card.addEventListener('click', () => {
                console.log('Card clicado:', card.dataset.store);
                showStoreReport(card);
            });
        });
        
        console.log(`Configurados ${healthCards.length} cards de saúde`);
        
        // Se o detail view está aberto, atualiza com os dados novos do filtro
        const detailView = document.getElementById('health-detail-view');
        const titleEl = document.getElementById('store-report-title');
        if (detailView && !detailView.classList.contains('hidden') && titleEl) {
            const openStoreName = titleEl.textContent;
            const updatedCard = container.querySelector(`.health-card[data-store="${openStoreName}"]`);
            if (updatedCard) {
                console.log(`🔄 Atualizando detail view para "${openStoreName}" com dados do filtro`);
                showStoreReport(updatedCard);
            } else {
                // Loja não existe mais nos dados filtrados, volta para a lista de cards
                console.log(`⚠️ Loja "${openStoreName}" não encontrada nos dados filtrados, voltando para cards`);
                detailView.classList.add('hidden');
                const cardsView = document.getElementById('health-cards-view');
                if (cardsView) cardsView.classList.remove('hidden');
            }
        }
    }, 100);
}

function showStoreReport(card) {
    const storeName = card.dataset.store;
    const score = parseFloat(card.dataset.score);
    const volumeScore = parseFloat(card.dataset.volume);
    const diversityScore = parseFloat(card.dataset.diversity);
    const consistencyScore = parseFloat(card.dataset.consistency);
    const color = card.dataset.color;
    
    // Dados adicionais para auditoria
    const totalSessions = parseInt(card.dataset.totalSessions) || 0;
    const qtdAparelhos = parseInt(card.dataset.qtdAparelhos) || 0;
    const qtdDias = parseInt(card.dataset.qtdDias) || 0;
    
    // Oculta a view de cards e mostra a view detalhada
    const cardsView = document.getElementById('health-cards-view');
    const detailView = document.getElementById('health-detail-view');
    
    if (!cardsView || !detailView) {
        console.error('Views não encontradas');
        return;
    }
    
    cardsView.classList.add('hidden');
    detailView.classList.remove('hidden');
    
    // Atualiza o título e score principal
    const titleEl = document.getElementById('store-report-title');
    const scoreEl = document.getElementById('store-report-score');
    const gaugeEl = document.getElementById('store-report-gauge');
    
    if (titleEl) titleEl.textContent = storeName;
    if (scoreEl) scoreEl.textContent = Math.round(score);
    
    // Atualiza o gauge principal
    if (gaugeEl) {
        const circumference = 2 * Math.PI * 35;
        const offset = circumference - (score / 100) * circumference;
        gaugeEl.style.stroke = color;
        gaugeEl.style.strokeDashoffset = offset;
    }
    
    // Usa os valores reais do RPC (globais para todas as lojas)
    const maxSessions = parseInt(card.dataset.maxSessions) || totalSessions;
    const maxAparelhos = parseInt(card.dataset.maxAparelhos) || qtdAparelhos;
    
    // Calcula métricas de consistência usando valores reais do RPC
    const avgDaily = parseFloat(card.dataset.avgDaily) || (totalSessions / Math.max(qtdDias, 1));
    const stdDevDaily = parseFloat(card.dataset.stddevDaily) || 0;
    const coefficientVariation = avgDaily > 0 ? (stdDevDaily / avgDaily * 100) : 0;
    
    // Atualiza os campos de auditoria
    updateAuditField('audit-store-sessions', totalSessions.toLocaleString('pt-BR'));
    updateAuditField('audit-max-sessions', maxSessions.toLocaleString('pt-BR'));
    updateAuditField('audit-volume-percent', `${((totalSessions / maxSessions) * 100).toFixed(1)}%`);
    updateAuditField('audit-volume-score', volumeScore.toFixed(1));
    
    updateAuditField('audit-store-devices', qtdAparelhos.toString());
    updateAuditField('audit-max-devices', maxAparelhos.toString());
    updateAuditField('audit-diversity-percent', `${((qtdAparelhos / maxAparelhos) * 100).toFixed(1)}%`);
    updateAuditField('audit-diversity-score', diversityScore.toFixed(1));
    
    updateAuditField('audit-daily-avg', Math.round(avgDaily).toLocaleString('pt-BR'));
    updateAuditField('audit-daily-std', stdDevDaily.toFixed(1));
    updateAuditField('audit-consistency-cv', `${coefficientVariation.toFixed(1)}%`);
    updateAuditField('audit-consistency-score', consistencyScore.toFixed(1));
    
    // Atualiza o resumo final
    updateAuditField('final-volume-score', volumeScore.toFixed(1));
    updateAuditField('final-diversity-score', diversityScore.toFixed(1));
    updateAuditField('final-consistency-score', consistencyScore.toFixed(1));
    updateAuditField('final-total-score', Math.round(score).toString());
    
    // Configura o botão de voltar
    const backBtn = document.getElementById('health-back-btn');
    if (backBtn) {
        // Remove listeners anteriores
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        
        // Adiciona novo listener
        newBackBtn.addEventListener('click', () => {
            // Inicia animação de saída do relatório detalhado
            detailView.classList.add('slide-out');
            
            // Aguarda a animação terminar antes de trocar as views
            setTimeout(() => {
                detailView.classList.add('hidden');
                detailView.classList.remove('slide-out');
                
                // Mostra os cards com animação de entrada
                cardsView.classList.remove('hidden');
                cardsView.classList.add('slide-in');
                
                // Remove a classe de animação após terminar
                setTimeout(() => {
                    cardsView.classList.remove('slide-in');
                }, 400);
                
                // Reconfigura o botão de informações
                setTimeout(() => {
                    setupHealthInfoToggle();
                }, 100);
            }, 400); // Tempo da animação de saída
        });
    }
}

function updateAuditField(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setupHealthInfoToggle() {
    const toggleBtn = document.getElementById('health-info-toggle');
    const infoPanel = document.getElementById('health-info-panel');
    
    if (!toggleBtn || !infoPanel) {
        console.warn('Health info toggle elements not found');
        return;
    }
    
    // Remove listeners anteriores
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    // Estado inicial: oculto
    let isInfoOpen = false;
    
    newToggleBtn.addEventListener('click', () => {
        isInfoOpen = !isInfoOpen;
        
        if (isInfoOpen) {
            // Abre o painel
            infoPanel.classList.remove('info-hidden');
            infoPanel.classList.add('info-open');
            newToggleBtn.classList.add('active');
        } else {
            // Fecha o painel
            infoPanel.classList.remove('info-open');
            infoPanel.classList.add('info-hidden');
            newToggleBtn.classList.remove('active');
        }
    });
    
    console.log('Health info toggle configurado');
}


