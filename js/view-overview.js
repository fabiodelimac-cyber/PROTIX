// js/view-overview.js
import { appData } from './services/dataManager.js';

Chart.register(ChartDataLabels);

let chartInstances = {};
let insightTimeout = null;
let unsubscribeData = null;
let timelineMode = 'dia'; // Estado global do seletor da timeline

export const getOverviewHTML = () => {
    const showWelcome = !sessionStorage.getItem('ps_welcome_shown');

    return `
        <style>
            #view-overview-wrapper { font-family: 'Archivo', sans-serif; }
            
            .glass-panel { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); }
            .text-adaptive { color: var(--text-main); }
            .text-adaptive-muted { color: var(--text-muted); }
            .text-adaptive-strong { color: var(--text-muted-strong); }
            .text-glow { text-shadow: var(--glow-shadow); }
            .text-glow-accent { text-shadow: var(--glow-accent); }
            .neon-accent { background: var(--neon-bg); }
            .divide-adaptive > div { border-color: var(--glass-border); }

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

            <div id="insight-box" class="anim-cascade delay-1 glass-panel p-5 md:p-6 rounded-2xl flex items-center gap-5 mb-6 md:mb-8 transition-all">
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

            <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10 mb-6 md:mb-8">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h4 id="title-timeline" class="ds-chart-title">Volume de Interações por Dia</h4>
                    
                    <div class="flex bg-[var(--input-bg)] p-1 rounded-2xl border border-[var(--glass-border)]">
                        <button id="mode-dia" class="px-5 py-2 text-[9px] font-bold uppercase tracking-[0.1em] rounded-xl bg-[#685BC7] text-white shadow-lg transition-all duration-300">
                            Por Dia
                        </button>
                        <button id="mode-semana" class="px-5 py-2 text-[9px] font-bold uppercase tracking-[0.1em] rounded-xl text-adaptive-strong hover:text-adaptive transition-all duration-300">
                            Por Semana
                        </button>
                    </div>
                </div>
                <div class="chart-container" style="height: 280px;"><canvas id="c-timeline"></canvas></div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                <div class="anim-cascade delay-3 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10">
                    <h4 class="ds-chart-title mb-8">Frequência de Interação por Hora</h4>
                    <div class="chart-container" style="height: 280px;"><canvas id="c-time"></canvas></div>
                </div>
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10">
                    <h4 class="ds-chart-title mb-8">Engajamento por Rede</h4>
                    <div class="chart-container" style="height: 280px;"><canvas id="c-rede"></canvas></div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10 flex flex-col">
                    <h4 class="ds-chart-title mb-8 text-center xl:text-left">Interações por Local</h4>
                    <div class="chart-container relative flex-1 min-h-[250px]">
                        <canvas id="c-shop"></canvas>
                    </div>
                </div>
                
                <div class="anim-cascade delay-4 glass-panel p-8 md:p-10 rounded-[2.5rem] relative z-10 flex flex-col">
                    <h4 class="ds-chart-title mb-8 text-center xl:text-left">Interações por Linha</h4>
                    <div class="chart-container relative flex-1 min-h-[250px]">
                        <canvas id="c-linha"></canvas>
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

    // Configuração do Seletor da Timeline
    const btnDia = document.getElementById('mode-dia');
    const btnSemana = document.getElementById('mode-semana');

    const setActive = (btn) => {
        btn.classList.add('bg-[#685BC7]', 'text-white', 'shadow-lg');
        btn.classList.remove('text-adaptive-strong', 'hover:text-adaptive', 'bg-transparent');
    };

    const setInactive = (btn) => {
        btn.classList.remove('bg-[#685BC7]', 'text-white', 'shadow-lg');
        btn.classList.add('text-adaptive-strong', 'hover:text-adaptive', 'bg-transparent');
    };

    if (btnDia && btnSemana) {
        btnDia.onclick = () => {
            if(timelineMode === 'dia') return;
            timelineMode = 'dia';
            setActive(btnDia); setInactive(btnSemana);
            updateTimelineTitle();
        };

        btnSemana.onclick = () => {
            if(timelineMode === 'semana') return;
            timelineMode = 'semana';
            setActive(btnSemana); setInactive(btnDia);
            updateTimelineTitle();
        };

        if (timelineMode === 'dia') { setActive(btnDia); setInactive(btnSemana); } 
        else { setActive(btnSemana); setInactive(btnDia); }
    }

    function updateTimelineTitle() {
        const titleEl = document.getElementById('title-timeline');
        titleEl.style.opacity = 0; 
        setTimeout(() => {
            titleEl.innerText = timelineMode === 'semana' ? 'Volume de Interações por Semana' : 'Volume de Interações por Dia';
            titleEl.style.opacity = 1; 
            executeRenderLogic();
        }, 300);
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
    
    console.log('🔍 Dados recebidos para insights:', {
        kpis: dbData.kpis,
        aparelhos: dbData.aparelhos?.length,
        rede: dbData.rede?.length,
        linha: dbData.linha?.length
    });
    
    // Insight 1: Aparelho com mais tração
    const aparelhosArray = dbData.aparelhos || [];
    const topDev = [...aparelhosArray].sort((a,b) => b.total - a.total)[0];
    if (topDev && topDev.total > 0) {
        insights.push(`PROSOLUTION ANALYTICS: O modelo ${topDev.aparelho} registrou a maior tração com ${Math.round(topDev.total).toLocaleString('pt-BR')} interações validadas.`);
    }
    
    // Insight 2: Rede com mais interações
    const redeArray = dbData.rede || [];
    if (redeArray.length > 0) {
        const topRede = [...redeArray].sort((a,b) => b.total - a.total)[0];
        if (topRede && topRede.rede && topRede.total > 0) {
            insights.push(`PROSOLUTION ANALYTICS: A rede ${topRede.rede} concentra ${Math.round(topRede.total).toLocaleString('pt-BR')} interações, liderando o engajamento no período.`);
        }
    }
    
    // Insight 3: Loja com mais interações
    // NOTA: Requer atualização da RPC get_overview_metrics para incluir top_store nos kpis
    // Ver: BACKUPS/== SUPABASE BACKUP/README_OVERVIEW_UPDATE.md
    if (dbData.kpis && dbData.kpis.top_store) {
        insights.push(`PROSOLUTION ANALYTICS: O PDV ${dbData.kpis.top_store} lidera o ranking de engajamento no período analisado.`);
    } else {
        console.warn('⚠️ Campo top_store não encontrado nos KPIs. Atualize a RPC get_overview_metrics.');
    }
    
    // Insight 4: Linha de produto com mais tração
    const linhaArray = dbData.linha || [];
    if (linhaArray.length > 0) {
        const topLinha = [...linhaArray].sort((a,b) => b.total - a.total)[0];
        if (topLinha && topLinha.linha_de_produto && topLinha.total > 0) {
            insights.push(`PROSOLUTION ANALYTICS: A linha ${topLinha.linha_de_produto} demonstra maior adesão com ${Math.round(topLinha.total).toLocaleString('pt-BR')} interações validadas.`);
        }
    }
    
    // Fallback se não houver dados suficientes
    if (insights.length === 0) {
        insights.push('Aguardando massa de dados para análise preditiva.');
    }
    
    console.log(`📊 Total de insights gerados: ${insights.length}`, insights);
    return insights;
}

// Efeito de digitação (typewriter)
function typewriterEffect(element, text, callback) {
    // Limpa qualquer typewriter anterior
    if (insightTypewriterInterval) {
        clearInterval(insightTypewriterInterval);
    }
    
    element.innerHTML = "";
    let i = 0;
    insightTypewriterInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(insightTypewriterInterval);
            insightTypewriterInterval = null;
            if (callback) callback();
        }
    }, 20);
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
        typewriterEffect(el, insights[0]);
        return;
    }
    
    currentInsightIndex = 0;
    
    // Mostra o primeiro insight
    typewriterEffect(el, insights[currentInsightIndex]);
    
    // Rotaciona a cada 5 segundos
    insightRotationInterval = setInterval(() => {
        // Slide out
        el.classList.add('insight-slide-out');
        
        setTimeout(() => {
            // Atualiza o índice para o PRÓXIMO insight
            currentInsightIndex = (currentInsightIndex + 1) % insights.length;
            
            // Remove animação de saída
            el.classList.remove('insight-slide-out');
            
            // Adiciona animação de entrada
            el.classList.add('insight-slide-in');
            
            // Mostra novo insight com efeito de digitação
            typewriterEffect(el, insights[currentInsightIndex], () => {
                // Remove animação de entrada após completar
                setTimeout(() => {
                    el.classList.remove('insight-slide-in');
                }, 500);
            });
        }, 500);
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
    
    // Mostra spinner nos gráficos
    const chartContainers = ['c-timeline', 'c-time', 'c-rede', 'c-shop', 'c-linha'];
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
            document.getElementById('insight-text').innerText = 'Aguardando dados estruturados para processamento analítico.';
            return;
        }
        
        // KPIs (Direto do Banco)
        const totalSess = dbData.kpis.total_sessions;
        const stores = dbData.kpis.unique_stores;
        const devices = dbData.kpis.unique_devices;
        
        updateKPIWithFade('k-sess', Math.round(totalSess).toLocaleString('pt-BR'));
        updateKPIWithFade('k-sto', stores.toString());
        updateKPIWithFade('k-dev', devices.toString());
        updateKPIWithFade('k-avg', stores ? Math.round(totalSess/stores).toLocaleString('pt-BR') : '0');
        
        // Tooltip de Aparelhos (Safeguard de Array Vazio)
        const sortedDevList = (dbData.aparelhos || [])
            .map(d => [`${d.aparelho} - <span class="text-white/40 font-normal">${d.tipo}</span>`, d.devices])
            .sort((a, b) => b[1] - a[1]);

        document.getElementById('k-dev-tooltip').innerHTML = '<p class="ds-sidebar-title text-[#685BC7] mb-3 border-b border-white/10 pb-3">Modelos Operantes na Rede</p>' + 
            (sortedDevList.length > 0 
                ? sortedDevList.map(v => `<div class="mt-2.5 flex items-center justify-between gap-6"><span class="opacity-90">${v[0]}</span> <span class="font-black font-numbers text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-md border border-[#8b5cf6]/20">${v[1]}</span></div>`).join('') 
                : '<div class="opacity-50 mt-2">Nenhum modelo detectado</div>');
                
        // Sistema de Insights Rotativos
        startInsightRotation(dbData);

        // Agrupamentos Locais com Proteção (fallback para [])
        let ruaTotal = 0, shopTotal = 0;
        (dbData.shop || []).forEach(d => {
            const tipoOriginal = (d.shopping || '').toUpperCase().trim();
            if (tipoOriginal === 'LOJA DE RUA') ruaTotal += d.total;
            else shopTotal += d.total;
        });

        const linhaAgg = {};
        (dbData.linha || []).forEach(d => {
            const linha = (d.linha_de_produto || 'N/A').toUpperCase().trim();
            linhaAgg[linha] = (linhaAgg[linha] || 0) + d.total;
        });
        const sortedLinhas = Object.keys(linhaAgg).sort((a,b) => linhaAgg[b] - linhaAgg[a]);

        // Disparo dos Gráficos
        drawChart('c-timeline', 'line', aggregateTimeline((dbData.timeline || []), timelineMode), true);
        drawChart('c-time', 'line', aggregateData((dbData.faixa || []), 'faixa', true), true);
        drawChart('c-rede', 'bar', aggregateData((dbData.rede || []), 'rede', false, true));
        drawChart('c-shop', 'doughnut', { labels: ['Loja de Rua', 'Shopping'], values: [ruaTotal, shopTotal] });
        drawChart('c-linha', 'doughnut', { labels: sortedLinhas, values: sortedLinhas.map(l => linhaAgg[l]) });

    } catch (e) {
        console.error("Crash interceptado na renderização visual:", e);
    } finally {
        // Remove loading de todos os gráficos
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
// TRATAMENTO DA TIMELINE (DIA VS SEMANA ISO)
// ==========================================
function getISOWeek(dateStr) {
    if(!dateStr || dateStr === 'N/A') return { sort: 'N/A', label: 'N/A' };
    const parts = dateStr.split('-');
    if(parts.length !== 3) return { sort: dateStr, label: dateStr };
    
    const d = new Date(Date.UTC(parts[0], parts[1]-1, parts[2]));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    return {
        sort: `${d.getUTCFullYear()}${weekNo.toString().padStart(2,'0')}`,
        label: `Semana ${weekNo}`
    };
}

function aggregateTimeline(dataArray, mode) {
    const grouped = {};
    dataArray.forEach(o => {
        const rawDate = o.pure_date || 'N/A';
        let sortKey = rawDate;
        let label = rawDate;
        
        if (mode === 'semana' && rawDate !== 'N/A') {
            const weekInfo = getISOWeek(rawDate);
            sortKey = weekInfo.sort;
            label = weekInfo.label;
        } else if (mode === 'dia' && rawDate !== 'N/A') {
            const parts = rawDate.split('-');
            if(parts.length === 3) {
                const d = new Date(parts[0], parts[1]-1, parts[2]);
                const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                label = `${rawDate}\n${days[d.getDay()]}`;
            }
        }
        
        const sess = Number(o.total) || 0; // Alterado para ler do objeto agrupado do Banco
        const linha = o.linha_de_produto || 'N/A';
        
        if (!grouped[sortKey]) grouped[sortKey] = { label, total: 0, linhas: {} };
        grouped[sortKey].total += sess;
        grouped[sortKey].linhas[linha] = (grouped[sortKey].linhas[linha] || 0) + sess;
    });
    
    const entries = Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0]));
    return {
        labels: entries.map(e => e[1].label),
        values: entries.map(e => e[1].total),
        tooltipData: entries.reduce((acc, e) => { acc[e[1].label] = e[1].linhas; return acc; }, {})
    };
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
        const textColor = isDark ? '#FFFFFF' : '#131417';
        
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
                    font: { family: 'Archivo', size: 10, weight: 800 },
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
                x: { display: type !== 'doughnut', grace: isH ? '15%' : '0%', grid: { display: !!isH, color: gridColor, drawBorder: false }, ticks: { color: tickColor, font: { family: 'Archivo', size: 9, weight: 700 } }, border: { display: false } }
            }
        }
    };

    chartInstances[id] = new Chart(ctx, chartConfig);
}