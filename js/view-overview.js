// js/view-overview.js
import { appData } from './services/dataManager.js';

Chart.register(ChartDataLabels);

let chartInstances = {};
let insightTimeout = null;
let unsubscribeData = null;
let growthMode = 'week'; // Estado global do seletor de crescimento (day/week/month) - padrão: semana

export const getOverviewHTML = () => {
    const showWelcome = !sessionStorage.getItem('ps_welcome_shown');

    return `
        <style>
            #view-overview-wrapper { font-family: 'Archivo', sans-serif; }
            
            .glass-panel { background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-adaptive-strong { color: var(--text-muted-strong); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .text-glow-accent { text-shadow: var(--glow-accent); }
            .neon-accent { background: var(--neon-bg); }
            .divide-adaptive > div { border-color: var(--glass-border); }
            
            /* KPI Cards — Frosted Glass (mais sólido que glass-panel para hierarquia visual) */
            .kpi-frost {
                background: rgba(22, 22, 28, 0.55) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.10) !important;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
            }
            body:not(.dark) .kpi-frost {
                background: rgba(255, 255, 255, 0.70) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.95) !important;
                box-shadow: 0 4px 24px rgba(15, 23, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 1) !important;
            }
            .kpi-main-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 10px;
            }
            .kpi-sparkline {
                display: block;
                flex: 1 1 0%;
                min-width: 40px;
                height: 44px;
            }

            /* Sparkline Tooltip */
            .spark-tooltip {
                position: absolute;
                display: none;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: 5px 10px;
                border-radius: 8px;
                pointer-events: none;
                z-index: 100;
                white-space: nowrap;
                font-family: 'Archivo', sans-serif;
                transition: left 0.1s ease, top 0.1s ease;
            }
            body.dark .spark-tooltip {
                background: rgba(18, 19, 23, 0.92);
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            }
            body:not(.dark) .spark-tooltip {
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid rgba(0,0,0,0.08);
                box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            }
            .spark-tooltip-date {
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--text-muted);
            }
            .spark-tooltip-value {
                font-family: 'Geist', sans-serif;
                font-size: 12px;
                font-weight: 800;
                color: var(--text-main);
            }

            /* KPI Delta (comparativo período) */
            .kpi-delta {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-family: 'Geist', sans-serif;
                font-size: 11px;
                font-weight: 700;
                white-space: nowrap;
                margin-top: 6px;
            }
            .kpi-delta-arrow {
                font-size: 10px;
                line-height: 1;
            }
            .kpi-delta-value {
                font-size: 11px;
            }
            .kpi-delta-label {
                font-family: 'Archivo', sans-serif;
                font-size: 9px;
                font-weight: 600;
                letter-spacing: 0.05em;
                opacity: 0.7;
                text-transform: uppercase;
            }
            /* Positivo: azul-índigo frio */
            .kpi-delta-up {
                color: #818cf8;
            }
            /* Negativo: âmbar frio / slate */
            .kpi-delta-down {
                color: #94a3b8;
            }
            /* Neutro */
            .kpi-delta-flat {
                color: #64748b;
            }

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
            
            /* Seletor de Período de Crescimento */
            .growth-period-selector {
                display: flex;
                background: var(--input-bg);
                padding: 4px;
                border-radius: 12px;
                border: 1px solid var(--glass-border);
                gap: 4px;
            }
            
            .growth-period-btn {
                padding: 6px 14px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
                background: transparent;
            }
            
            body.dark .growth-period-btn {
                color: rgba(255, 255, 255, 0.5);
            }
            
            body:not(.dark) .growth-period-btn {
                color: rgba(0, 0, 0, 0.5);
            }
            
            .growth-period-btn.active {
                background: #685BC7 !important;
                color: #e4e4e4 !important;
                box-shadow: 0 2px 8px rgba(104, 91, 199, 0.3);
            }
            
            .growth-period-btn:hover:not(.active) {
                background: rgba(104, 91, 199, 0.1);
            }

            /* Insight Rotation Animation */
            .insight-slide-out {
                animation: insightSlideOut 0.5s ease-out forwards;
            }
            
            .insight-slide-in {
                animation: insightSlideIn 0.5s ease-out forwards;
            }
            
            @keyframes insightSlideOut {
                from { 
                    opacity: 1; 
                    transform: translateY(0);
                }
                to { 
                    opacity: 0; 
                    transform: translateY(-20px);
                }
            }
            
            @keyframes insightSlideIn {
                from { 
                    opacity: 0; 
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0);
                }
            }

            /* Insight Fade Animation */
            .insight-fade-out {
                animation: insightFadeOut 0.3s ease-out forwards;
            }
            
            .insight-fade-in {
                animation: insightFadeIn 0.3s ease-out forwards;
            }
            
            @keyframes insightFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes insightFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            /* EYE CANDY: Animações de Entrada */
            @keyframes slideUpFade {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOutWelcome {
                to { opacity: 0; height: 0; margin-bottom: 0; padding: 0; overflow: hidden; }
            }
            
            @keyframes smoothEntrance {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .anim-cascade { opacity: 0; animation: smoothEntrance 0.3s ease-in-out forwards; }
            
            .welcome-msg { animation: slideUpFade 0.8s ease forwards; }
            .welcome-msg.hide { animation: fadeOutWelcome 0.5s ease forwards; }
            
            /* Cascata de entrada */
            .delay-1 { animation-delay: 0.1s; }
            .delay-2 { animation-delay: 0.2s; }
            .delay-3 { animation-delay: 0.3s; }
            .delay-4 { animation-delay: 0.4s; }

            /* Transição de título */
            #title-timeline { transition: opacity 0.3s ease; }

            /* KPI Grid Responsivo */
            .kpi-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
            }
            @media (min-width: 768px) {
                .kpi-grid { gap: 24px; }
            }
            .kpi-card {
                flex: 1 1 0%;
                min-width: 0;
            }
            /* Quando a viewport aperta, vira 2x2 */
            @media (max-width: 1100px) {
                .kpi-card {
                    flex: 1 1 calc(50% - 12px);
                    min-width: calc(50% - 12px);
                }
            }

            /* Textos responsivos dos KPIs */
            .kpi-value-responsive {
                font-size: clamp(1.5rem, 3.5vw, 3rem);
                line-height: 1.1;
                margin-top: auto;
            }
            .kpi-label-responsive {
                font-size: clamp(8px, 1vw, 11px);
                letter-spacing: clamp(0.15em, 0.3vw, 0.3em);
                overflow: hidden;
                text-overflow: ellipsis;
            }
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

            <div id="insight-box" class="anim-cascade delay-1 glass-panel p-5 md:p-6 rounded-2xl relative flex items-center gap-5 mb-6 md:mb-8 transition-all">
                <div class="bg-gradient-to-br from-[#685BC7] to-[#8b5cf6] px-4 py-2 rounded-xl ds-badge-text shadow-lg shadow-[#685BC7]/30 shrink-0 self-center" style="color:#ffffff;">INSIGHT</div>
                <p id="insight-text" class="ds-insight-text" style="width: 120%; font-style: normal;"></p>
            </div>

            <div class="anim-cascade delay-2 kpi-grid mb-8 md:mb-10 relative z-50">
                <!-- KPI: Volume de Sessões -->
                <div class="kpi-frost rounded-2xl p-6 md:p-8 flex flex-col justify-between relative z-10 kpi-card" style="min-height:148px;">
                    <div class="kpi-main-row">
                        <h3 id="k-sess" class="ds-kpi-value kpi-value-responsive text-glow" style="flex-shrink:0;">0</h3>
                        <canvas id="spark-sess" class="kpi-sparkline"></canvas>
                    </div>
                    <div>
                        <div id="k-sess-delta" class="kpi-delta kpi-delta-flat" style="display:none;">
                            <span id="k-sess-delta-arrow" class="kpi-delta-arrow">→</span>
                            <span id="k-sess-delta-value" class="kpi-delta-value">—</span>
                            <span id="k-sess-delta-label" class="kpi-delta-label">vs sem. ant.</span>
                        </div>
                        <p class="ds-kpi-label kpi-label-responsive mt-2">Volume de Sessões</p>
                    </div>
                </div>
                <!-- KPI: Pontos de Venda -->
                <div class="kpi-frost rounded-2xl p-6 md:p-8 flex flex-col justify-between relative z-10 kpi-card" style="min-height:148px;">
                    <div class="kpi-main-row">
                        <h3 id="k-sto" class="ds-kpi-value kpi-value-responsive leading-tight" style="flex-shrink:0;">0</h3>
                        <canvas id="spark-sto" class="kpi-sparkline"></canvas>
                    </div>
                    <div>
                        <div id="k-sto-delta" class="kpi-delta kpi-delta-flat" style="display:none;">
                            <span id="k-sto-delta-arrow" class="kpi-delta-arrow">→</span>
                            <span id="k-sto-delta-value" class="kpi-delta-value">—</span>
                            <span id="k-sto-delta-label" class="kpi-delta-label">vs sem. ant.</span>
                        </div>
                        <p class="ds-kpi-label kpi-label-responsive mt-2">Pontos de Venda</p>
                    </div>
                </div>
                <!-- KPI: Aparelhos Ativos -->
                <div class="kpi-frost rounded-2xl p-6 md:p-8 flex flex-col justify-between relative z-10 group cursor-help kpi-card" style="min-height:148px;">
                    <div class="kpi-main-row">
                        <h3 id="k-dev" class="ds-kpi-value kpi-value-responsive" style="flex-shrink:0;">0</h3>
                        <canvas id="spark-dev" class="kpi-sparkline"></canvas>
                    </div>
                    <div>
                        <div id="k-dev-delta" class="kpi-delta kpi-delta-flat" style="display:none;">
                            <span id="k-dev-delta-arrow" class="kpi-delta-arrow">→</span>
                            <span id="k-dev-delta-value" class="kpi-delta-value">—</span>
                            <span id="k-dev-delta-label" class="kpi-delta-label">vs sem. ant.</span>
                        </div>
                        <p class="ds-kpi-label kpi-label-responsive mt-2 flex items-center gap-1.5">
                            Aparelhos Ativos
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                        </p>
                        <div id="k-dev-tooltip" class="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-4 w-max min-w-[200px] max-w-sm bg-[rgba(18,19,23,0.95)] backdrop-blur-xl text-[10px] p-5 rounded-2xl shadow-2xl z-50 border border-white/10 whitespace-nowrap font-medium" style="color:#e4e4e4;"></div>
                    </div>
                </div>
                <!-- KPI: Média por Dia -->
                <div class="kpi-frost rounded-2xl p-6 md:p-8 flex flex-col justify-between relative z-10 kpi-card" style="min-height:148px;">
                    <div class="kpi-main-row">
                        <h3 id="k-avg" class="ds-kpi-value kpi-value-responsive text-glow-accent" style="flex-shrink:0;">0</h3>
                        <canvas id="spark-avg" class="kpi-sparkline"></canvas>
                    </div>
                    <div>
                        <div id="k-avg-delta" class="kpi-delta kpi-delta-flat" style="display:none;">
                            <span id="k-avg-delta-arrow" class="kpi-delta-arrow">→</span>
                            <span id="k-avg-delta-value" class="kpi-delta-value">—</span>
                            <span id="k-avg-delta-label" class="kpi-delta-label">vs sem. ant.</span>
                        </div>
                        <p class="ds-kpi-label kpi-label-responsive mt-2 text-[#685BC7]">Média por Dia</p>
                    </div>
                </div>
            </div>

            <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-2xl relative z-10 mb-6 md:mb-8">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h4 id="title-growth" class="ds-chart-title mb-2">Evolução de Interações por Semana</h4>
                    </div>
                    
                    <div class="growth-period-selector">
                        <button id="growth-mode-day" class="growth-period-btn ds-mode-btn">Dia</button>
                        <button id="growth-mode-week" class="growth-period-btn ds-mode-btn active">Semana</button>
                        <button id="growth-mode-month" class="growth-period-btn ds-mode-btn">Mês</button>
                    </div>
                </div>
                <div id="growth-chart-wrapper" class="chart-container" style="height: 320px;"><canvas id="c-growth"></canvas></div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-2xl relative z-10">
                    <h4 class="ds-chart-title mb-8">Frequência de Interação por Hora</h4>
                    <div class="chart-container" style="height: 280px;"><canvas id="c-time"></canvas></div>
                </div>
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-2xl relative z-10">
                    <h4 class="ds-chart-title mb-8">Engajamento por Rede</h4>
                    <div class="chart-container" style="height: 280px;"><canvas id="c-rede"></canvas></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-2xl relative z-10 flex flex-col">
                    <h4 class="ds-chart-title mb-6">Interações por Local</h4>
                    <div id="rank-shop" class="flex flex-col gap-4"></div>
                </div>
                
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-2xl relative z-10 flex flex-col">
                    <h4 class="ds-chart-title mb-6">Interações por Linha</h4>
                    <div id="rank-linha" class="flex flex-col gap-4"></div>
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
    if (insightTimeout) {
        clearInterval(insightTimeout);
        insightTimeout = null;
    }
    if (insightRotationInterval) {
        clearInterval(insightRotationInterval);
        insightRotationInterval = null;
    }
    if (insightTypewriterInterval) {
        clearInterval(insightTypewriterInterval);
        insightTypewriterInterval = null;
    }
    if (unsubscribeData) { 
        unsubscribeData(); 
        unsubscribeData = null; 
    }
};

export const renderOverviewCharts = () => {
    const welcome = document.getElementById('welcome-container');
    if (welcome) {
        sessionStorage.setItem('ps_welcome_shown', 'true');
        setTimeout(() => {
            welcome.classList.add('hide');
            setTimeout(() => welcome.remove(), 500);
        }, 5000);
    }

    // Configuração do Seletor de Crescimento (Dia/Semana/Mês)
    const btnGrowthDay = document.getElementById('growth-mode-day');
    const btnGrowthWeek = document.getElementById('growth-mode-week');
    const btnGrowthMonth = document.getElementById('growth-mode-month');
    const titleGrowth = document.getElementById('title-growth');

    const updateGrowthTitle = () => {
        if (!titleGrowth) return;
        titleGrowth.style.opacity = 0;
        setTimeout(() => {
            if (growthMode === 'day') {
                titleGrowth.innerText = 'Evolução de Interações por Dia';
            } else if (growthMode === 'week') {
                titleGrowth.innerText = 'Evolução de Interações por Semana';
            } else {
                titleGrowth.innerText = 'Evolução de Interações por Mês';
            }
            titleGrowth.style.opacity = 1;
        }, 150);
    };

    if (btnGrowthDay && btnGrowthWeek && btnGrowthMonth) {
        btnGrowthDay.onclick = () => {
            if(growthMode === 'day') return;
            growthMode = 'day';
            btnGrowthDay.classList.add('active');
            btnGrowthWeek.classList.remove('active');
            btnGrowthMonth.classList.remove('active');
            updateGrowthTitle();
            executeRenderLogic();
        };

        btnGrowthWeek.onclick = () => {
            if(growthMode === 'week') return;
            growthMode = 'week';
            btnGrowthWeek.classList.add('active');
            btnGrowthDay.classList.remove('active');
            btnGrowthMonth.classList.remove('active');
            updateGrowthTitle();
            executeRenderLogic();
        };

        btnGrowthMonth.onclick = () => {
            if(growthMode === 'month') return;
            growthMode = 'month';
            btnGrowthMonth.classList.add('active');
            btnGrowthDay.classList.remove('active');
            btnGrowthWeek.classList.remove('active');
            updateGrowthTitle();
            executeRenderLogic();
        };
    }

    // Passa a reagir aos filtros solicitando os dados do banco
    unsubscribeData = appData.subscribe(async () => {
        await executeRenderLogic();
    });

    executeRenderLogic();
};

let currentRenderToken = 0; // Trava de segurança global da tela
let insightRotationInterval = null;
let insightTypewriterInterval = null;
let currentInsightIndex = 0;

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

// Gera as variantes de insights baseadas nos dados
function generateInsights(dbData) {
    const insights = [];
    
    // Insight 1: Aparelho com mais tração
    const aparelhosArray = dbData.aparelhos || [];
    const topDev = [...aparelhosArray].sort((a,b) => b.total - a.total)[0];
    if (topDev && topDev.total > 0) {
        insights.push(`O modelo ${topDev.aparelho} registrou a maior tração com ${Math.round(topDev.total).toLocaleString('pt-BR')} interações validadas.`);
    }
    
    // Insight 2: Rede com mais interações
    const redeArray = dbData.rede || [];
    if (redeArray.length > 0) {
        const topRede = [...redeArray].sort((a,b) => b.total - a.total)[0];
        if (topRede && topRede.rede && topRede.total > 0) {
            insights.push(`A rede ${topRede.rede} concentra ${Math.round(topRede.total).toLocaleString('pt-BR')} interações, liderando o engajamento no período.`);
        }
    }
    
    // Insight 3: Loja com mais interações
    // NOTA: Requer atualização da RPC get_overview_metrics para incluir top_store nos kpis
    // Ver: BACKUPS/== SUPABASE BACKUP/README_OVERVIEW_UPDATE.md
    if (dbData.kpis && dbData.kpis.top_store) {
        insights.push(`O PDV ${dbData.kpis.top_store} lidera o ranking de engajamento no período analisado.`);
    }
    
    // Insight 4: Linha de produto com mais tração
    const linhaArray = dbData.linha || [];
    if (linhaArray.length > 0) {
        const topLinha = [...linhaArray].sort((a,b) => b.total - a.total)[0];
        if (topLinha && topLinha.linha_de_produto && topLinha.total > 0) {
            insights.push(`A linha ${topLinha.linha_de_produto} demonstra maior adesão com ${Math.round(topLinha.total).toLocaleString('pt-BR')} interações validadas.`);
        }
    }
    
    // Fallback se não houver dados suficientes
    if (insights.length === 0) {
        insights.push('Aguardando massa de dados para análise preditiva.');
    }
    
    return insights;
}

// Atualiza o texto do insight com fade
function updateInsightText(element, text, callback) {
    // Fade out
    element.classList.add('insight-fade-out');
    
    setTimeout(() => {
        element.innerText = text;
        element.classList.remove('insight-fade-out');
        element.classList.add('insight-fade-in');
        
        setTimeout(() => {
            element.classList.remove('insight-fade-in');
            if (callback) callback();
        }, 300);
    }, 300);
}

// Inicia a rotação de insights
function startInsightRotation(dbData) {
    const el = document.getElementById('insight-text');
    if (!el) return;
    
    // Limpa rotação anterior
    if (insightRotationInterval) {
        clearInterval(insightRotationInterval);
        insightRotationInterval = null;
    }
    if (insightTimeout) {
        clearInterval(insightTimeout);
        insightTimeout = null;
    }
    if (insightTypewriterInterval) {
        clearInterval(insightTypewriterInterval);
        insightTypewriterInterval = null;
    }
    
    const insights = generateInsights(dbData);
    
    // Se só tem 1 insight, não rotaciona
    if (insights.length <= 1) {
        updateInsightText(el, insights[0]);
        return;
    }
    
    currentInsightIndex = 0;
    
    // Mostra o primeiro insight
    updateInsightText(el, insights[currentInsightIndex]);
    
    // Rotaciona a cada 5 segundos
    insightRotationInterval = setInterval(() => {
        // Fade out
        el.classList.add('insight-fade-out');
        
        setTimeout(() => {
            // Atualiza o índice para o PRÓXIMO insight
            currentInsightIndex = (currentInsightIndex + 1) % insights.length;
            
            // Remove animação de saída
            el.classList.remove('insight-fade-out');
            
            // Adiciona animação de entrada
            el.classList.add('insight-fade-in');
            
            // Mostra novo insight com fade
            el.innerText = insights[currentInsightIndex];
            
            // Remove animação de entrada após completar
            setTimeout(() => {
                el.classList.remove('insight-fade-in');
            }, 300);
        }, 300);
    }, 5000);
}

async function executeRenderLogic() {
    // 1. Gera um "ticket" exclusivo para este clico de renderização
    const renderToken = ++currentRenderToken;

    // Mostra loading nos KPIs com fade
    const kpiSpinner = '<div class="flex items-center justify-center"><div class="kpi-spinner"></div></div>';
    updateKPIWithFade('k-sess', kpiSpinner, true);
    updateKPIWithFade('k-sto', kpiSpinner, true);
    updateKPIWithFade('k-dev', kpiSpinner, true);
    updateKPIWithFade('k-avg', kpiSpinner, true);
    
    // Esconde deltas durante o loading
    ['k-sess-delta','k-sto-delta','k-dev-delta','k-avg-delta'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Mostra spinner nos gráficos
    const chartContainers = ['c-time', 'c-rede', 'c-growth'];
    chartContainers.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const container = canvas.parentElement;
            if (!container.querySelector('.spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                container.appendChild(spinner);
                canvas.style.display = 'none';
            }
        }
    });

    try {
        const dbData = await appData.fetchOverviewRPC();

        // 2. ANTICOLISÃO: Se um filtro mais recente foi clicado enquanto esperávamos a rede, aborte e deixe o novo assumir.
        if (renderToken !== currentRenderToken) return;

        // 3. SEGURANÇA DE DOM: Garante que o usuário não mudou de tela enquanto a requisição carregava
        if (!document.getElementById('view-overview-wrapper')) return;

        Object.keys(chartInstances).forEach(id => {
            if(chartInstances[id]) chartInstances[id].destroy();
        });
        chartInstances = {};
        if (insightTimeout) clearInterval(insightTimeout);

       // 1. Se a rede falhou completamente (dbData é null)
        if (!dbData) {
            document.getElementById('insight-text').innerText = '⚠️ Conexão interrompida pelo navegador. Recarregue a página ou clique em um filtro para reconectar.';
            return; // Interrompe aqui, não zera os números à força, apenas avisa.
        }

        // 2. Se a rede funcionou, mas os filtros não trouxeram nenhum resultado matematicamente
        if (!dbData.kpis || dbData.kpis.total_sessions === 0) {
            updateKPIWithFade('k-sess', '0');
            updateKPIWithFade('k-sto', '0');
            updateKPIWithFade('k-dev', '0');
            updateKPIWithFade('k-avg', '0');
            ['k-sess-delta','k-sto-delta','k-dev-delta','k-avg-delta'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            document.getElementById('insight-text').innerText = 'Aguardando dados estruturados para processamento analítico.';
            return;
        }
        
        // KPIs (Direto do Banco)
        const totalSess = dbData.kpis.total_sessions;
        const stores = dbData.kpis.unique_stores;
        const devices = dbData.kpis.unique_devices;
        const periodDays = dbData.kpis.period_days || 1;
        const avgPerDay = periodDays ? Math.round(totalSess / periodDays) : 0;
        
        updateKPIWithFade('k-sess', Math.round(totalSess).toLocaleString('pt-BR'));
        updateKPIWithFade('k-sto', stores.toString());
        updateKPIWithFade('k-dev', devices.toString());
        updateKPIWithFade('k-avg', avgPerDay.toLocaleString('pt-BR'));

        // ── Sparklines ──────────────────────────────────────────────
        // Cada KPI tem sua própria série temporal derivada da timeline diária
        const timelineRaw = dbData.timeline || [];

        // Agrega timeline por dia (a RPC retorna por dia+linha_de_produto)
        const dailyMap = {};
        timelineRaw.forEach(d => {
            const date = d.pure_date || d.date || '';
            if (!dailyMap[date]) dailyMap[date] = 0;
            dailyMap[date] += (d.total || 0);
        });
        const sortedDays = Object.keys(dailyMap).sort();
        const sessSeries = sortedDays.map(d => dailyMap[d]);

        // PDVs únicos por dia: conta store_name distintos por data nos dados brutos filtrados
        const filteredData = appData.getFilteredData();
        const storesByDay = {};
        const devicesByDay = {};
        filteredData.forEach(row => {
            const d = row.pure_date;
            if (!d) return;
            if (!storesByDay[d])  storesByDay[d]  = new Set();
            if (!devicesByDay[d]) devicesByDay[d] = new Set();
            if (row.store_name)  storesByDay[d].add(row.store_name);
            if (row.device_code) devicesByDay[d].add(row.device_code);
        });
        // Usa as mesmas datas ordenadas para manter alinhamento
        const stoSeries = sortedDays.map(d => storesByDay[d]  ? storesByDay[d].size  : 0);
        const devSeries = sortedDays.map(d => devicesByDay[d] ? devicesByDay[d].size : 0);

        // Média/dia: sessões ÷ dias acumulados (média móvel simples)
        const avgSeries = sessSeries.map((v, i) => {
            const slice = sessSeries.slice(Math.max(0, i - 6), i + 1); // janela de 7 dias
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });

        // Datas ordenadas para labels das sparklines
        const sparkDates = sortedDays;

        drawSparkline('spark-sess', sessSeries, sparkDates, 'sessões');
        drawSparkline('spark-sto',  stoSeries,  sparkDates, 'PDVs');
        drawSparkline('spark-dev',  devSeries,  sparkDates, 'aparelhos');
        drawSparkline('spark-avg',  avgSeries,  sparkDates, 'méd/dia', true);

        // ── Comparativo período atual vs anterior ────────────────────
        // Sem filtro de data → "vs sem. ant." (última semana vs penúltima, calculado pela RPC)
        // Com filtro de data → "vs per. ant." (período selecionado vs período equivalente anterior)
        const hasDateFilter = !!(appData.currentFilters['pure_date'] && appData.currentFilters['pure_date'].length > 0);
        const deltaLabel = hasDateFilter ? 'vs per. ant.' : 'vs sem. ant.';

        // Quando sem filtro: usa current_week_* (semana atual) vs previous_* (semana anterior)
        // Quando com filtro: total_sessions É o período filtrado, previous_* é o anterior
        const currSess    = hasDateFilter ? totalSess : (dbData.kpis.current_week_sessions ?? totalSess);
        const currStores  = hasDateFilter ? stores    : (dbData.kpis.current_week_stores ?? stores);
        const currDevices = hasDateFilter ? devices   : (dbData.kpis.current_week_devices ?? devices);

        const prevSess    = dbData.kpis.previous_period_sessions ?? null;
        const prevStores  = dbData.kpis.previous_unique_stores ?? null;
        const prevDevices = dbData.kpis.previous_unique_devices ?? null;

        // Sessões
        updateKPIDelta('k-sess', currSess, prevSess, deltaLabel);

        // PDVs
        updateKPIDelta('k-sto', currStores, prevStores, deltaLabel);

        // Aparelhos
        updateKPIDelta('k-dev', currDevices, prevDevices, deltaLabel);

        // Média/dia
        const prevRangeDays = dbData.kpis.prev_range_days ?? dbData.kpis.previous_period_days ?? 7;
        const prevAvg = (prevSess !== null && prevRangeDays > 0)
            ? Math.round(prevSess / prevRangeDays)
            : null;
        updateKPIDelta('k-avg', avgPerDay, prevAvg, deltaLabel);
        
        // Tooltip: Aparelhos Ativos por Linha de Produto
        // Usa os dados brutos filtrados para contar device_code únicos por linha
        const aparelhosPorLinha = {};
        filteredData.forEach(row => {
            const linha = row.linha_de_produto || 'N/A';
            const deviceCode = row.device_code;
            
            if (!aparelhosPorLinha[linha]) {
                aparelhosPorLinha[linha] = new Set();
            }
            if (deviceCode) {
                aparelhosPorLinha[linha].add(deviceCode);
            }
        });
        
        // Converte para array e ordena por quantidade de aparelhos
        const sortedLinhasList = Object.entries(aparelhosPorLinha)
            .map(([linha, deviceSet]) => [linha, deviceSet.size])
            .sort((a, b) => b[1] - a[1]);

        document.getElementById('k-dev-tooltip').innerHTML = '<p class="ds-sidebar-title text-[#685BC7] mb-3 border-b border-white/10 pb-3">Aparelhos Ativos por Linha de Produto</p>' + 
            (sortedLinhasList.length > 0 
                ? sortedLinhasList.map(v => `<div class="mt-2.5 flex items-center justify-between gap-6"><span class="opacity-90">${v[0]}</span> <span class="font-black font-numbers text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-md border border-[#8b5cf6]/20">${v[1]}</span></div>`).join('') 
                : '<div class="opacity-50 mt-2">Nenhuma linha detectada</div>');
                
        // Sistema de Insights Rotativos
        startInsightRotation(dbData);

        // Agrupamentos Locais com Proteção (fallback para [])
        let ruaTotal = 0, shopTotal = 0;
        const redeByShopType = { 'Shopping': {}, 'Loja de Rua': {} };
        (dbData.shop || []).forEach(d => {
            const tipoOriginal = (d.shopping || '').toUpperCase().trim();
            if (tipoOriginal === 'LOJA DE RUA') ruaTotal += d.total;
            else shopTotal += d.total;
        });
        // Monta breakdown de rede por tipo de local a partir dos dados brutos
        (appData.getFilteredData()).forEach(row => {
            const tipo = (row.shopping || '').toUpperCase().trim() === 'LOJA DE RUA' ? 'Loja de Rua' : 'Shopping';
            const rede = row.rede || 'N/A';
            if (!redeByShopType[tipo][rede]) redeByShopType[tipo][rede] = 0;
            redeByShopType[tipo][rede] += (row.sessions || 0);
        });

        const linhaAgg = {};
        (dbData.linha || []).forEach(d => {
            const linha = (d.linha_de_produto || 'N/A').toUpperCase().trim();
            linhaAgg[linha] = (linhaAgg[linha] || 0) + d.total;
        });
        const sortedLinhas = Object.keys(linhaAgg).sort((a,b) => linhaAgg[b] - linhaAgg[a]);

        // Disparo dos Gráficos
        drawChart('c-time', 'line', aggregateData((dbData.faixa || []), 'faixa', true), true);
        drawChart('c-rede', 'bar', aggregateData((dbData.rede || []), 'rede', false, true));
        // Shopping primeiro, Loja de Rua segundo
        drawChart('c-shop', 'ranked-bar', { labels: ['Shopping', 'Loja de Rua'], values: [shopTotal, ruaTotal], redeByType: redeByShopType });
        // Interações por Linha com drilldown para modelos
        const modelosPorLinha = {};
        (dbData.modelos_por_linha || []).forEach(d => {
            const linha = (d.linha_de_produto || 'N/A').toUpperCase().trim();
            if (!modelosPorLinha[linha]) modelosPorLinha[linha] = {};
            modelosPorLinha[linha][d.modelo] = (modelosPorLinha[linha][d.modelo] || 0) + d.total;
        });
        drawChart('c-linha', 'ranked-bar', { labels: sortedLinhas, values: sortedLinhas.map(l => linhaAgg[l]), modelosPorLinha });
        
        // Gráfico de Crescimento (com suporte a dia/semana/mês)
        let growthData;
        if (growthMode === 'day') {
            growthData = dbData.timeline || [];
        } else if (growthMode === 'week') {
            growthData = dbData.weekly_growth || [];
        } else {
            growthData = dbData.monthly_growth || [];
        }
        drawGrowthChart('c-growth', growthData, growthMode);

    } catch (e) {
        console.error("Crash interceptado na renderização visual:", e);
    } finally {
        // Remove loading de todos os gráficos
        const chartContainers = ['c-time', 'c-rede', 'c-growth'];
        chartContainers.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const container = canvas.parentElement;
                const spinner = container.querySelector('.spinner');
                if (spinner) spinner.remove();
                canvas.style.display = 'block';
            }
        });
    }
}

// ==========================================
// AGRUPAMENTO PADRÃO COM TOOLTIP POR LINHA
// ==========================================
function aggregateData(dataArray, key, isT = false, isR = false) {
    const g = dataArray.reduce((acc, o) => { 
        const k = o[key] || 'N/A'; 
        const sess = Number(o.total) || 0;  // Alterado para ler do objeto agrupado do Banco
        const linha = o.linha_de_produto || 'N/A';
        
        if (!acc[k]) acc[k] = { total: 0, linhas: {} };
        acc[k].total += sess; 
        acc[k].linhas[linha] = (acc[k].linhas[linha] || 0) + sess; 
        return acc; 
    }, {});
    
    let entries = Object.entries(g);
    if(isT) entries.sort((a,b) => a[0].localeCompare(b[0]));
    if(isR) entries.sort((a,b) => b[1].total - a[1].total);
    
    return { 
        labels: entries.map(e => e[0]), 
        values: entries.map(e => e[1].total), 
        tooltipData: entries.reduce((acc, e) => { acc[e[0]] = e[1].linhas; return acc; }, {}) 
    };
}

// ==========================================
// PLUGINS VISUAIS
// ==========================================
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
            ctx.save(); ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1; ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
            ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore();
        }
    }
};

const doughnutCustomLabelPlugin = {
    id: 'doughnutCustomLabel',
    afterDraw: chart => {
        if (chart.config.type !== 'doughnut') return;
        const ctx = chart.ctx;
        const isDark = document.body.classList.contains('dark');
        const lineColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
        const textColor = isDark ? '#e4e4e4' : '#131417';
        
        const meta = chart.getDatasetMeta(0);
        const dataset = chart.data.datasets[0];
        const total = dataset.data.reduce((a, b) => a + b, 0);
        if (total === 0) return;

        // 1. Extrai as posições brutas
        let labelsInfo = meta.data.map((arc, i) => {
            const data = dataset.data[i];
            if(!data) return null;
            
            const angle = (arc.startAngle + arc.endAngle) / 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const radius = arc.outerRadius;
            
            return {
                i, arc, cos, sin,
                side: cos >= 0 ? 'right' : 'left',
                y: arc.y + sin * (radius + 15),
                xStart: arc.x + cos * radius,
                yStart: arc.y + sin * radius,
                labelText: chart.data.labels[i].toUpperCase(),
                perc: (data * 100 / total).toFixed(1).replace('.', ',') + '%'
            };
        }).filter(Boolean);

        // 2. Agrupa por lado e resolve as colisões no eixo Y
        const sides = { 
            right: labelsInfo.filter(l => l.side === 'right').sort((a,b) => a.y - b.y), 
            left: labelsInfo.filter(l => l.side === 'left').sort((a,b) => a.y - b.y) 
        };

        const resolveCollisions = (arr) => {
            const minYDist = 18; // Distância mínima garantida entre labels
            for(let i=1; i<arr.length; i++) {
                if(arr[i].y - arr[i-1].y < minYDist) {
                    arr[i].y = arr[i-1].y + minYDist;
                }
            }
        };
        resolveCollisions(sides.right);
        resolveCollisions(sides.left);

        // 3. Renderiza as linhas e os textos nas coordenadas ajustadas
        ctx.save();
        [...sides.right, ...sides.left].forEach(l => {
            const elbowX = l.arc.x + l.cos * (l.arc.outerRadius + 15);
            const textX = elbowX + (l.side === 'right' ? 15 : -15);
            
            ctx.beginPath();
            ctx.moveTo(l.xStart, l.yStart);
            ctx.lineTo(elbowX, l.y); // Diagonal para acomodar a colisão
            ctx.lineTo(textX, l.y);  // Tracinho horizontal
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.font = '800 10px Archivo';
            ctx.textAlign = l.side === 'right' ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${l.labelText} (${l.perc})`, textX + (l.side === 'right' ? 5 : -5), l.y);
        });
        ctx.restore();
    }
};

// ==========================================
// SPARKLINE (canvas inline, sem Chart.js) + Tooltip
// ==========================================
// Armazena metadados das sparklines para o tooltip
const sparklineMeta = {};

function drawSparkline(canvasId, values, labels, unit, isAccent = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width)  || 100;
    const h = Math.round(rect.height) || 44;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    // Fixa o tamanho CSS para evitar desalinhamento com o mouse
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const data = (values && values.length > 1) ? values : [0, 0];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pad = 2;
    const pts = data.map((v, i) => ({
        x: pad + (i / (data.length - 1)) * (w - pad * 2),
        y: h - pad - ((v - min) / range) * (h - pad * 2)
    }));

    const isDark = document.body.classList.contains('dark');
    const lineColor  = isAccent ? '#685BC7' : (isDark ? '#818cf8' : '#6366f1');
    const fillTop    = isAccent ? 'rgba(104,91,199,0.38)' : (isDark ? 'rgba(129,140,248,0.32)' : 'rgba(99,102,241,0.26)');

    // Fill area
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,    fillTop);
    grad.addColorStop(0.4,  isAccent ? 'rgba(104,91,199,0.20)' : (isDark ? 'rgba(129,140,248,0.16)' : 'rgba(99,102,241,0.13)'));
    grad.addColorStop(0.75, isAccent ? 'rgba(104,91,199,0.07)' : (isDark ? 'rgba(129,140,248,0.06)' : 'rgba(99,102,241,0.05)'));
    grad.addColorStop(1,    'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Last point dot
    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    // Armazena metadados para tooltip interativo
    sparklineMeta[canvasId] = { pts, data, labels: labels || [], unit: unit || '', lineColor, w, h, dpr, isAccent };

    // Registra listeners de tooltip (uma vez por canvas)
    if (!canvas.dataset.tooltipBound) {
        canvas.dataset.tooltipBound = 'true';
        canvas.style.cursor = 'crosshair';

        canvas.addEventListener('mousemove', (e) => handleSparkTooltip(e, canvas, canvasId));
        canvas.addEventListener('mouseleave', () => hideSparkTooltip(canvas, canvasId));
    }
}

function handleSparkTooltip(e, canvas, canvasId) {
    const meta = sparklineMeta[canvasId];
    if (!meta || meta.pts.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    // Escala o mouseX do espaço CSS para o espaço lógico dos pontos
    const cssWidth = rect.width;
    const scaleX = meta.w / cssWidth;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Encontra o ponto mais próximo
    let closest = 0;
    let minDist = Infinity;
    meta.pts.forEach((p, i) => {
        const dist = Math.abs(p.x - mouseX);
        if (dist < minDist) { minDist = dist; closest = i; }
    });

    // Redesenha com highlight
    const dpr = meta.dpr;
    const w = meta.w;
    const h = meta.h;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const isDark = document.body.classList.contains('dark');
    const fillTop = meta.isAccent ? 'rgba(104,91,199,0.38)' : (isDark ? 'rgba(129,140,248,0.32)' : 'rgba(99,102,241,0.26)');

    // Fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,    fillTop);
    grad.addColorStop(0.4,  meta.isAccent ? 'rgba(104,91,199,0.20)' : (isDark ? 'rgba(129,140,248,0.16)' : 'rgba(99,102,241,0.13)'));
    grad.addColorStop(0.75, meta.isAccent ? 'rgba(104,91,199,0.07)' : (isDark ? 'rgba(129,140,248,0.06)' : 'rgba(99,102,241,0.05)'));
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(meta.pts[0].x, h);
    meta.pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(meta.pts[meta.pts.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    meta.pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = meta.lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Vertical guide line
    const pt = meta.pts[closest];
    ctx.beginPath();
    ctx.moveTo(pt.x, 0);
    ctx.lineTo(pt.x, h);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Highlight dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = meta.lineColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#0f1013' : '#f5f8fc';
    ctx.fill();

    // Tooltip flutuante
    showSparkTooltip(canvas, canvasId, closest, pt);
}

function showSparkTooltip(canvas, canvasId, idx, pt) {
    const meta = sparklineMeta[canvasId];
    if (!meta) return;

    // O card (avô do canvas) é o container com position:relative
    const card = canvas.closest('.kpi-card');
    if (!card) return;

    let tooltip = document.getElementById(`tooltip-${canvasId}`);
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = `tooltip-${canvasId}`;
        tooltip.className = 'spark-tooltip';
        card.appendChild(tooltip);
    }

    const value = Math.round(meta.data[idx]).toLocaleString('pt-BR');
    const label = meta.labels[idx] || '';

    // Formata a data se for YYYY-MM-DD
    let dateStr = label;
    if (label && label.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = label.split('-');
        dateStr = `${d}/${m}`;
    }

    tooltip.innerHTML = `<span class="spark-tooltip-date">${dateStr}</span><span class="spark-tooltip-value">${value} ${meta.unit}</span>`;
    tooltip.style.display = 'flex';

    // Posiciona acima do ponto, relativo ao card
    const canvasRect = canvas.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const tooltipW = tooltip.offsetWidth;
    let left = (canvasRect.left - cardRect.left) + pt.x - tooltipW / 2;
    left = Math.max(4, Math.min(left, cardRect.width - tooltipW - 4));
    tooltip.style.left = left + 'px';
    tooltip.style.top = Math.max(0, (canvasRect.top - cardRect.top) - 30) + 'px';
}

function hideSparkTooltip(canvas, canvasId) {
    const meta = sparklineMeta[canvasId];
    if (!meta) return;

    // Redesenha sem highlight
    const dpr = meta.dpr;
    const w = meta.w;
    const h = meta.h;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const isDark = document.body.classList.contains('dark');
    const fillTop = meta.isAccent ? 'rgba(104,91,199,0.38)' : (isDark ? 'rgba(129,140,248,0.32)' : 'rgba(99,102,241,0.26)');

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,    fillTop);
    grad.addColorStop(0.4,  meta.isAccent ? 'rgba(104,91,199,0.20)' : (isDark ? 'rgba(129,140,248,0.16)' : 'rgba(99,102,241,0.13)'));
    grad.addColorStop(0.75, meta.isAccent ? 'rgba(104,91,199,0.07)' : (isDark ? 'rgba(129,140,248,0.06)' : 'rgba(99,102,241,0.05)'));
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(meta.pts[0].x, h);
    meta.pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(meta.pts[meta.pts.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    meta.pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = meta.lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Last point dot
    const last = meta.pts[meta.pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = meta.lineColor;
    ctx.fill();

    // Esconde tooltip
    const tooltip = document.getElementById(`tooltip-${canvasId}`);
    if (tooltip) tooltip.style.display = 'none';
}

// ==========================================
// KPI DELTA (comparativo período)
// ==========================================
function updateKPIDelta(kpiId, current, previous, label) {
    const wrap  = document.getElementById(`${kpiId}-delta`);
    const arrow = document.getElementById(`${kpiId}-delta-arrow`);
    const val   = document.getElementById(`${kpiId}-delta-value`);
    const lbl   = document.getElementById(`${kpiId}-delta-label`);
    if (!wrap || !arrow || !val || !lbl) return;

    // Só esconde se previous é null/undefined (campo não retornado pela RPC)
    if (previous === null || previous === undefined) {
        wrap.style.display = 'none';
        return;
    }

    wrap.classList.remove('kpi-delta-up', 'kpi-delta-down', 'kpi-delta-flat');

    // Caso especial: período anterior sem dados
    if (previous === 0 && current > 0) {
        wrap.classList.add('kpi-delta-up');
        arrow.textContent = '↑';
        val.textContent = 'novo';
        lbl.textContent = label;
        wrap.style.display = 'inline-flex';
        return;
    }

    if (previous === 0 && current === 0) {
        wrap.classList.add('kpi-delta-flat');
        arrow.textContent = '→';
        val.textContent = '—';
        lbl.textContent = label;
        wrap.style.display = 'inline-flex';
        return;
    }

    const diff = current - previous;
    const pct  = ((diff / previous) * 100);
    const absDiff = Math.abs(Math.round(diff));
    const absPct  = Math.abs(pct);

    // Formata o valor absoluto da diferença
    const diffStr = absDiff >= 1000
        ? (absDiff / 1000).toFixed(1).replace('.', ',') + 'k'
        : absDiff.toLocaleString('pt-BR');

    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';

    if (diff > 0) {
        wrap.classList.add('kpi-delta-up');
        arrow.textContent = '↑';
        val.textContent = `${sign}${diffStr} (+${absPct.toFixed(1).replace('.', ',')}%)`;
    } else if (diff < 0) {
        wrap.classList.add('kpi-delta-down');
        arrow.textContent = '↓';
        val.textContent = `${sign}${diffStr} (−${absPct.toFixed(1).replace('.', ',')}%)`;
    } else {
        wrap.classList.add('kpi-delta-flat');
        arrow.textContent = '→';
        val.textContent = '0 (0%)';
    }

    lbl.textContent = label;
    wrap.style.display = 'inline-flex';
}

// ==========================================
// LINHA DRILLDOWN — flip do card "Interações por Linha"
// ==========================================
function openLinhaDrilldown(linha, modeloData, originalLinhaData) {
    const card = document.getElementById('rank-linha')?.closest('.glass-panel, .kpi-frost');
    if (!card) return;

    const isDark = document.body.classList.contains('dark');

    // Ordena modelos por total
    const sortedModelos = Object.entries(modeloData)
        .sort((a, b) => b[1] - a[1])
        .filter(([, v]) => v > 0);

    const totalModelo = sortedModelos.reduce((s, [, v]) => s + v, 0);
    const maxModelo = sortedModelos[0]?.[1] || 1;

    const colorsDark  = ['#685BC7','#7B8AB0','#6A7A9B','#5C6D8A','#4F6080','#3D5070'];
    const colorsLight = ['#685BC7','#8B9BB4','#B2BECE','#CBD5E1','#E2E8F0','#F1F5F9'];
    const colors = isDark ? colorsDark : colorsLight;

    const barsHTML = sortedModelos.length === 0
        ? `<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px 0;">Sem dados</p>`
        : sortedModelos.map(([modelo, val], i) => {
            const pct = totalModelo > 0 ? (val / totalModelo) * 100 : 0;
            const color = colors[i % colors.length];
            return `
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;">
                        <span style="font-family:'Archivo',sans-serif;font-stretch:140%;font-size:11px;font-weight:700;color:var(--text-main);text-transform:uppercase;letter-spacing:0.08em;">${modelo}</span>
                        <div style="display:flex;align-items:baseline;gap:8px;">
                            <span style="font-family:'Geist',sans-serif;font-size:13px;font-weight:900;color:${color};">${Math.round(val).toLocaleString('pt-BR')}</span>
                            <span style="font-family:'Archivo',sans-serif;font-size:10px;font-weight:600;color:var(--text-muted);">${pct.toFixed(1).replace('.',',')}%</span>
                        </div>
                    </div>
                    <div style="width:100%;height:6px;border-radius:999px;background:${isDark ? '#2A2A2A' : 'rgba(0,0,0,0.10)'};overflow:hidden;">
                        <div class="rank-bar-fill" data-width="${(val/maxModelo)*100}" style="width:0%;height:100%;border-radius:999px;background:${color};transition:width 0.7s cubic-bezier(0.4,0,0.2,1);"></div>
                    </div>
                </div>`;
        }).join('');

    const titleEl = card.querySelector('.ds-chart-title');
    const rankLinha = document.getElementById('rank-linha');

    // Slide out
    rankLinha.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    rankLinha.style.opacity = '0';
    rankLinha.style.transform = 'translateX(-16px)';

    if (titleEl) {
        titleEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        titleEl.style.opacity = '0';
        titleEl.style.transform = 'translateX(-16px)';
    }

    setTimeout(() => {
        if (titleEl) {
            titleEl.textContent = linha + ' — MODELOS';
            titleEl.style.transform = 'translateX(16px)';
            void titleEl.offsetWidth;
            titleEl.style.opacity = '1';
            titleEl.style.transform = 'translateX(0)';
        }

        rankLinha.innerHTML = `
            <button id="linha-drilldown-back" style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--text-muted);font-family:'Archivo',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:0;margin-bottom:12px;transition:color 0.15s;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style="width:12px;height:12px;"><path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>
                Voltar
            </button>
            <div style="display:flex;flex-direction:column;gap:14px;">${barsHTML}</div>`;

        rankLinha.style.transform = 'translateX(16px)';
        void rankLinha.offsetWidth;
        rankLinha.style.opacity = '1';
        rankLinha.style.transform = 'translateX(0)';

        // Anima barras
        requestAnimationFrame(() => {
            rankLinha.querySelectorAll('.rank-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });
        });

        // Botão voltar
        document.getElementById('linha-drilldown-back').addEventListener('click', () => {
            rankLinha.style.opacity = '0';
            rankLinha.style.transform = 'translateX(16px)';
            if (titleEl) {
                titleEl.style.opacity = '0';
                titleEl.style.transform = 'translateX(16px)';
            }
            setTimeout(() => {
                if (titleEl) {
                    titleEl.textContent = 'Interações por Linha';
                    titleEl.style.transform = 'translateX(-16px)';
                    void titleEl.offsetWidth;
                    titleEl.style.opacity = '1';
                    titleEl.style.transform = 'translateX(0)';
                }
                rankLinha.style.transform = 'translateX(-16px)';
                void rankLinha.offsetWidth;
                rankLinha.style.opacity = '1';
                rankLinha.style.transform = 'translateX(0)';
                drawChart('c-linha', 'ranked-bar', originalLinhaData);
            }, 220);
        });
    }, 220);
}

// ==========================================
// SHOP DRILLDOWN — flip do card "Interações por Local"
// ==========================================
function openShopDrilldown(shopType, redeData, originalShopData) {
    const card = document.getElementById('rank-shop')?.closest('.glass-panel, .kpi-frost');
    if (!card) return;

    const isDark = document.body.classList.contains('dark');

    // Ordena redes por total
    const sortedRedes = Object.entries(redeData)
        .sort((a, b) => b[1] - a[1])
        .filter(([, v]) => v > 0);

    const totalRede = sortedRedes.reduce((s, [, v]) => s + v, 0);
    const maxRede = sortedRedes[0]?.[1] || 1;

    const colorsDark  = ['#685BC7','#7B8AB0','#6A7A9B','#5C6D8A','#4F6080','#3D5070'];
    const colorsLight = ['#685BC7','#8B9BB4','#B2BECE','#CBD5E1','#E2E8F0','#F1F5F9'];
    const colors = isDark ? colorsDark : colorsLight;

    const barsHTML = sortedRedes.length === 0
        ? `<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px 0;">Sem dados</p>`
        : sortedRedes.map(([rede, val], i) => {
            const pct = totalRede > 0 ? (val / totalRede) * 100 : 0;
            const color = colors[i % colors.length];
            return `
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;">
                        <span style="font-family:'Archivo',sans-serif;font-stretch:140%;font-size:11px;font-weight:700;color:var(--text-main);text-transform:uppercase;letter-spacing:0.08em;">${rede}</span>
                        <div style="display:flex;align-items:baseline;gap:8px;">
                            <span style="font-family:'Geist',sans-serif;font-size:13px;font-weight:900;color:${color};">${Math.round(val).toLocaleString('pt-BR')}</span>
                            <span style="font-family:'Archivo',sans-serif;font-size:10px;font-weight:600;color:var(--text-muted);">${pct.toFixed(1).replace('.',',')}%</span>
                        </div>
                    </div>
                    <div style="width:100%;height:6px;border-radius:999px;background:${isDark ? '#2A2A2A' : 'rgba(0,0,0,0.10)'};overflow:hidden;">
                        <div class="rank-bar-fill" data-width="${(val/maxRede)*100}" style="width:0%;height:100%;border-radius:999px;background:${color};transition:width 0.7s cubic-bezier(0.4,0,0.2,1);"></div>
                    </div>
                </div>`;
        }).join('');

    // Título do card
    const titleEl = card.querySelector('.ds-chart-title');

    // Slide out do conteúdo atual
    const rankShop = document.getElementById('rank-shop');
    rankShop.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    rankShop.style.opacity = '0';
    rankShop.style.transform = 'translateX(-16px)';

    if (titleEl) {
        titleEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        titleEl.style.opacity = '0';
        titleEl.style.transform = 'translateX(-16px)';
    }

    setTimeout(() => {
        // Atualiza título
        if (titleEl) {
            titleEl.textContent = shopType.toUpperCase() + ' — POR REDE';
            titleEl.style.transform = 'translateX(16px)';
            void titleEl.offsetWidth;
            titleEl.style.opacity = '1';
            titleEl.style.transform = 'translateX(0)';
        }

        // Injeta drilldown com botão voltar
        rankShop.innerHTML = `
            <button id="shop-drilldown-back" style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--text-muted);font-family:'Archivo',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:0;margin-bottom:12px;transition:color 0.15s;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style="width:12px;height:12px;"><path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>
                Voltar
            </button>
            <div id="shop-drilldown-bars" style="display:flex;flex-direction:column;gap:14px;">${barsHTML}</div>`;

        rankShop.style.transform = 'translateX(16px)';
        void rankShop.offsetWidth;
        rankShop.style.opacity = '1';
        rankShop.style.transform = 'translateX(0)';

        // Anima barras
        requestAnimationFrame(() => {
            rankShop.querySelectorAll('.rank-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });
        });

        // Botão voltar
        document.getElementById('shop-drilldown-back').addEventListener('click', () => {
            rankShop.style.opacity = '0';
            rankShop.style.transform = 'translateX(16px)';
            if (titleEl) {
                titleEl.style.opacity = '0';
                titleEl.style.transform = 'translateX(16px)';
            }
            setTimeout(() => {
                if (titleEl) {
                    titleEl.textContent = 'Interações por Local';
                    titleEl.style.transform = 'translateX(-16px)';
                    void titleEl.offsetWidth;
                    titleEl.style.opacity = '1';
                    titleEl.style.transform = 'translateX(0)';
                }
                // Re-renderiza o ranked-bar com os dados já em memória, sem ir ao banco
                rankShop.style.transform = 'translateX(-16px)';
                void rankShop.offsetWidth;
                rankShop.style.opacity = '1';
                rankShop.style.transform = 'translateX(0)';
                drawChart('c-shop', 'ranked-bar', originalShopData);
            }, 220);
        });
    }, 220);
}

function drawChart(id, type, data, isArea = false, isH = false) {
    // Ranked bar list — renders HTML instead of Chart.js
    if (type === 'ranked-bar') {
        const containerId = id === 'c-shop' ? 'rank-shop' : 'rank-linha';
        const container = document.getElementById(containerId);
        if (!container) return;

        const isDark = document.body.classList.contains('dark');
        const total = data.values.reduce((a, b) => a + b, 0);
        const maxVal = Math.max(...data.values, 1);
        const isShop = id === 'c-shop';
        const isLinha = id === 'c-linha';
        const isClickable = isShop || isLinha;

        if (total === 0) {
            container.innerHTML = `<p style="color:var(--text-muted); font-size:12px; text-align:center; padding:16px 0;">Sem dados no período</p>`;
            return;
        }

        const colorsDark = ['#685BC7', '#7B8AB0', '#6A7A9B', '#5C6D8A', '#4F6080'];
        const colorsLight = ['#685BC7', '#8B9BB4', '#B2BECE', '#CBD5E1', '#F1F5F9'];
        const colors = isDark ? colorsDark : colorsLight;

        container.innerHTML = data.labels.map((label, i) => {
            const value = data.values[i];
            const pct = total > 0 ? ((value / total) * 100) : 0;
            const color = colors[i % colors.length];
            const rowClass = isClickable ? 'rank-clickable-row' : '';
            const dataAttr = isShop ? `data-shop-type="${label}"` : (isLinha ? `data-linha="${label}"` : '');
            const hintIcon = isClickable ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style="width:10px;height:10px;opacity:0.4;margin-left:4px;flex-shrink:0;"><path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>` : '';

            return `
                <div ${dataAttr} class="${rowClass}" style="display:flex; flex-direction:column; gap:6px; ${isClickable ? 'cursor:pointer; border-radius:8px; padding:4px; margin:-4px; transition:background 0.15s;' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:baseline;">
                        <span style="display:flex;align-items:center;font-family:'Archivo',sans-serif; font-stretch:140%; font-size:12px; font-weight:700; color:var(--text-main); text-transform:uppercase; letter-spacing:0.08em;">${label}${hintIcon}</span>
                        <div style="display:flex; align-items:baseline; gap:8px;">
                            <span class="rank-bar-value" data-target="${Math.round(value)}" style="font-family:'Geist',sans-serif; font-size:13px; font-weight:900; color:${color};">0</span>
                            <span class="rank-bar-pct" data-target="${pct}" style="font-family:'Archivo',sans-serif; font-size:10px; font-weight:600; color:var(--text-muted);">0,0%</span>
                        </div>
                    </div>
                    <div style="width:100%; height:6px; border-radius:999px; background:${isDark ? '#2A2A2A' : 'rgba(0,0,0,0.10)'}; overflow:hidden;">
                        <div class="rank-bar-fill" data-width="${maxVal > 0 ? ((value / maxVal) * 100) : 0}" style="width:0%; height:100%; border-radius:999px; background:${color}; transition:width 0.7s cubic-bezier(0.4,0,0.2,1);"></div>
                    </div>
                </div>`;
        }).join('');

        // Animate bars + count up numbers
        requestAnimationFrame(() => {
            container.querySelectorAll('.rank-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });

            const duration = 600;
            const start = performance.now();
            const valueEls = container.querySelectorAll('.rank-bar-value');
            const pctEls = container.querySelectorAll('.rank-bar-pct');
            const targets = Array.from(valueEls).map(el => +el.dataset.target);
            const pctTargets = Array.from(pctEls).map(el => +el.dataset.target);

            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                valueEls.forEach((el, i) => { el.textContent = Math.round(targets[i] * ease).toLocaleString('pt-BR'); });
                pctEls.forEach((el, i) => { el.textContent = (pctTargets[i] * ease).toFixed(1).replace('.', ',') + '%'; });
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });

        // Hover + click nas linhas clicáveis
        if (isClickable) {
            container.querySelectorAll('.rank-clickable-row').forEach(row => {
                row.addEventListener('mouseenter', () => {
                    row.style.background = isDark ? 'rgba(104,91,199,0.08)' : 'rgba(104,91,199,0.06)';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.background = 'transparent';
                });
                row.addEventListener('click', () => {
                    if (isShop) {
                        const shopType = row.dataset.shopType;
                        openShopDrilldown(shopType, data.redeByType?.[shopType] || {}, data);
                    } else if (isLinha) {
                        const linha = row.dataset.linha;
                        openLinhaDrilldown(linha, data.modelosPorLinha?.[linha] || {}, data);
                    }
                });
            });
        }
        return;
    }

    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    
    const labelColor = isDark ? '#e4e4e4' : '#131417';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const tickColor = isDark ? '#A0A0A0' : 'rgba(0, 0, 0, 0.55)';
    const tooltipBg = isDark ? 'rgba(18, 19, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipTitle = isDark ? '#e4e4e4' : '#131417';
    const tooltipBody = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(19, 20, 23, 0.8)';
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    const pluginsArray = [];
    if (type === 'line') pluginsArray.push(crosshairPlugin);
    if (type === 'doughnut') pluginsArray.push(doughnutCustomLabelPlugin);
    
    let bg;
    let borderColor = '#685BC7';
    let borderWidth = type === 'bar' ? 0 : 2;

    if (type === 'doughnut') {
        bg = data.labels.map((_, i) => {
            if (id === 'c-shop') return i === 0 ? '#685BC7' : (isDark ? '#3B455E' : '#B2BECE');
            const colorsDark = ['#685BC7', '#526082', '#3B455E', '#242A38', '#1a1f2c'];
            const colorsLight = ['#685BC7', '#8B9BB4', '#B2BECE', '#CBD5E1', '#F1F5F9'];
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

    if (data.tooltipData) {
        tooltipConfig.callbacks = {
            title: ctx => { let lbl = ctx[0].label; if (typeof lbl === 'string' && lbl.includes(',')) return lbl.replace(',', '\n'); return lbl; },
            label: ctx => {
                const key = typeof ctx.label === 'string' ? ctx.label.split(',')[0] : (Array.isArray(ctx.label) ? ctx.label[0] : ctx.label);
                const linhas = data.tooltipData[key];
                if(linhas) { 
                    return Object.entries(linhas).sort((a,b) => b[1]-a[1]).map(s => `${s[0]}: ${Math.round(s[1]).toLocaleString('pt-BR')}`); 
                }
                return ctx.formattedValue;
            }
        };
    }

    const chartConfig = {
        type: type,
        data: { 
            labels: data.labels, 
            datasets: [{ 
                data: data.values, 
                backgroundColor: bg, 
                borderColor: borderColor, 
                fill: isArea, 
                tension: 0.5, 
                borderRadius: type === 'bar' ? (isH ? {topRight: 6, bottomRight: 6} : {topLeft: 6, topRight: 6}) : 0, 
                borderWidth: borderWidth, 
                pointRadius: type === 'line' ? 4 : 0, 
                pointHoverRadius: 6,
                pointBackgroundColor: type === 'line' ? '#685BC7' : undefined,
                pointBorderColor: type === 'line' ? '#3d2f8f' : undefined,
                pointBorderWidth: type === 'line' ? 2 : undefined,
                hoverOffset: type === 'doughnut' ? 8 : 0
            }] 
        },
        plugins: pluginsArray,
        options: {
            indexAxis: isH ? 'y' : 'x', 
            responsive: true, 
            maintainAspectRatio: false,
            cutout: type === 'doughnut' ? '65%' : undefined, 
            interaction: { mode: isH || type === 'doughnut' ? 'nearest' : 'index', intersect: isH || type === 'doughnut' ? true : false, axis: isH ? 'y' : (type === 'doughnut' ? 'xy' : 'x') },
            layout: {
                padding: {
                    top: type === 'doughnut' ? 40 : (!isH ? 30 : 0), 
                    right: type === 'doughnut' ? 100 : (isH ? 50 : 0),
                    bottom: type === 'doughnut' ? 40 : 0,
                    left: type === 'doughnut' ? 100 : 0
                }
            },
            plugins: { 
                legend: { display: false }, 
                tooltip: tooltipConfig,
                datalabels: {
                    display: type !== 'doughnut', 
                    font: { family: 'Geist', size: 10 },
                    formatter: (value) => Math.round(value).toLocaleString('pt-BR'),
                    anchor: 'end',
                    align: isH ? 'right' : 'top',
                    color: labelColor,
                    textAlign: 'center',
                    offset: 6
                }
            },
            scales: { 
                y: { display: type !== 'doughnut', grace: isH ? '0%' : '15%', beginAtZero: true, grid: { color: isH ? 'transparent' : gridColor, drawBorder: false }, ticks: { color: tickColor, font: { family: 'Archivo', size: 10, weight: 600 }, autoSkip: !isH }, border: { display: false } },
                x: { display: type !== 'doughnut', grace: isH ? '15%' : '0%', ...(type === 'line' ? { offset: true } : {}), grid: { display: (!!isH || type === 'line'), color: gridColor, drawBorder: false }, ticks: { color: tickColor, font: { family: 'Archivo', size: 9, weight: 700 } }, border: { display: false } }
            }
        }
    };

    chartInstances[id] = new Chart(ctx, chartConfig);
}

// ==========================================
// GRÁFICO DE CRESCIMENTO TEMPORAL
// ==========================================
function drawGrowthChart(id, data, mode) {
    const ctx = document.getElementById(id).getContext('2d');
    const isDark = document.body.classList.contains('dark');
    
    if (!data || data.length === 0) {
        // Sem dados, mostra mensagem
        const canvas = document.getElementById(id);
        const container = canvas.parentElement;
        container.innerHTML = '<div class="flex items-center justify-center h-full text-adaptive-muted text-sm">Dados insuficientes para análise de crescimento</div>';
        return;
    }
    
    const labelColor = isDark ? '#e4e4e4' : '#131417';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const tickColor = isDark ? '#A0A0A0' : 'rgba(0, 0, 0, 0.55)';
    const tooltipBg = isDark ? 'rgba(18, 19, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipTitle = isDark ? '#e4e4e4' : '#131417';
    const tooltipBody = isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(19, 20, 23, 0.8)';
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    
    let labels, values;
    
    if (mode === 'day') {
        // Agrupa por dia (soma todas as linhas de produto)
        const dayMap = {};
        data.forEach(d => {
            const date = d.pure_date;
            if (!dayMap[date]) dayMap[date] = 0;
            dayMap[date] += d.total || 0;
        });
        
        const sortedDays = Object.keys(dayMap).sort();
        labels = sortedDays.map(d => {
            const parts = d.split('-');
            if (parts.length === 3) {
                const [yyyy, mm, dd] = parts;
                return `${dd}-${mm}\n${yyyy}`;
            }
            return d;
        });
        values = sortedDays.map(d => dayMap[d]);
    } else if (mode === 'week') {
        labels = data.map(d => d.week_label);
        values = data.map(d => d.total);
    } else {
        const mesesPT = {
            'January': 'Janeiro', 'February': 'Fevereiro', 'March': 'Março',
            'April': 'Abril', 'May': 'Maio', 'June': 'Junho',
            'July': 'Julho', 'August': 'Agosto', 'September': 'Setembro',
            'October': 'Outubro', 'November': 'Novembro', 'December': 'Dezembro'
        };
        labels = data.map(d => {
            const label = d.month_label || '';
            // Formato esperado: "January/2026" → "Janeiro/2026"
            return label.replace(/^([A-Za-z]+)/, m => mesesPT[m] || m);
        });
        values = data.map(d => d.total);
    }
    
    // Calcula variação percentual entre períodos
    const growthRates = values.map((val, idx) => {
        if (idx === 0) return 0;
        const prev = values[idx - 1];
        if (prev === 0) return 0;
        return ((val - prev) / prev) * 100;
    });
    
    const grad = ctx.createLinearGradient(0, 0, 0, 400);
    grad.addColorStop(0, 'rgba(104, 91, 199, 0.25)');
    grad.addColorStop(1, 'rgba(104, 91, 199, 0)');

    chartInstances[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: grad,
                borderColor: '#685BC7',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: mode === 'day' ? 3 : 6,
                pointHoverRadius: mode === 'day' ? 5 : 9,
                pointBackgroundColor: '#685BC7',
                pointBorderColor: '#3d2f8f',
                pointBorderWidth: 2
            }]
        },
        plugins: [crosshairPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipTitle,
                    bodyColor: tooltipBody,
                    titleFont: { family: 'Archivo', size: 10, weight: 800 },
                    bodyFont: { family: 'Archivo', size: 11, weight: 500 },
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 12,
                    callbacks: {
                        title: ctx => {
                            let lbl = ctx[0].label;
                            if (typeof lbl === 'string' && lbl.includes('\n')) {
                                return lbl.replace('\n', ' - ');
                            }
                            return lbl;
                        },
                        label: ctx => {
                            const idx = ctx.dataIndex;
                            const val = Math.round(ctx.parsed.y).toLocaleString('pt-BR');

                            if (idx === 0) {
                                return `Interações: ${val}`;
                            }

                            const rate = growthRates[idx];
                            const sign = rate > 0 ? '+' : '';
                            const rateStr = `${sign}${rate.toFixed(1).replace('.', ',')}%`;

                            return [
                                `Interações: ${val}`,
                                `Variação: ${rateStr}`
                            ];
                        }
                    }
                },
                datalabels: {
                    display: mode !== 'day',
                    font: { family: 'Geist', size: 10 },
                    formatter: (value) => Math.round(value).toLocaleString('pt-BR'),
                    anchor: 'end',
                    align: 'top',
                    color: labelColor,
                    textAlign: 'center',
                    offset: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%',
                    grid: { color: gridColor, drawBorder: false },
                    ticks: {
                        color: tickColor,
                        font: { family: 'Archivo', size: 10, weight: 600 }
                    },
                    border: { display: false }
                },
                x: {
                    grid: { display: true, color: gridColor, drawBorder: false },
                    offset: true,
                    ticks: Object.assign({
                        color: tickColor,
                        font: { family: 'Archivo', size: 10, weight: 700 },
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: false
                    }, mode === 'day' ? { callback: function(value, index) { return index % 2 === 0 ? this.getLabelForValue(value) : ''; } } : {}),
                    border: { display: false }
                }
            }
        }
    });
}
