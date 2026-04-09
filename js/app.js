// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Importando o "Cérebro"
import { appData } from './services/dataManager.js';

// Importando os Módulos das Páginas
import { getOverviewHTML, renderOverviewCharts, destroyOverviewCharts } from "./view-overview.js";
import { getPositivacaoHTML, renderPositivacao } from "./view-positivacao.js";
import { getHeatProdutosHTML, renderHeatProdutos, destroyHeatProdutosCharts } from "./view-heat-produtos.js";
import { getAboutHTML, initAbout } from "./view-about.js";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC0uC6NuGMcaf-GlPcdwKWzn4ZKUW38dkY",
    authDomain: "prosolution-analytics.firebaseapp.com",
    projectId: "prosolution-analytics",
    storageBucket: "prosolution-analytics.firebasestorage.app",
    messagingSenderId: "878750256286",
    appId: "1:878750256286:web:0d5054e4b84f52bb83ff8f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
getRedirectResult(auth).catch(error => console.error("Erro no retorno do redirect:", error));

// --- VARIÁVEIS GLOBAIS DE ESTADO (Apenas UI e Rotas) ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKgLMbTRcpWPS4Pzd6lSW1f8TaxWL2K89ZYTe29LQcdHKB3LbvBgemmp2IdLONNu5gyS4f81TZ9SZJ/pub?output=csv';
let isDataLoaded = false;
let currentRoute = 'view-overview';

// --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => document.getElementById('login-screen').classList.add('hidden'), 500);
        document.getElementById('dash-shell').classList.remove('hidden');
        
        if (!sessionStorage.getItem('disclaimerAccepted')) {
            document.getElementById('disclaimer-modal').classList.remove('hidden');
        }
        if (!isDataLoaded) initData();
    } else {
        document.getElementById('login-screen').classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        document.getElementById('dash-shell').classList.add('hidden');
        document.getElementById('disclaimer-modal').classList.add('hidden');
    }
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
});

document.getElementById('btn-email-login').addEventListener('click', async () => {
    const email = document.getElementById('user').value; const pass = document.getElementById('pass').value;
    const btn = document.getElementById('btn-email-login');
    if(!email || !pass) { alert("Preencha e-mail e senha."); return; }
    try { btn.innerText = 'AUTENTICANDO...'; await signInWithEmailAndPassword(auth, email, pass); btn.innerText = 'AUTENTICAR'; } 
    catch (error) { alert('Acesso Negado.'); btn.innerText = 'AUTENTICAR'; }
});

document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) await signInWithRedirect(auth, googleProvider); else await signInWithPopup(auth, googleProvider);
    } catch (error) { if (error.code !== 'auth/popup-closed-by-user') alert('Falha ao autenticar.'); }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth).then(() => { document.getElementById('pass').value = ''; sessionStorage.removeItem('disclaimerAccepted'); });
});

document.getElementById('btn-accept-beta').addEventListener('click', () => {
    document.getElementById('disclaimer-modal').classList.add('hidden'); sessionStorage.setItem('disclaimerAccepted', 'true');
});

// --- ROTEAMENTO (NAVEGAÇÃO) ---
const appContent = document.getElementById('app-content');
const navItems = document.querySelectorAll('.nav-item');

function renderActiveView() {
    // As views agora não recebem os dados por argumento, 
    // elas consultam o appData internamente.
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
            // Limpa gráficos anteriores
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

// --- CARGA DE DADOS INICIAL ---
async function initData() {
    isDataLoaded = true;
    
    appContent.innerHTML = getOverviewHTML();
    appContent.classList.add('view-visible');

    Papa.parse(CSV_URL, { 
        download: true, header: true, skipEmptyLines: true, 
        transformHeader: h => h.trim().toLowerCase().replace('80/20', 'p8020').replace('date/time', 'datetime'),
        complete: res => { 
            let rawData = res.data; 
            rawData.forEach(row => { if(row.datetime) row.pure_date = row.datetime.split(' ')[0]; });
            
            // Envia tudo para o DataManager (Ele cuida do resto)
            appData.setRawData(rawData);
            
            // Configura os ouvintes dos selects
            setupGlobalFilters();
            
            // Renderiza a tela inicial
            renderActiveView();
        } 
    });
}

// --- CONEXÃO DOS FILTROS DA UI COM O DATAMANAGER ---
const filterKeys = {
    'f-shop': 'shopping', 'f-rede': 'rede', 'f-store': 'store name', 
    'f-linha': 'linha de produto', 'f-reg': 'regional', 'f-8020': 'p8020', 'f-vis': 'visibilidade'
};

function setupGlobalFilters() {
    // 1. Ouve as ações do usuário e envia para o Cérebro
    Object.keys(filterKeys).forEach(id => {
        const selectElement = document.getElementById(id);
        if (selectElement) {
            selectElement.addEventListener('change', (e) => {
                appData.setFilter(filterKeys[id], e.target.value);
            });
        }
    });

    // 2. A MÁGICA: Ouve o Cérebro para atualizar as opções disponíveis (Cascata)
    appData.subscribe(() => {
        updateDropdownUI();
    });

    // 3. Popula os selects na carga inicial
    updateDropdownUI();
}

function updateDropdownUI() {
    const raw = appData.rawData;
    const currentFilters = appData.currentFilters;

    Object.keys(filterKeys).forEach(id => {
        const key = filterKeys[id];
        const selectElement = document.getElementById(id);
        if (!selectElement) return;

        // Guarda o valor que o usuário tinha selecionado
        const currentVal = currentFilters[key] || "";

        // Pega as opções válidas ignorando o próprio filtro atual 
        // (Para o select não esvaziar suas próprias opções após o clique)
        let dataForThisFilter = raw.filter(item => {
            let matches = true;
            for (const fKey in currentFilters) {
                if (fKey === key) continue; // Pula o próprio filtro
                if (item[fKey] && item[fKey] !== currentFilters[fKey]) {
                    matches = false;
                    break;
                }
            }
            return matches;
        });

        const availableVals = [...new Set(dataForThisFilter.map(d => d[key]))]
                                .filter(x => x && x.toString().trim() !== '' && x !== 'N/A')
                                .sort();

        selectElement.innerHTML = `<option value="">TODOS</option>`;
        availableVals.forEach(v => selectElement.add(new Option(v.toUpperCase(), v)));

        // Devolve a seleção se ela ainda for válida no novo contexto
        if (currentVal && availableVals.includes(currentVal)) {
            selectElement.value = currentVal;
        }
    });
}

// --- CONTROLE DE TEMA ---
document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark');
        
        document.body.classList.toggle('dark', !isDark);
        document.body.classList.toggle('light', isDark);
        
        const icon = isDark ? '☀️' : '🌙';
        document.querySelectorAll('.btn-theme-toggle').forEach(b => b.innerHTML = icon);
        
        // Se já tiver dados carregados, manda a view se redesenhar com o novo tema
        if(appData.getFilteredData().length > 0) {
            appContent.classList.remove('view-visible');
            appContent.classList.add('view-hidden');
            
            setTimeout(() => {
                try { destroyOverviewCharts(); } catch(e){}
                try { destroyHeatProdutosCharts(); } catch(e){}
                
                if (currentRoute === 'view-overview') {
                    appContent.innerHTML = getOverviewHTML();
                } else if (currentRoute === 'view-positivacao') {
                    appContent.innerHTML = getPositivacaoHTML();
                } else if (currentRoute === 'view-heat-produtos') {
                    appContent.innerHTML = getHeatProdutosHTML();
                }
                
                renderActiveView();
                appContent.classList.remove('view-hidden');
                appContent.classList.add('view-visible');
            }, 100);
        }
    });
});