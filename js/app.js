// js/app.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Importando o "Cérebro"
import { appData } from './services/dataManager.js';

// Importando os Módulos das Páginas
import { getOverviewHTML, renderOverviewCharts, destroyOverviewCharts } from "./view-overview.js";
import { getPositivacaoHTML, renderPositivacao } from "./view-positivacao.js";
import { getHeatProdutosHTML, renderHeatProdutos, destroyHeatProdutosCharts } from "./view-heat-produtos.js";
import { getAboutHTML, initAbout } from "./view-about.js";

// --- CONFIGURAÇÃO SUPABASE ---
// Lembre-se de colocar as suas chaves aqui (Project URL e Publishable Key)
const supabaseUrl = 'https://zkxzjrlhuyjqikzszrjx.supabase.co';
const supabaseKey = 'sb_publishable_paYvySajRU_JQWPd9PrgvA_bxb6zFwy';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- VARIÁVEIS GLOBAIS DE ESTADO (Apenas UI e Rotas) ---
let isDataLoaded = false;
let currentRoute = 'view-overview';

// --- AUTENTICAÇÃO (MOTOR SUPABASE) ---
// --- AUTENTICAÇÃO (MOTOR SUPABASE COM ESTEIRA DE APROVAÇÃO) ---
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        // INTERCEPTAÇÃO: O usuário logou no Google, mas temos que checar se você aprovou
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('status')
                .eq('id', session.user.id)
                .single();

            if (data && data.status === 'approved') {
                // FLUXO LIBERADO: Usuário está aprovado
                document.getElementById('login-screen').classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => document.getElementById('login-screen').classList.add('hidden'), 500);
                document.getElementById('dash-shell').classList.remove('hidden');
                
                if (!sessionStorage.getItem('disclaimerAccepted')) {
                    document.getElementById('disclaimer-modal').classList.remove('hidden');
                }
                if (!isDataLoaded) initData();
                
            } else {
                // FLUXO BLOQUEADO: Usuário é pending ou a tabela falhou
                alert("Sua conta foi cadastrada com sucesso, mas aguarda aprovação do Administrador para acessar a dashboard.");
                await supabase.auth.signOut(); // Desloga o cidadão na mesma hora
            }
        } catch (err) {
            console.error("Erro ao validar acesso:", err);
            alert("Erro ao validar permissões. Contate o administrador.");
            await supabase.auth.signOut();
        }
    } else {
        // FLUXO DE SAÍDA (LOGOUT NORMAL)
        document.getElementById('login-screen').classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        document.getElementById('dash-shell').classList.add('hidden');
        document.getElementById('disclaimer-modal').classList.add('hidden');
    }
});

// Listeners de Login/Logout
document.getElementById('btn-email-login').addEventListener('click', async () => {
    const email = document.getElementById('user').value; 
    const pass = document.getElementById('pass').value;
    const btn = document.getElementById('btn-email-login');
    
    if(!email || !pass) { alert("Preencha e-mail e senha."); return; }
    
    try { 
        btn.innerText = 'AUTENTICANDO...'; 
        const { error } = await supabase.auth.signInWithPassword({ email: email, password: pass });
        if (error) throw error;
        btn.innerText = 'AUTENTICAR'; 
    } catch (error) { 
        alert('Acesso Negado: ' + error.message); 
        btn.innerText = 'AUTENTICAR'; 
    }
});

document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) throw error;
    } catch (error) { 
        alert('Falha ao iniciar autenticação com Google.'); 
    }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    document.getElementById('pass').value = ''; 
    sessionStorage.removeItem('disclaimerAccepted'); 
});

document.getElementById('btn-accept-beta').addEventListener('click', () => {
    document.getElementById('disclaimer-modal').classList.add('hidden'); sessionStorage.setItem('disclaimerAccepted', 'true');
});

// --- ROTEAMENTO (NAVEGAÇÃO) - INTACTO ---
const appContent = document.getElementById('app-content');
const navItems = document.querySelectorAll('.nav-item');

function renderActiveView() {
    if(currentRoute === 'view-overview') {
        renderOverviewCharts(); 
    } else if (currentRoute === 'view-positivacao') {
        renderPositivacao();
    } else if (currentRoute === 'view-heat-produtos') {
        renderHeatProdutos();
    }
}

navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target === currentRoute) return; 
        currentRoute = target;

        navItems.forEach(n => n.classList.remove('active'));
        btn.classList.add('active');

        appContent.classList.remove('view-visible');
        appContent.classList.add('view-hidden');

        setTimeout(() => {
            try { destroyOverviewCharts(); } catch(e){}
            try { destroyHeatProdutosCharts(); } catch(e){}
            
            if(target === 'view-overview') {
                appContent.innerHTML = getOverviewHTML();
                renderActiveView();
            } else if (target === 'view-positivacao') {
                appContent.innerHTML = getPositivacaoHTML();
                renderActiveView();
            } else if (target === 'view-heat-produtos') {
                appContent.innerHTML = getHeatProdutosHTML();
                renderActiveView();
            } else {
                appContent.innerHTML = `<div class="h-[60vh] flex flex-col items-center justify-center text-center"><span class="text-4xl mb-4">🚧</span><h2 class="ds-title text-gray-400 uppercase mt-4">Módulo em Desenvolvimento</h2><p class="ds-helper-text text-gray-600 mt-2">A página será liberada na próxima atualização.</p></div>`;
            }

            appContent.classList.remove('view-hidden');
            appContent.classList.add('view-visible');
            
            closeSidebarMobile();
        }, 200); 
    });
});

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const filterDrawer = document.getElementById('filter-drawer');

function openSidebarMobile() { sidebar.classList.remove('-translate-x-full'); overlay.classList.remove('hidden'); }
function closeSidebarMobile() { sidebar.classList.add('-translate-x-full'); overlay.classList.add('hidden'); }

document.getElementById('btn-open-sidebar').addEventListener('click', openSidebarMobile);
document.getElementById('btn-close-sidebar').addEventListener('click', closeSidebarMobile);
overlay.addEventListener('click', closeSidebarMobile);

document.getElementById('btn-toggle-filters').addEventListener('click', () => {
    filterDrawer.classList.toggle('hidden');
});

document.getElementById('btn-go-about').addEventListener('click', () => {
    const shell = document.getElementById('dash-shell');
    shell.style.transition = 'opacity 0.6s ease, filter 0.6s ease';
    shell.style.opacity = '0';
    shell.style.filter = 'blur(10px)';
    setTimeout(() => {
        document.body.insertAdjacentHTML('beforeend', getAboutHTML());
        initAbout();
    }, 600);
});

// --- CARGA DE DADOS INICIAL (SUPABASE) ---
async function initData() {
    isDataLoaded = true;
    
    appContent.innerHTML = getOverviewHTML();
    appContent.classList.add('view-visible');

    try {
        // Busca os dados do PostgreSQL
        const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .order('pure_date', { ascending: false })
            .limit(10000); // Limite para evitar sobrecarga inicial, ajuste conforme necessário

        if (error) throw error;

        if (data) {
            // Envia para o nosso novo DataManager
            appData.setRawData(data);
            
            // Configura os ouvintes dos selects
            setupGlobalFilters();
            
            // Renderiza a tela inicial
            renderActiveView();
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
        alert("Erro técnico ao acessar a base de dados.");
    }
}

// --- CONEXÃO DOS FILTROS DA UI COM O DATAMANAGER ---
const filterKeys = {
    'f-shop': 'shopping', 
    'f-rede': 'rede', 
    'f-store': 'store_name', 
    'f-linha': 'linha_de_produto', 
    'f-reg': 'regional', 
    'f-8020': 'p8020', 
    'f-vis': 'visibilidade'
};

function setupGlobalFilters() {
    // 1. Configura os selects normais
    Object.keys(filterKeys).forEach(id => {
        const selectElement = document.getElementById(id);
        if (selectElement) {
            const newSelect = selectElement.cloneNode(true);
            selectElement.parentNode.replaceChild(newSelect, selectElement);
            newSelect.addEventListener('change', (e) => {
                appData.setFilter(filterKeys[id], e.target.value);
            });
        }
    });

    // 2. Configura o botão do Filtro de Data Customizado para abrir/fechar
    const btnDate = document.getElementById('btn-date-slicer');
    const panelDate = document.getElementById('date-slicer-panel');
    if (btnDate && panelDate) {
        // Remove listener antigo recriando o botão se necessário (para não empilhar cliques)
        const newBtnDate = btnDate.cloneNode(true);
        btnDate.parentNode.replaceChild(newBtnDate, btnDate);
        newBtnDate.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que clique feche imediatamente
            panelDate.classList.toggle('hidden');
        });

        // Fecha o painel se clicar fora dele
        document.addEventListener('click', (e) => {
            if (!newBtnDate.contains(e.target) && !panelDate.contains(e.target)) {
                panelDate.classList.add('hidden');
            }
        });
    }

    appData.subscribe(() => {
        updateDropdownUI();
    });

    updateDropdownUI();
}

function updateDropdownUI() {
    const raw = appData.rawData;
    const currentFilters = appData.currentFilters;

    // --- 1. ATUALIZA OS SELECTS NORMAIS ---
    Object.keys(filterKeys).forEach(id => {
        if (id === 'f-date') return; // Pula a data, pois tem lógica própria
        
        const key = filterKeys[id];
        const selectElement = document.getElementById(id);
        if (!selectElement) return;

        const currentVal = currentFilters[key] || "";

        let dataForThisFilter = raw.filter(item => {
            let matches = true;
            for (const fKey in currentFilters) {
                if (fKey === key) continue; 
                if (Array.isArray(currentFilters[fKey])) {
                    if (!currentFilters[fKey].includes(item[fKey])) matches = false;
                } else {
                    if (item[fKey] && String(item[fKey]) !== String(currentFilters[fKey])) matches = false;
                }
            }
            return matches;
        });

        const availableVals = [...new Set(dataForThisFilter.map(d => d[key]))].filter(x => x && x !== 'N/A').sort();
        selectElement.innerHTML = `<option value="">TODOS</option>`;
        availableVals.forEach(v => selectElement.add(new Option(v.toUpperCase(), v)));
        if (currentVal && availableVals.includes(currentVal)) selectElement.value = currentVal;
    });

    // --- 2. ATUALIZA O FILTRO DE DATA HIERÁRQUICO COM CHECKBOXES ---
    const panelDate = document.getElementById('date-slicer-panel');
    const labelDate = document.getElementById('date-slicer-label');
    
    if (panelDate && labelDate) {
        const openFolders = Array.from(panelDate.querySelectorAll('.folder-content:not(.hidden)')).map(el => el.id);
        
        let dataForDateFilter = raw.filter(item => {
            let matches = true;
            for (const fKey in currentFilters) {
                if (fKey === 'pure_date') continue; 
                if (item[fKey] && String(item[fKey]) !== String(currentFilters[fKey])) matches = false;
            }
            return matches;
        });

        const availableDates = [...new Set(dataForDateFilter.map(d => d.pure_date))].filter(x => x && x !== 'N/A').sort((a,b) => b.localeCompare(a));

        const getWeekNumber = (dateStr) => {
            const d = new Date(dateStr + 'T00:00:00');
            d.setHours(0,0,0,0); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
            const w1 = new Date(d.getFullYear(), 0, 4);
            return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
        };

        const groupedDates = {};
        availableDates.forEach(v => {
            const dt = new Date(v + 'T00:00:00');
            const year = dt.getFullYear().toString();
            const monthName = `${['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'][dt.getMonth()]}`;
            const weekName = `SEMANA ${getWeekNumber(v).toString().padStart(2, '0')}`;

            if (!groupedDates[year]) groupedDates[year] = {};
            if (!groupedDates[year][monthName]) groupedDates[year][monthName] = {};
            if (!groupedDates[year][monthName][weekName]) groupedDates[year][monthName][weekName] = [];
            groupedDates[year][monthName][weekName].push(v);
        });

        let activeDates = currentFilters['pure_date'] || [];
        if (!Array.isArray(activeDates)) activeDates = [activeDates];

        labelDate.innerText = activeDates.length === 0 ? "TODOS OS PERÍODOS" : `${activeDates.length} DIA(S) FILTRADO(S)`;

        let htmlPanel = `<div class="mb-3 border-b border-white/10 pb-3 flex justify-between items-center">
            <span class="text-xs font-bold text-white/50">SELECIONE O PERÍODO</span>
            <button id="btn-clear-dates" class="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors">LIMPAR</button>
        </div>`;

        Object.keys(groupedDates).forEach(year => {
            const idY = `f-y-${year}`;
            htmlPanel += `<div class="mb-2">
                <div class="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/5 transition-colors">
                    <input type="checkbox" class="cb-parent cb-y accent-[#685BC7] w-4 h-4 cursor-pointer">
                    <div class="folder-toggle flex-1 flex justify-between items-center cursor-pointer font-black text-sm" data-target="${idY}">
                        ${year} <span class="arrow text-[10px] transition-transform duration-200 ${openFolders.includes(idY) ? 'rotate-180' : ''}">▼</span>
                    </div>
                </div>
                <div id="${idY}" class="folder-content ${openFolders.includes(idY) ? '' : 'hidden'} pl-4 border-l border-white/10 mt-1">`;

            Object.keys(groupedDates[year]).forEach(month => {
                const idM = `f-m-${year}-${month}`;
                htmlPanel += `<div class="mb-1">
                    <div class="flex items-center gap-2 p-1 rounded-md hover:bg-white/5 transition-colors">
                        <input type="checkbox" class="cb-parent cb-m accent-[#685BC7] w-3.5 h-3.5 cursor-pointer">
                        <div class="folder-toggle flex-1 flex justify-between items-center cursor-pointer font-bold text-xs text-white/80" data-target="${idM}">
                            ${month} <span class="arrow text-[10px] transition-transform duration-200 ${openFolders.includes(idM) ? 'rotate-180' : ''}">▼</span>
                        </div>
                    </div>
                    <div id="${idM}" class="folder-content ${openFolders.includes(idM) ? '' : 'hidden'} pl-3 border-l border-white/10 mt-1">`;

                Object.keys(groupedDates[year][month]).forEach(week => {
                    const idW = `f-w-${year}-${month}-${week.replace(' ', '')}`;
                    htmlPanel += `<div class="mb-1">
                        <div class="flex items-center gap-2 p-1 rounded-md hover:bg-white/5 transition-colors">
                            <input type="checkbox" class="cb-parent cb-w accent-[#685BC7] w-3 h-3 cursor-pointer">
                            <div class="folder-toggle flex-1 flex justify-between items-center cursor-pointer font-semibold text-[11px] text-white/60" data-target="${idW}">
                                ${week} <span class="arrow text-[10px] transition-transform duration-200 ${openFolders.includes(idW) ? 'rotate-180' : ''}">▼</span>
                            </div>
                        </div>
                        <div id="${idW}" class="folder-content ${openFolders.includes(idW) ? '' : 'hidden'} pl-2 border-l border-white/10 mt-1">`;

                    groupedDates[year][month][week].forEach(dateVal => {
                        const dt = new Date(dateVal + 'T00:00:00');
                        const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
                        const formattedDate = dateVal.split('-').reverse().join('/'); 
                        const isChecked = activeDates.includes(dateVal) ? 'checked' : '';

                        htmlPanel += `
                        <div class="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 transition-colors">
                            <input type="checkbox" value="${dateVal}" class="cb-day accent-[#8b5cf6] w-3 h-3 cursor-pointer" ${isChecked}>
                            <span class="text-[11px] text-white/80 cursor-pointer" onclick="this.previousElementSibling.click()">${days[dt.getDay()]} - ${formattedDate}</span>
                        </div>`;
                    });
                    htmlPanel += `</div></div>`;
                });
                htmlPanel += `</div></div>`;
            });
            htmlPanel += `</div>`;
        });

        panelDate.innerHTML = htmlPanel;

        // --- NOVO: SINCRONIZA O VISUAL DAS CAIXINHAS PAI ---
        function syncParentCheckboxes() {
            ['cb-w', 'cb-m', 'cb-y'].forEach(levelClass => {
                panelDate.querySelectorAll('.' + levelClass).forEach(cbParent => {
                    const contentFolder = cbParent.closest('div').nextElementSibling;
                    if (!contentFolder) return;
                    
                    const days = Array.from(contentFolder.querySelectorAll('.cb-day'));
                    const checkedDays = days.filter(d => d.checked).length;
                    
                    if (checkedDays === 0) {
                        cbParent.checked = false;
                        cbParent.indeterminate = false;
                    } else if (checkedDays === days.length) {
                        cbParent.checked = true;
                        cbParent.indeterminate = false;
                    } else {
                        cbParent.checked = false;
                        cbParent.indeterminate = true; // Feedback de seleção parcial
                    }
                });
            });
        }

        // Roda a sincronização na largada para atualizar a interface logo que desenha
        syncParentCheckboxes();

        panelDate.querySelectorAll('.folder-toggle').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = el.getAttribute('data-target');
                const content = document.getElementById(targetId);
                const arrow = el.querySelector('.arrow');
                content.classList.toggle('hidden');
                arrow.classList.toggle('rotate-180');
            });
        });

        // Clique no Pai (Ano, Mês, Semana)
        panelDate.querySelectorAll('.cb-parent').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const contentFolder = e.target.closest('div').nextElementSibling;
                if(contentFolder) {
                    contentFolder.querySelectorAll('.cb-day').forEach(childCb => childCb.checked = isChecked);
                }
                syncParentCheckboxes(); // Garante a atualização visual antes de enviar pro DataManager
                triggerFilterUpdate();
            });
        });

        // Clique no Filho (Dia exato)
        panelDate.querySelectorAll('.cb-day').forEach(cb => {
            cb.addEventListener('change', () => { 
                syncParentCheckboxes(); // Garante atualização da árvore visual
                triggerFilterUpdate(); 
            });
        });

        document.getElementById('btn-clear-dates').addEventListener('click', () => {
            panelDate.querySelectorAll('.cb-day').forEach(cb => cb.checked = false);
            syncParentCheckboxes();
            triggerFilterUpdate();
        });

        function triggerFilterUpdate() {
            const selected = Array.from(panelDate.querySelectorAll('.cb-day:checked')).map(cb => cb.value);
            appData.setFilter('pure_date', selected);
        }
    }
}