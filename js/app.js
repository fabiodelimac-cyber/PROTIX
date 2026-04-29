// js/app.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Importando o "Cérebro"
import { appData } from './services/dataManager.js';

// Importando Performance Monitor
import { initPerformanceMonitoring, stopPerformanceMonitoring } from './performance-integration.js';

// Importando os Módulos das Páginas
import { getOverviewHTML, renderOverviewCharts, destroyOverviewCharts } from "./view-overview.js";
import { getPositivacaoHTML, renderPositivacao } from "./view-positivacao.js";
import { getHeatProdutosHTML, renderHeatProdutos, destroyHeatProdutosCharts } from "./view-heat-produtos.js";
import { getPerformanceHTML, renderPerformance, destroyPerformanceCharts } from "./view-performance.js";
import { getAboutHTML, initAbout } from "./view-about.js";

const viewSocial = document.getElementById('login-social-view');
const viewEmail = document.getElementById('login-email-view');
const btnShowEmail = document.getElementById('btn-show-email');
const btnBackSocial = document.getElementById('btn-back-social');

if (btnShowEmail && btnBackSocial) {
    btnShowEmail.addEventListener('click', () => {
        // Esconde o Social
        viewSocial.classList.remove('opacity-100', 'translate-x-0', 'pointer-events-auto');
        viewSocial.classList.add('opacity-0', '-translate-x-8', 'pointer-events-none');
        // Mostra o Email
        viewEmail.classList.remove('opacity-0', 'translate-x-8', 'pointer-events-none');
        viewEmail.classList.add('opacity-100', 'translate-x-0', 'pointer-events-auto');
    });

    btnBackSocial.addEventListener('click', () => {
        // Esconde o Email
        viewEmail.classList.remove('opacity-100', 'translate-x-0', 'pointer-events-auto');
        viewEmail.classList.add('opacity-0', 'translate-x-8', 'pointer-events-none');
        // Mostra o Social
        viewSocial.classList.remove('opacity-0', '-translate-x-8', 'pointer-events-none');
        viewSocial.classList.add('opacity-100', 'translate-x-0', 'pointer-events-auto');
    });
}

// --- TEMA: LIGHT / DARK MODE ---
const themeToggles = document.querySelectorAll('.btn-theme-toggle');

// 1. Checa a preferência salva ao carregar a página
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.remove('dark');
    // Atualiza o logo para a versão light
    const logoImg = document.querySelector('#float-logo img');
    if (logoImg) {
        logoImg.src = 'images/header-light.png';
    }
    // ícones gerenciados pelo syncThemeIcons no index.html
}

// 2. Escuta o clique nos botões de tema (Mobile e Desktop)
themeToggles.forEach(btn => {
    btn.addEventListener('click', () => {
        // Alterna a classe no body
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        
        // Salva a preferência no navegador do usuário
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Atualiza o logo
        const logoImg = document.querySelector('#float-logo img');
        if (logoImg) {
            logoImg.src = isDark ? 'images/header.png' : 'images/header-light.png';
        }
        
        // Atualiza os ícones (gerenciado pelo syncThemeIcons no index.html via MutationObserver)

        // Se o usuário já passou do login, redesenha os gráficos com as novas cores
        if (isDataLoaded) {
            try { destroyOverviewCharts(); } catch(e){}
            try { destroyHeatProdutosCharts(); } catch(e){}
            renderActiveView();
        }
    });
});

// --- CONFIGURAÇÃO SUPABASE ---
// Lembre-se de colocar as suas chaves aqui (Project URL e Publishable Key)
import { supabase } from './services/supabaseClient.js';

// --- VARIÁVEIS GLOBAIS DE ESTADO (Apenas UI e Rotas) ---
let isDataLoaded = false;
let currentRoute = 'view-overview';
let isLoggingOut = false; // Flag para evitar múltiplos logouts simultâneos
let loggedOutByInactivity = false; // Flag para exibir o modal de inatividade

// --- AUTO-LOGOUT POR INATIVIDADE ---
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutos
const INACTIVITY_WARNING_BEFORE_MS = 2 * 60 * 1000; // Avisa 2 minutos antes do logout (aos 8min)
let inactivityTimer = null;
let inactivityWarningTimer = null;
let toastCountdownInterval = null;

function showInactivityToast() {
    const toast = document.getElementById('inactivity-toast');
    const countdown = document.getElementById('inactivity-toast-countdown');
    if (!toast || !countdown) return;

    let seconds = Math.round(INACTIVITY_WARNING_BEFORE_MS / 1000);

    function formatCountdown(s) {
        if (s >= 60) {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return sec > 0 ? `${m}min ${sec}s` : `${m}min`;
        }
        return `${s}s`;
    }

    countdown.innerHTML = `Você será desconectado em <strong style="color:rgba(234,179,8,0.85);">${formatCountdown(seconds)}</strong>`;

    toast.style.display = 'flex';
    // Força reflow para a transição funcionar
    toast.getBoundingClientRect();
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    toastCountdownInterval = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            countdown.innerHTML = `Você será desconectado em <strong style="color:rgba(234,179,8,0.85);">${formatCountdown(seconds)}</strong>`;
        } else {
            clearInterval(toastCountdownInterval);
            toastCountdownInterval = null;
        }
    }, 1000);
}

function hideInactivityToast() {
    const toast = document.getElementById('inactivity-toast');
    if (!toast) return;

    if (toastCountdownInterval) {
        clearInterval(toastCountdownInterval);
        toastCountdownInterval = null;
    }

    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 350);
}

function startInactivityTimer() {
    stopInactivityTimer(); // Garante que não há timer duplicado

    // Timer do aviso (dispara INACTIVITY_WARNING_BEFORE_MS antes do logout)
    inactivityWarningTimer = setTimeout(() => {
        showInactivityToast();
    }, INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_BEFORE_MS);

    // Timer do logout
    inactivityTimer = setTimeout(async () => {
        hideInactivityToast();
        if (!isLoggingOut) {
            isLoggingOut = true;
            loggedOutByInactivity = true; // Sinaliza que foi por inatividade
            try {
                await supabase.auth.signOut();
            } catch (err) {
                console.error('Erro ao deslogar por inatividade:', err);
                isLoggingOut = false;
                loggedOutByInactivity = false;
            }
        }
    }, INACTIVITY_TIMEOUT_MS);
}

function resetInactivityTimer() {
    if (inactivityTimer !== null) {
        // Só reseta se o timer estiver ativo (usuário logado)
        hideInactivityToast();
        startInactivityTimer();
    }
}

function stopInactivityTimer() {
    if (inactivityTimer !== null) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    if (inactivityWarningTimer !== null) {
        clearTimeout(inactivityWarningTimer);
        inactivityWarningTimer = null;
    }
    hideInactivityToast();
}

// Eventos que indicam atividade do usuário
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
});

// --- LOGIN LOADING OVERLAY ---
// userInitiatedLogin: só é true quando o usuário clicou num botão de login
let userInitiatedLogin = false;

function showLoginLoading(text = 'Autenticando...') {
    const overlay = document.getElementById('login-loading-overlay');
    const textEl = document.getElementById('login-loading-text');
    if (overlay) {
        if (textEl) textEl.textContent = text;
        overlay.classList.remove('hidden');
        overlay.classList.add('show');
    }
}

function hideLoginLoading() {
    const overlay = document.getElementById('login-loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.classList.add('hidden');
    }
}

// --- AUTENTICAÇÃO (MOTOR SUPABASE) ---
// --- AUTENTICAÇÃO (MOTOR SUPABASE COM ESTEIRA DE APROVAÇÃO) ---

// Detecta retorno do OAuth (URL contém ?code= com formato UUID válido)
// Só mostra loading se for um callback OAuth real (não um reload)
(function() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && code.length > 10) {
        userInitiatedLogin = true;
        showLoginLoading('Validando acesso...');
        // Limpa a URL para evitar reloads com o código
        window.history.replaceState({}, '', window.location.pathname);
    }
})();

// Previne notificações OAuth quando a página fica inativa
let authInProgress = false;
let visibilityTimer = null;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Página ficou em background
        // Se não há autenticação em progresso, limpa qualquer estado OAuth pendente após 10 segundos
        visibilityTimer = setTimeout(async () => {
            if (!authInProgress && document.hidden) {
                // Limpa qualquer callback OAuth pendente no localStorage
                try {
                    const keys = Object.keys(localStorage);
                    keys.forEach(key => {
                        if (key.includes('supabase.auth') && key.includes('code-verifier')) {
                            localStorage.removeItem(key);
                        }
                    });
                } catch (e) { /* silencioso */ }
            }
        }, 10000); // 10 segundos
    } else {
        // Página voltou ao foreground
        if (visibilityTimer) {
            clearTimeout(visibilityTimer);
            visibilityTimer = null;
        }
    }
});

supabase.auth.onAuthStateChange(async (event, session) => {
    
    if (session) {
        authInProgress = true; // Marca que há autenticação em progresso
        
        // Ignora eventos de refresh de token — o usuário já está logado
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            authInProgress = false;
            return;
        }
        
        if (userInitiatedLogin) {
            showLoginLoading('Validando acesso...');
        }
        
        // INTERCEPTAÇÃO: O usuário logou no Google, mas temos que checar se você aprovou
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('status')
                .eq('id', session.user.id)
                .single();

            if (data && data.status === 'approved') {
                hideLoginLoading();
                userInitiatedLogin = false;
                sessionStorage.removeItem('oauth-processed');
                // FLUXO LIBERADO: Usuário está aprovado
                const loginScreen = document.getElementById('login-screen');
                loginScreen.style.opacity = '0';
                loginScreen.style.pointerEvents = 'none';
                setTimeout(() => { 
                    loginScreen.style.display = 'none';
                    // Stop meshGradient animation to free GPU after login
                    loginScreen.classList.remove('bg-mesh');
                    loginScreen.classList.add('bg-mesh-static');
                }, 500);

                const dashShell = document.getElementById('dash-shell');
                dashShell.style.display = 'flex';
                dashShell.style.flexDirection = 'column';
                dashShell.style.flex = '1';
                dashShell.style.minHeight = '0';

                const emailDisplay = document.getElementById('topbar-user-email');
                if (emailDisplay) emailDisplay.innerText = session.user.email;

                // Inicia o monitoramento de performance
                await initPerformanceMonitoring(session.user);

                // Inicia o timer de inatividade
                startInactivityTimer();

                // Sempre mostra o disclaimer ao logar
                document.getElementById('disclaimer-modal').classList.remove('hidden');
                startDisclaimerCountdown();
                
                if (!isDataLoaded) initData();
                
                authInProgress = false; // Autenticação concluída
                
            } else {
                hideLoginLoading();
                userInitiatedLogin = false;
                sessionStorage.removeItem('oauth-processed');
                // FLUXO BLOQUEADO: Usuário é pending ou a tabela falhou
                alert("Sua conta foi cadastrada com sucesso, mas aguarda aprovação do Administrador para acessar a dashboard.");
                await supabase.auth.signOut(); // Desloga o cidadão na mesma hora
                authInProgress = false;
            }
        } catch (err) {
            console.error("🔐 Erro ao validar acesso:", err);
            hideLoginLoading();
            userInitiatedLogin = false;
            sessionStorage.removeItem('oauth-processed');
            alert("Erro ao validar permissões. Contate o administrador.");
            await supabase.auth.signOut();
            authInProgress = false;
        }
    } else {
        authInProgress = false; // Reseta flag
        hideLoginLoading();
        // FLUXO DE SAÍDA (LOGOUT NORMAL)
        isLoggingOut = false; // Reseta a flag de logout
        stopInactivityTimer(); // Para o timer de inatividade
        stopPerformanceMonitoring();
        const loginScreen = document.getElementById('login-screen');
        loginScreen.style.display = 'flex';
        loginScreen.style.opacity = '1';
        loginScreen.style.pointerEvents = 'auto';
        document.getElementById('dash-shell').style.display = 'none';
        document.getElementById('disclaimer-modal').classList.add('hidden');

        // Exibe o modal de inatividade se o logout foi automático
        if (loggedOutByInactivity) {
            loggedOutByInactivity = false;
            const inactivityModal = document.getElementById('inactivity-modal');
            if (inactivityModal) {
                inactivityModal.style.display = 'flex';
            }
        }
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
        userInitiatedLogin = true;
        showLoginLoading('Autenticando...');
        const { error } = await supabase.auth.signInWithPassword({ email: email, password: pass });
        if (error) throw error;
        btn.innerText = 'AUTENTICAR'; 
    } catch (error) { 
        hideLoginLoading();
        alert('Acesso Negado: ' + error.message); 
        btn.innerText = 'AUTENTICAR'; 
    }
});

document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
        userInitiatedLogin = true;
        showLoginLoading('Conectando com Google...');
        const { error } = await supabase.auth.signInWithOAuth({ 
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
    } catch (error) { 
        hideLoginLoading();
        alert('Falha ao iniciar autenticação com Google.'); 
    }
});

// Listener para o botão da Microsoft
const btnMicrosoftLogin = document.getElementById('btn-microsoft-login');
if (btnMicrosoftLogin) {
    btnMicrosoftLogin.addEventListener('click', async () => {
        try {
            userInitiatedLogin = true;
            showLoginLoading('Conectando com Microsoft...');
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'azure',
                options: {
                    scopes: 'email profile',
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err) {
            hideLoginLoading();
            console.error("Erro no login Microsoft:", err);
            alert("Erro ao conectar com Microsoft: " + err.message);
        }
    });
}

// Logout via Event Delegation no app-box (sobrevive a qualquer manipulação DOM)
document.getElementById('app-box').addEventListener('click', async (e) => {
    const logoutBtn = e.target.closest('#btn-logout');
    if (!logoutBtn) return;
    
    // Proteção contra múltiplos cliques
    if (isLoggingOut) return;
    
    isLoggingOut = true;
    
    e.stopPropagation();
    e.preventDefault();
    
    // Feedback visual imediato
    logoutBtn.style.opacity = '0.5';
    logoutBtn.style.pointerEvents = 'none';
    logoutBtn.innerHTML = '<span style="font-size:10px;">SAINDO...</span>';
    
    // Fecha qualquer painel de filtro aberto antes de deslogar
    document.querySelectorAll('.slicer-panel.panel-open').forEach(p => p.classList.remove('panel-open'));
    document.querySelectorAll('.slicer-active').forEach(b => b.classList.remove('slicer-active'));
    
    // Remove about-overlay se estiver aberto (pode estar bloqueando)
    const aboutOverlay = document.getElementById('about-overlay');
    if (aboutOverlay) {
        aboutOverlay.remove();
    }
    
    // Remove disclaimer-modal se estiver visível (pode estar bloqueando)
    const disclaimerModal = document.getElementById('disclaimer-modal');
    if (disclaimerModal && !disclaimerModal.classList.contains('hidden')) {
        disclaimerModal.classList.add('hidden');
    }
    
    try {
        // Timeout de 5 segundos para o signOut
        const signOutPromise = supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 5000)
        );
        
        await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        
        // Fallback: força a tela de login mesmo se o signOut falhar
        isLoggingOut = false; // Libera a flag
        
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'flex';
            loginScreen.style.opacity = '1';
            loginScreen.style.pointerEvents = 'auto';
        }
        
        const dashShell = document.getElementById('dash-shell');
        if (dashShell) {
            dashShell.style.display = 'none';
        }
        
        // Limpa localStorage e sessionStorage
        try {
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.clear();
        } catch (e) {
            console.error('Erro ao limpar storage:', e);
        }
        
        // Recarrega a página para garantir estado limpo
        setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
        }, 500);
    }
    
    // Limpa o campo de senha se existir (apenas na tela de login)
    const passField = document.getElementById('pass');
    if (passField) {
        passField.value = '';
    }
});

document.getElementById('btn-accept-beta').addEventListener('click', () => {
    document.getElementById('disclaimer-modal').classList.add('hidden');
});

document.getElementById('btn-inactivity-ok').addEventListener('click', () => {
    document.getElementById('inactivity-modal').style.display = 'none';
});

// Função para iniciar a contagem regressiva no disclaimer
function startDisclaimerCountdown() {
    const btnAccept = document.getElementById('btn-accept-beta');
    let countdown = 3;
    
    // Desabilita o botão e mostra a contagem
    btnAccept.disabled = true;
    btnAccept.style.opacity = '0.5';
    btnAccept.style.cursor = 'not-allowed';
    btnAccept.innerText = `ESTOU CIENTE (${countdown}s)`;
    
    const interval = setInterval(() => {
        countdown--;
        
        if (countdown > 0) {
            btnAccept.innerText = `ESTOU CIENTE (${countdown}s)`;
        } else {
            // Contagem terminou, habilita o botão
            btnAccept.disabled = false;
            btnAccept.style.opacity = '1';
            btnAccept.style.cursor = 'pointer';
            btnAccept.innerText = 'ESTOU CIENTE';
            clearInterval(interval);
        }
    }, 1000);
}

// --- ROTEAMENTO (NAVEGAÇÃO) - INTACTO ---
const appContent = document.getElementById('app-content');
const navItems = document.querySelectorAll('.nav-pill');

function renderActiveView() {
    if(currentRoute === 'view-overview') {
        renderOverviewCharts(); 
    } else if (currentRoute === 'view-positivacao') {
        renderPositivacao();
    } else if (currentRoute === 'view-heat-produtos') {
        renderHeatProdutos();
    } else if (currentRoute === 'view-performance') {
        renderPerformance();
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
            try { destroyPerformanceCharts(); } catch(e){}
            
            if(target === 'view-overview') {
                appContent.innerHTML = getOverviewHTML();
                renderActiveView();
            } else if (target === 'view-positivacao') {
                appContent.innerHTML = getPositivacaoHTML();
                renderActiveView();
            } else if (target === 'view-heat-produtos') {
                appContent.innerHTML = getHeatProdutosHTML();
                renderActiveView();
            } else if (target === 'view-performance') {
                appContent.innerHTML = getPerformanceHTML();
                renderActiveView();
            } else {
                appContent.innerHTML = `<div class="h-[60vh] flex flex-col items-center justify-center text-center"><span class="text-4xl mb-4">🚧</span><h2 class="ds-title text-gray-400 uppercase mt-4">Módulo em Desenvolvimento</h2><p class="ds-helper-text text-gray-600 mt-2">A página será liberada na próxima atualização.</p></div>`;
            }

            appContent.classList.remove('view-hidden');
            appContent.classList.add('view-visible');
            
            // Scroll suave para o topo ao trocar de view
            const contentWrapper = document.getElementById('app-content-wrapper');
            if (contentWrapper) {
                contentWrapper.scrollTo({ top: 0, behavior: 'smooth' });
            }
            
            closeSidebarMobile();
        }, 200); 
    });
});

// Sidebar removida - substituída por topbar (nav pills)
function closeSidebarMobile() { /* noop - sem sidebar */ }

let isAboutOpen = false; // Flag para evitar múltiplas aberturas do About

document.getElementById('btn-go-about').addEventListener('click', () => {
    if (isAboutOpen) return;
    
    isAboutOpen = true;
    
    // Remove overlay anterior se existir (proteção contra clique duplo)
    const existingOverlay = document.getElementById('about-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const shell = document.getElementById('dash-shell');
    shell.style.transition = 'opacity 0.6s ease, filter 0.6s ease';
    shell.style.opacity = '0';
    shell.style.filter = 'blur(10px)';
    setTimeout(() => {
        document.getElementById('app-box').insertAdjacentHTML('beforeend', getAboutHTML());
        initAbout();
        
        // Reseta a flag quando o overlay for removido
        const checkRemoval = setInterval(() => {
            if (!document.getElementById('about-overlay')) {
                isAboutOpen = false;
                clearInterval(checkRemoval);
            }
        }, 100);
    }, 600);
});


// --- BYPASS LOGIN (modo teste) ---
window.addEventListener('bypass-login', () => {
    if (!isDataLoaded) initData();
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
            .order('pure_date', { ascending: false });

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
    // Removido f-rede, f-linha, f-reg, f-8020, f-vis - agora são slicers
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
            e.stopPropagation();
            const isOpen = panelDate.classList.contains('panel-open');
            closeOtherPanels(['date-slicer-panel']);
            if (!isOpen) {
                panelDate.classList.add('panel-open');
                newBtnDate.classList.add('slicer-active');
            } else {
                panelDate.classList.remove('panel-open');
                newBtnDate.classList.remove('slicer-active');
            }
            updateButtonDimState();
        });

        // Fecha o painel se clicar fora dele
        document.addEventListener('click', (e) => {
            if (!newBtnDate.contains(e.target) && !panelDate.contains(e.target)) {
                panelDate.classList.remove('panel-open');
                newBtnDate.classList.remove('slicer-active');
                updateButtonDimState();
            }
        });
    }

    // 3. Configura o botão do Filtro de Shopping Hierárquico
    const btnShop = document.getElementById('btn-shop-slicer');
    const panelShop = document.getElementById('shop-slicer-panel');
    if (btnShop && panelShop) {
        const newBtnShop = btnShop.cloneNode(true);
        btnShop.parentNode.replaceChild(newBtnShop, btnShop);
        newBtnShop.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panelShop.classList.contains('panel-open');
            closeOtherPanels(['shop-slicer-panel']);
            if (!isOpen) {
                panelShop.classList.add('panel-open');
                newBtnShop.classList.add('slicer-active');
            } else {
                panelShop.classList.remove('panel-open');
                newBtnShop.classList.remove('slicer-active');
            }
            updateButtonDimState();
        });

        // Fecha o painel se clicar fora dele
        document.addEventListener('click', (e) => {
            if (!newBtnShop.contains(e.target) && !panelShop.contains(e.target)) {
                panelShop.classList.remove('panel-open');
                newBtnShop.classList.remove('slicer-active');
                updateButtonDimState();
            }
        });
    }

    // 4. Configura o botão do Filtro de PDV Hierárquico
    const btnPdv = document.getElementById('btn-pdv-slicer');
    const panelPdv = document.getElementById('pdv-slicer-panel');
    if (btnPdv && panelPdv) {
        const newBtnPdv = btnPdv.cloneNode(true);
        btnPdv.parentNode.replaceChild(newBtnPdv, btnPdv);
        newBtnPdv.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panelPdv.classList.contains('panel-open');
            closeOtherPanels(['pdv-slicer-panel']);
            if (!isOpen) {
                panelPdv.classList.add('panel-open');
                newBtnPdv.classList.add('slicer-active');
            } else {
                panelPdv.classList.remove('panel-open');
                newBtnPdv.classList.remove('slicer-active');
            }
            updateButtonDimState();
        });

        document.addEventListener('click', (e) => {
            if (!newBtnPdv.contains(e.target) && !panelPdv.contains(e.target)) {
                panelPdv.classList.remove('panel-open');
                newBtnPdv.classList.remove('slicer-active');
                updateButtonDimState();
            }
        });
    }

    // 5-8. Configura os filtros simples (Linha, Regional, 80/20, Visibilidade)
    const simpleSlicers = [
        { id: 'linha', field: 'linha_de_produto', title: 'LINHA DE PRODUTO' },
        { id: 'regional', field: 'regional', title: 'REGIONAL' },
        { id: 'p8020', field: 'p8020', title: '80/20' },
        { id: 'vis', field: 'visibilidade', title: 'VISIBILIDADE' }
    ];

    simpleSlicers.forEach(slicer => {
        const btn = document.getElementById(`btn-${slicer.id}-slicer`);
        const panel = document.getElementById(`${slicer.id}-slicer-panel`);
        if (btn && panel) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = panel.classList.contains('panel-open');
                closeOtherPanels([`${slicer.id}-slicer-panel`]);
                if (!isOpen) {
                    panel.classList.add('panel-open');
                    newBtn.classList.add('slicer-active');
                } else {
                    panel.classList.remove('panel-open');
                    newBtn.classList.remove('slicer-active');
                }
                updateButtonDimState();
            });

            document.addEventListener('click', (e) => {
                if (!newBtn.contains(e.target) && !panel.contains(e.target)) {
                    panel.classList.remove('panel-open');
                    newBtn.classList.remove('slicer-active');
                    updateButtonDimState();
                }
            });
        }
    });

    // Função para fechar outros painéis com animação
    function closeOtherPanels(except = []) {
        const allPanels = ['date-slicer-panel', 'shop-slicer-panel', 'pdv-slicer-panel', 'linha-slicer-panel', 'regional-slicer-panel', 'p8020-slicer-panel', 'vis-slicer-panel'];
        const panelToBtnMap = {
            'date-slicer-panel': 'btn-date-slicer',
            'shop-slicer-panel': 'btn-shop-slicer',
            'pdv-slicer-panel': 'btn-pdv-slicer',
            'linha-slicer-panel': 'btn-linha-slicer',
            'regional-slicer-panel': 'btn-regional-slicer',
            'p8020-slicer-panel': 'btn-p8020-slicer',
            'vis-slicer-panel': 'btn-vis-slicer'
        };
        allPanels.forEach(panelId => {
            if (!except.includes(panelId)) {
                const panel = document.getElementById(panelId);
                if (panel) panel.classList.remove('panel-open');
                const btn = document.getElementById(panelToBtnMap[panelId]);
                if (btn) btn.classList.remove('slicer-active');
            }
        });
    }

    // Função para dimmer/undimmer os outros botões
    function updateButtonDimState() {
        const allBtns = ['btn-date-slicer', 'btn-shop-slicer', 'btn-pdv-slicer', 'btn-linha-slicer', 'btn-regional-slicer', 'btn-p8020-slicer', 'btn-vis-slicer'];
        const activeBtn = allBtns.find(btnId => {
            const btn = document.getElementById(btnId);
            return btn && btn.classList.contains('slicer-active');
        });

        allBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            
            if (activeBtn && btnId !== activeBtn) {
                btn.classList.add('slicer-dimmed');
            } else {
                btn.classList.remove('slicer-dimmed');
            }
        });

        // Esmaecer o filtro flutuante do heatmap quando um filtro global está aberto
        const floatingFilter = document.getElementById('hp-floating-filter');
        if (floatingFilter) {
            const inner = document.getElementById('hp-floating-filter-inner');
            if (inner) {
                if (activeBtn) {
                    inner.style.transition = 'opacity 0.3s ease';
                    inner.style.opacity = '0.2';
                    inner.style.pointerEvents = 'none';
                } else {
                    inner.style.transition = 'opacity 0.3s ease';
                    inner.style.opacity = '';
                    inner.style.pointerEvents = '';
                }
            }
        }
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
                const filterVal = currentFilters[fKey];
                const itemVal = item[fKey];
                if (Array.isArray(filterVal)) {
                    if (filterVal.length > 0 && (!itemVal || !filterVal.includes(itemVal))) matches = false;
                } else {
                    if (filterVal && itemVal && String(itemVal) !== String(filterVal)) matches = false;
                }
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

        let htmlPanel = `<div class="mb-3 border-b border-white/10 pb-3 flex justify-end items-center">
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

    // --- 3. ATUALIZA O FILTRO DE SHOPPING HIERÁRQUICO COM CHECKBOXES ---
    const panelShop = document.getElementById('shop-slicer-panel');
    const labelShop = document.getElementById('shop-slicer-label');
    
    if (panelShop && labelShop) {
        const openFolders = Array.from(panelShop.querySelectorAll('.folder-content:not(.hidden)')).map(el => el.id);
        
        let dataForShopFilter = raw.filter(item => {
            let matches = true;
            for (const fKey in currentFilters) {
                if (fKey === 'shopping') continue; 
                const filterValue = currentFilters[fKey];
                if (Array.isArray(filterValue)) {
                    if (filterValue.length > 0 && !filterValue.includes(item[fKey])) matches = false;
                } else {
                    if (filterValue && item[fKey] && String(item[fKey]) !== String(filterValue)) matches = false;
                }
            }
            return matches;
        });

        const availableShops = [...new Set(dataForShopFilter.map(d => d.shopping))].filter(x => x && x !== 'N/A').sort();

        // Separa: "LOJA DE RUA" = item individual, qualquer outro = agrupado sob "Shoppings"
        const lojaDeRua = availableShops.filter(shop => shop.toUpperCase().includes('LOJA DE RUA'));
        const shoppings = availableShops.filter(shop => !shop.toUpperCase().includes('LOJA DE RUA'));

        let activeShops = currentFilters['shopping'] || [];
        if (!Array.isArray(activeShops)) activeShops = [activeShops];

        labelShop.innerText = activeShops.length === 0 ? "TODOS" : `${activeShops.length} SELECIONADO(S)`;

        // Preserva estado de expand/collapse
        const openShopFolders = Array.from(panelShop.querySelectorAll('.folder-content:not(.hidden)')).map(el => el.id);

        let htmlPanel = `<div class="mb-3 border-b border-white/10 pb-3 flex justify-end items-center">
            <button id="btn-clear-shops" class="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors">LIMPAR</button>
        </div>`;

        // Loja de Rua (item individual, sem hierarquia)
        if (lojaDeRua.length > 0) {
            lojaDeRua.forEach(shop => {
                const isChecked = activeShops.includes(shop) ? 'checked' : '';
                htmlPanel += `
                <div class="flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors mb-1">
                    <input type="checkbox" value="${shop}" class="cb-shop accent-[#8b5cf6] w-4 h-4 cursor-pointer" ${isChecked}>
                    <span class="text-sm font-bold text-white/90 cursor-pointer" onclick="this.previousElementSibling.click()">🏬 ${shop.toUpperCase()}</span>
                </div>`;
            });
        }

        // Shoppings (hierárquico: pai "SHOPPINGS" com filhos expansíveis)
        if (shoppings.length > 0) {
            const idShopFolder = 'f-shop-group';
            htmlPanel += `<div class="mb-2 mt-1">
                <div class="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/5 transition-colors">
                    <input type="checkbox" class="cb-shop-parent accent-[#685BC7] w-4 h-4 cursor-pointer">
                    <div class="folder-toggle flex-1 flex justify-between items-center cursor-pointer font-black text-sm" data-target="${idShopFolder}">
                        🏢 SHOPPINGS <span class="arrow text-[10px] transition-transform duration-200 ${openShopFolders.includes(idShopFolder) ? 'rotate-180' : ''}">▼</span>
                    </div>
                </div>
                <div id="${idShopFolder}" class="folder-content ${openShopFolders.includes(idShopFolder) ? '' : 'hidden'} pl-4 border-l border-white/10 mt-1">`;

            shoppings.forEach(shop => {
                const isChecked = activeShops.includes(shop) ? 'checked' : '';
                htmlPanel += `
                <div class="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/10 transition-colors">
                    <input type="checkbox" value="${shop}" class="cb-shop accent-[#8b5cf6] w-3.5 h-3.5 cursor-pointer" ${isChecked}>
                    <span class="text-xs text-white/80 cursor-pointer" onclick="this.previousElementSibling.click()">${shop.toUpperCase()}</span>
                </div>`;
            });

            htmlPanel += `</div></div>`;
        }

        panelShop.innerHTML = htmlPanel;

        // --- Sincroniza checkbox pai "Shoppings" ---
        function syncShopParent() {
            const cbParent = panelShop.querySelector('.cb-shop-parent');
            if (!cbParent) return;
            const folder = document.getElementById('f-shop-group');
            if (!folder) return;
            const children = Array.from(folder.querySelectorAll('.cb-shop'));
            const checkedCount = children.filter(c => c.checked).length;
            if (checkedCount === 0) { cbParent.checked = false; cbParent.indeterminate = false; }
            else if (checkedCount === children.length) { cbParent.checked = true; cbParent.indeterminate = false; }
            else { cbParent.checked = false; cbParent.indeterminate = true; }
        }
        syncShopParent();

        // Expand/collapse
        panelShop.querySelectorAll('.folder-toggle').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = el.getAttribute('data-target');
                const content = document.getElementById(targetId);
                const arrow = el.querySelector('.arrow');
                content.classList.toggle('hidden');
                arrow.classList.toggle('rotate-180');
            });
        });

        // Pai seleciona/deseleciona todos os filhos
        const cbShopParent = panelShop.querySelector('.cb-shop-parent');
        if (cbShopParent) {
            cbShopParent.addEventListener('change', (e) => {
                const folder = document.getElementById('f-shop-group');
                if (folder) folder.querySelectorAll('.cb-shop').forEach(cb => cb.checked = e.target.checked);
                syncShopParent();
                const selected = Array.from(panelShop.querySelectorAll('.cb-shop:checked')).map(cb => cb.value);
                appData.setFilter('shopping', selected);
            });
        }

        // Filhos atualizam pai
        panelShop.querySelectorAll('.cb-shop').forEach(cb => {
            cb.addEventListener('change', () => {
                syncShopParent();
                const selected = Array.from(panelShop.querySelectorAll('.cb-shop:checked')).map(cb => cb.value);
                appData.setFilter('shopping', selected);
            });
        });

        // Botão limpar
        const btnClearShops = document.getElementById('btn-clear-shops');
        if (btnClearShops) {
            btnClearShops.addEventListener('click', () => {
                panelShop.querySelectorAll('.cb-shop').forEach(cb => cb.checked = false);
                syncShopParent();
                appData.setFilter('shopping', []);
            });
        }
    }

    // --- 4. ATUALIZA O FILTRO DE PDV HIERÁRQUICO (REDE -> PDV) ---
    const panelPdv = document.getElementById('pdv-slicer-panel');
    const labelPdv = document.getElementById('pdv-slicer-label');
    
    if (panelPdv && labelPdv) {
        const openFolders = Array.from(panelPdv.querySelectorAll('.folder-content:not(.hidden)')).map(el => el.id);
        
        let dataForPdvFilter = raw.filter(item => {
            let matches = true;
            for (const fKey in currentFilters) {
                if (fKey === 'store_name') continue; 
                const filterValue = currentFilters[fKey];
                if (Array.isArray(filterValue)) {
                    if (filterValue.length > 0 && !filterValue.includes(item[fKey])) matches = false;
                } else {
                    if (filterValue && item[fKey] && String(item[fKey]) !== String(filterValue)) matches = false;
                }
            }
            return matches;
        });

        // Agrupa PDVs por rede
        const pdvsByRede = {};
        dataForPdvFilter.forEach(item => {
            const rede = item.rede;
            const pdv = item.store_name;
            if (rede && pdv && rede !== 'N/A' && pdv !== 'N/A') {
                if (!pdvsByRede[rede]) pdvsByRede[rede] = new Set();
                pdvsByRede[rede].add(pdv);
            }
        });

        // Converte Sets para arrays e ordena
        Object.keys(pdvsByRede).forEach(rede => {
            pdvsByRede[rede] = Array.from(pdvsByRede[rede]).sort();
        });

        let activePdvs = currentFilters['store_name'] || [];
        if (!Array.isArray(activePdvs)) activePdvs = [activePdvs];

        labelPdv.innerText = activePdvs.length === 0 ? "TODOS" : `${activePdvs.length} PDV(S) SELECIONADO(S)`;

        // Preserva estado de expand/collapse
        const openPdvFolders = Array.from(panelPdv.querySelectorAll('.folder-content:not(.hidden)')).map(el => el.id);

        let htmlPanel = `<div class="mb-3 border-b border-white/10 pb-3 flex justify-end items-center">
            <button id="btn-clear-pdvs" class="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors">LIMPAR</button>
        </div>`;

        Object.keys(pdvsByRede).sort().forEach(rede => {
            const idRedeFolder = `f-rede-${rede.replace(/\s+/g, '_')}`;
            const redeChildren = pdvsByRede[rede];
            
            htmlPanel += `<div class="mb-2">
                <div class="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/5 transition-colors">
                    <input type="checkbox" class="cb-rede-parent accent-[#685BC7] w-4 h-4 cursor-pointer" data-rede="${rede}">
                    <div class="folder-toggle flex-1 flex items-center cursor-pointer" data-target="${idRedeFolder}">
                        <span class="flex-1">${rede.toUpperCase()}</span>
                        <span class="text-[10px] text-white/40 tabular-nums text-right min-w-[28px] mr-2">${redeChildren.length}</span>
                        <span class="arrow text-[10px] transition-transform duration-200 ${openPdvFolders.includes(idRedeFolder) ? 'rotate-180' : ''}">▼</span>
                    </div>
                </div>
                <div id="${idRedeFolder}" class="folder-content ${openPdvFolders.includes(idRedeFolder) ? '' : 'hidden'} pl-4 border-l border-white/10 mt-1">`;

            redeChildren.forEach(pdv => {
                const isChecked = activePdvs.includes(pdv) ? 'checked' : '';
                // Extrai nome curto do PDV (antes do " - SPC")
                const shortName = pdv.split(' - SPC')[0] || pdv;
                htmlPanel += `
                <div class="flex items-center gap-2 p-1 rounded-md hover:bg-white/10 transition-colors">
                    <input type="checkbox" value="${pdv}" class="cb-pdv accent-[#8b5cf6] w-3 h-3 cursor-pointer" data-rede="${rede}" ${isChecked}>
                    <span class="text-[11px] text-white/80 cursor-pointer" onclick="this.previousElementSibling.click()" title="${pdv.toUpperCase()}">${shortName.toUpperCase()}</span>
                </div>`;
            });

            htmlPanel += `</div></div>`;
        });

        panelPdv.innerHTML = htmlPanel;

        // --- Sincroniza checkboxes pai (Rede) ---
        function syncPdvParents() {
            panelPdv.querySelectorAll('.cb-rede-parent').forEach(cbParent => {
                const rede = cbParent.getAttribute('data-rede');
                const children = Array.from(panelPdv.querySelectorAll(`.cb-pdv[data-rede="${rede}"]`));
                const checkedCount = children.filter(c => c.checked).length;
                if (checkedCount === 0) { cbParent.checked = false; cbParent.indeterminate = false; }
                else if (checkedCount === children.length) { cbParent.checked = true; cbParent.indeterminate = false; }
                else { cbParent.checked = false; cbParent.indeterminate = true; }
            });
        }
        syncPdvParents();

        // Expand/collapse
        panelPdv.querySelectorAll('.folder-toggle').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = el.getAttribute('data-target');
                const content = document.getElementById(targetId);
                const arrow = el.querySelector('.arrow');
                content.classList.toggle('hidden');
                arrow.classList.toggle('rotate-180');
            });
        });

        // Pai seleciona/deseleciona todos os filhos da rede
        panelPdv.querySelectorAll('.cb-rede-parent').forEach(cbParent => {
            cbParent.addEventListener('change', (e) => {
                const rede = e.target.getAttribute('data-rede');
                panelPdv.querySelectorAll(`.cb-pdv[data-rede="${rede}"]`).forEach(cb => cb.checked = e.target.checked);
                syncPdvParents();
                const selected = Array.from(panelPdv.querySelectorAll('.cb-pdv:checked')).map(cb => cb.value);
                appData.setFilter('store_name', selected);
            });
        });

        // Filhos atualizam pai
        panelPdv.querySelectorAll('.cb-pdv').forEach(cb => {
            cb.addEventListener('change', () => {
                syncPdvParents();
                const selected = Array.from(panelPdv.querySelectorAll('.cb-pdv:checked')).map(cb => cb.value);
                appData.setFilter('store_name', selected);
            });
        });

        // Botão limpar
        const btnClearPdvs = document.getElementById('btn-clear-pdvs');
        if (btnClearPdvs) {
            btnClearPdvs.addEventListener('click', () => {
                panelPdv.querySelectorAll('.cb-pdv').forEach(cb => cb.checked = false);
                syncPdvParents();
                appData.setFilter('store_name', []);
            });
        }
    }

    // --- 5-8. ATUALIZA OS FILTROS SIMPLES (LINHA, REGIONAL, 80/20, VISIBILIDADE) ---
    const simpleFilters = [
        { id: 'linha', field: 'linha_de_produto', title: 'LINHA DE PRODUTO' },
        { id: 'regional', field: 'regional', title: 'REGIONAL' },
        { id: 'p8020', field: 'p8020', title: '80/20' },
        { id: 'vis', field: 'visibilidade', title: 'VISIBILIDADE' }
    ];

    simpleFilters.forEach(filter => {
        const panel = document.getElementById(`${filter.id}-slicer-panel`);
        const label = document.getElementById(`${filter.id}-slicer-label`);
        
        if (panel && label) {
            let dataForFilter = raw.filter(item => {
                let matches = true;
                for (const fKey in currentFilters) {
                    if (fKey === filter.field) continue; 
                    const filterValue = currentFilters[fKey];
                    if (Array.isArray(filterValue)) {
                        if (filterValue.length > 0 && !filterValue.includes(item[fKey])) matches = false;
                    } else {
                        if (filterValue && item[fKey] && String(item[fKey]) !== String(filterValue)) matches = false;
                    }
                }
                return matches;
            });

            const availableValues = [...new Set(dataForFilter.map(d => d[filter.field]))].filter(x => x && x !== 'N/A').sort();
            
            let activeValues = currentFilters[filter.field] || [];
            if (!Array.isArray(activeValues)) activeValues = [activeValues];

            label.innerText = activeValues.length === 0 ? "TODOS" : `${activeValues.length} SELECIONADO(S)`;

            let htmlPanel = `<div class="mb-3 border-b border-white/10 pb-3 flex justify-end items-center">
                <button id="btn-clear-${filter.id}" class="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40 transition-colors">LIMPAR</button>
            </div>`;

            availableValues.forEach(value => {
                const isChecked = activeValues.includes(value) ? 'checked' : '';
                htmlPanel += `
                <div class="flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors">
                    <input type="checkbox" value="${value}" class="cb-${filter.id} accent-[#8b5cf6] w-4 h-4 cursor-pointer" ${isChecked}>
                    <span class="text-sm text-white/90 cursor-pointer" onclick="this.previousElementSibling.click()">${value.toUpperCase()}</span>
                </div>`;
            });

            panel.innerHTML = htmlPanel;

            // Event listeners
            panel.querySelectorAll(`.cb-${filter.id}`).forEach(cb => {
                cb.addEventListener('change', () => {
                    const selected = Array.from(panel.querySelectorAll(`.cb-${filter.id}:checked`)).map(cb => cb.value);
                    appData.setFilter(filter.field, selected);
                });
            });

            // Botão limpar
            const btnClear = document.getElementById(`btn-clear-${filter.id}`);
            if (btnClear) {
                btnClear.addEventListener('click', () => {
                    panel.querySelectorAll(`.cb-${filter.id}`).forEach(cb => cb.checked = false);
                    appData.setFilter(filter.field, []);
                });
            }
        }
    });
}

// ── PWA: Registro do Service Worker ──────────────────────────────────────────
// REMOVIDO: Registro agora é feito no index.html com detecção de localhost
// Ver index.html para o código de registro do Service Worker
