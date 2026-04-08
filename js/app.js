import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTKgLMbTRcpWPS4Pzd6lSW1f8TaxWL2K89ZYTe29LQcdHKB3LbvBgemmp2IdLONNu5gyS4f81TZ9SZJ/pub?output=csv';
let raw = [], filteredData = [];
let isDataLoaded = false;
let currentRoute = 'view-overview';

// Controle Exclusivo do Slicer de Data (Árvore de Hierarquia)
let selectedDates = new Set();
let allDatesArray = [];
const monthNames = { '01':'Janeiro', '02':'Fevereiro', '03':'Março', '04':'Abril', '05':'Maio', '06':'Junho', '07':'Julho', '08':'Agosto', '09':'Setembro', '10':'Outubro', '11':'Novembro', '12':'Dezembro' };

// Mapeamento dos OUTROS filtros
const filterKeys = {
    'f-shop': 'shopping', 'f-rede': 'rede', 'f-store': 'store name', 
    'f-linha': 'linha de produto', 'f-reg': 'regional', 'f-8020': 'p8020', 'f-vis': 'visibilidade'
};

// Formatação para nível de data final
function formatFilterDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const diaNome = dias[d.getDay()];
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
    const padWeek = weekNum.toString().padStart(2, '0');
    return `W${padWeek} - ${diaNome} ${parts[2]}/${parts[1]}`;
}

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
    if(currentRoute === 'view-overview') {
        renderOverviewCharts(filteredData);
    } else if (currentRoute === 'view-positivacao') {
        renderPositivacao(filteredData);
    } else if (currentRoute === 'view-heat-produtos') {
        renderHeatProdutos(filteredData);
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
            destroyOverviewCharts(); 
            destroyHeatProdutosCharts();
            
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

// --- DADOS, HIERARQUIA DE DATA E FILTROS ---
async function initData() {
    isDataLoaded = true;
    
    appContent.innerHTML = getOverviewHTML();
    appContent.classList.add('view-visible');

    Papa.parse(CSV_URL, { 
        download: true, header: true, skipEmptyLines: true, 
        transformHeader: h => h.trim().toLowerCase().replace('80/20', 'p8020').replace('date/time', 'datetime'),
        complete: res => { 
            raw = res.data; 
            raw.forEach(row => { if(row.datetime) row.pure_date = row.datetime.split(' ')[0]; });
            
            initDateSlicer(); 
            buildFilters();   
            applyFilters();   
        } 
    });
}

function initDateSlicer() {
    allDatesArray = [...new Set(raw.map(d => d.pure_date))].filter(x => x).sort((a,b) => b.localeCompare(a));
    selectedDates = new Set(allDatesArray);

    const hier = {};
    allDatesArray.forEach(d => {
        const [y, m, day] = d.split('-');
        if(!hier[y]) hier[y] = {};
        if(!hier[y][m]) hier[y][m] = [];
        hier[y][m].push(d);
    });

    let html = `<div class="space-y-1 pb-2">
        <div class="flex items-center gap-2 mb-2 pb-3 border-b border-gray-200 dark:border-white/10 hover:bg-gray-500/5 p-1 rounded transition-colors">
            <input type="checkbox" id="chk-all-dates" checked class="w-4 h-4 accent-[#685BC7] cursor-pointer shrink-0 ml-1"> 
            <label for="chk-all-dates" class="ds-helper-text font-black cursor-pointer text-adaptive w-full">Selecionar Todos</label>
        </div>`;

    Object.keys(hier).sort((a,b) => b-a).forEach((y, yIndex) => {
        const isYExpanded = yIndex === 0; 
        const yIconClass = isYExpanded ? "rotate-90" : "";
        const yContentClass = isYExpanded ? "" : "hidden";

        html += `<div class="tree-group">
            <div class="flex items-center gap-1.5 mb-1 hover:bg-gray-500/10 p-1 rounded transition-colors">
                <button class="toggle-btn w-5 h-5 flex items-center justify-center text-gray-400 hover:text-[#685BC7] transition-transform duration-200 ${yIconClass}" data-target="content-${y}">
                    <svg class="w-3 h-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
                <input type="checkbox" data-type="year" data-val="${y}" checked class="w-3.5 h-3.5 accent-[#685BC7] cursor-pointer chk-node shrink-0"> 
                <span class="ds-filter-input text-adaptive cursor-pointer select-none expand-label w-full" data-target="content-${y}">${y}</span>
            </div>
            <div id="content-${y}" class="pl-4 ml-2.5 border-l border-gray-200 dark:border-white/10 space-y-1 mb-2 ${yContentClass}">`;
        
        Object.keys(hier[y]).sort((a,b) => b-a).forEach((m, mIndex) => {
            const isMExpanded = yIndex === 0 && mIndex === 0; 
            const mIconClass = isMExpanded ? "rotate-90" : "";
            const mContentClass = isMExpanded ? "" : "hidden";

            html += `<div class="tree-group">
                <div class="flex items-center gap-1.5 mb-0.5 hover:bg-gray-500/10 p-1 rounded transition-colors">
                    <button class="toggle-btn w-4 h-4 flex items-center justify-center text-gray-500 hover:text-[#685BC7] transition-transform duration-200 ${mIconClass}" data-target="content-${y}-${m}">
                        <svg class="w-2.5 h-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <input type="checkbox" data-type="month" data-val="${y}-${m}" data-parent="${y}" checked class="w-3 h-3 accent-[#685BC7] cursor-pointer chk-node shrink-0"> 
                    <span class="ds-helper-text font-bold text-adaptive-muted cursor-pointer select-none expand-label w-full" data-target="content-${y}-${m}">${monthNames[m]}</span>
                </div>
                <div id="content-${y}-${m}" class="pl-4 ml-2 border-l border-gray-200 dark:border-white/10 space-y-0.5 mt-1 mb-2 ${mContentClass}">`;
            
            hier[y][m].forEach(d => {
                html += `<div class="flex items-center gap-2 py-1 hover:bg-gray-500/10 px-1 rounded transition-colors group">
                    <input type="checkbox" data-type="date" data-val="${d}" data-parent="${y}-${m}" data-grandparent="${y}" checked class="w-3 h-3 accent-[#685BC7] cursor-pointer chk-node chk-date shrink-0 ml-4"> 
                    <label class="ds-filter-label text-adaptive-strong whitespace-nowrap cursor-pointer select-none w-full group-hover:text-[#685BC7] transition-colors" onclick="this.previousElementSibling.click()">${formatFilterDate(d)}</label>
                </div>`;
            });
            html += `</div></div>`;
        });
        html += `</div></div>`;
    });
    html += '</div>';

    document.getElementById('date-slicer-panel').innerHTML = html;

    const btn = document.getElementById('btn-date-slicer');
    const panel = document.getElementById('date-slicer-panel');
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if(!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });
    panel.addEventListener('click', e => e.stopPropagation());

    document.querySelectorAll('.toggle-btn, .expand-label').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = elem.getAttribute('data-target');
            const contentDiv = document.getElementById(targetId);
            const toggleBtn = elem.classList.contains('toggle-btn') ? elem : elem.parentElement.querySelector('.toggle-btn');
            
            if (contentDiv.classList.contains('hidden')) {
                contentDiv.classList.remove('hidden');
                toggleBtn.classList.add('rotate-90');
            } else {
                contentDiv.classList.add('hidden');
                toggleBtn.classList.remove('rotate-90');
            }
        });
    });

    const chkAll = document.getElementById('chk-all-dates');
    const chkNodes = document.querySelectorAll('.chk-node');

    chkAll.addEventListener('change', (e) => {
        chkNodes.forEach(c => c.checked = e.target.checked);
        syncDates();
    });

    chkNodes.forEach(chk => {
        chk.addEventListener('change', (e) => {
            const t = e.target;
            const type = t.dataset.type;
            const val = t.dataset.val;
            
            if (type === 'year') {
                document.querySelectorAll(`.chk-node[data-parent="${val}"], .chk-node[data-grandparent="${val}"]`).forEach(c => c.checked = t.checked);
            } else if (type === 'month') {
                document.querySelectorAll(`.chk-node[data-parent="${val}"]`).forEach(c => c.checked = t.checked);
            }

            if (!t.checked) {
                chkAll.checked = false;
                if(type === 'date' || type === 'month') {
                    const mParent = document.querySelector(`.chk-node[data-type="month"][data-val="${t.dataset.parent}"]`);
                    if(mParent) mParent.checked = false;
                    const gpVal = t.dataset.grandparent || t.dataset.parent; 
                    const yParent = document.querySelector(`.chk-node[data-type="year"][data-val="${gpVal}"]`);
                    if(yParent) yParent.checked = false;
                }
            }
            syncDates();
        });
    });
}

function syncDates() {
    selectedDates.clear();
    document.querySelectorAll('.chk-date:checked').forEach(c => selectedDates.add(c.dataset.val));
    
    const lbl = document.getElementById('date-slicer-label');
    if (selectedDates.size === allDatesArray.length) {
        lbl.innerText = 'TODAS';
    } else if (selectedDates.size === 0) {
        lbl.innerText = 'NENHUMA';
    } else if (selectedDates.size === 1) {
        const d = Array.from(selectedDates)[0].split('-');
        lbl.innerText = `${d[2]}/${d[1]}/${d[0]}`;
    } else {
        lbl.innerText = `${selectedDates.size} DIAS SEL.`;
    }

    applyFilters();
}

function buildFilters() {
    const currentSelections = {};
    for (let id in filterKeys) currentSelections[id] = document.getElementById(id).value;
    
    for (let id in filterKeys) {
        const key = filterKeys[id]; const sel = document.getElementById(id);
        
        let dataForThisFilter = raw.filter(d => {
            if(!selectedDates.has(d.pure_date)) return false;

            return Object.keys(filterKeys).every(otherId => {
                if (otherId === id) return true;
                const selectedVal = currentSelections[otherId]; 
                return !selectedVal || d[filterKeys[otherId]] == selectedVal;
            });
        });
        
        const availableVals = [...new Set(dataForThisFilter.map(d => d[key] || 'N/A'))].filter(x => x !== 'N/A').sort();
        
        sel.innerHTML = `<option value="">TODOS</option>`;
        availableVals.forEach(v => sel.add(new Option(v.toUpperCase(), v)));
        
        if (availableVals.includes(currentSelections[id])) sel.value = currentSelections[id];
    }
}

function applyFilters() {
    buildFilters();
    
    filteredData = raw.filter(d => {
        if (!selectedDates.has(d.pure_date)) return false;

        return Object.keys(filterKeys).every(id => {
            const selectValue = document.getElementById(id).value; 
            return !selectValue || d[filterKeys[id]] == selectValue;
        });
    });

    renderActiveView(); 
}

document.querySelectorAll('#filter-drawer select').forEach(sel => {
    sel.addEventListener('change', applyFilters);
});

// --- CONTROLE DE TEMA ---
document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark');
        
        document.body.classList.toggle('dark', !isDark);
        document.body.classList.toggle('light', isDark);
        
        const icon = isDark ? '☀️' : '🌙';
        document.querySelectorAll('.btn-theme-toggle').forEach(b => b.innerHTML = icon);
        
        if(filteredData.length > 0) {
            appContent.classList.remove('view-visible');
            appContent.classList.add('view-hidden');
            
            setTimeout(() => {
                destroyOverviewCharts();
                destroyHeatProdutosCharts();
                
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