// js/view-welcome.js
// Tela de boas-vindas — exibida apenas na primeira sessão do usuário.
// Sequência: login fade → tela preta → "Olá" → fade-in fundo → card drop

import { supabase } from './services/supabaseClient.js';

// ─── Dados dos slides ────────────────────────────────────────────────────────

const SLIDES = [
    {
        type: 'editorial',
        title: 'O comportamento do shopper brasileiro, em suas mãos.',
        paragraphs: [
            'O ProSolution APP nasceu de uma paixão inegociável pela precisão. Entendemos que, no mercado de tecnologia, um dado impreciso não é apenas um erro, é um risco estratégico.',
            'Com isso, consolidamos nossa filosofia: transformar o caos do PDV em uma narrativa clara e acionável. Construímos mais que um dashboard, entregamos uma fortaleza tática, para que cada decisão da diretoria seja baseada na verdade absoluta do campo.',
        ],
    },
    {
        type: 'features',
        title: 'Recursos do ProSolution APP',
        features: [
            {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>`,
                name: 'Matriz de Positivação',
                desc: 'Visibilidade cirúrgica da cobertura de campo. Saiba exatamente onde sua operação está e onde ela precisa chegar.',
            },
            {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>`,
                name: 'Heatmaps de Engajamento',
                desc: 'DNA de retenção e fluxo de horário processados com nova arquitetura de banco de dados para leitura instantânea.',
            },
            {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>`,
                name: 'Performance Operacional',
                desc: 'Mapeamento que transforma a complexidade do PDV em decisões táticas imediatas.',
            },
            {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>`,
                name: 'Motor PROTIX',
                desc: 'Projetado para sustentar o volume massivo da operação nacional, transformando complexidade técnica em resposta imediata.',
            },
        ],
    },
    {
        type: 'closing',
        title: 'Obrigado por construir o futuro conosco.',
        paragraphs: [
            'Esta versão 1.0 é apenas o marco inicial de uma longa jornada de inovação entre a ProSolution Marketing e a Motorola. Estamos refinando cada detalhe para garantir a melhor ferramenta analítica da América Latina.',
            'Tenha um excelente trabalho.',
        ],
    },
];

// ─── Estado interno ──────────────────────────────────────────────────────────

let currentSlide = 0;
let onCompleteCallback = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

function getContainer() {
    return document.getElementById('welcome-screen');
}

function renderDots() {
    return SLIDES.map((_, i) => `
        <button class="welcome-dot ${i === currentSlide ? 'active' : ''}"
            data-index="${i}" aria-label="Slide ${i + 1}"></button>
    `).join('');
}

function renderSlideBody(slide) {
    if (slide.type === 'features') {
        return `<div class="welcome-features-grid">
            ${slide.features.map(f => `
                <div class="welcome-feature-card">
                    <div class="welcome-feature-icon">${f.icon}</div>
                    <div class="welcome-feature-text">
                        <strong>${f.name}</strong>
                        <span>${f.desc}</span>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }
    return slide.paragraphs.map(p => `<p class="welcome-desc">${p}</p>`).join('');
}

function renderSlide(index) {
    const slide = SLIDES[index];
    const isLast = index === SLIDES.length - 1;
    return `
        <div class="welcome-slide" id="welcome-slide-content">
            <h2 class="welcome-title">${slide.title}</h2>
            <div class="welcome-body">${renderSlideBody(slide)}</div>
        </div>
        <div class="welcome-footer">
            <div class="welcome-dots">${renderDots()}</div>
            <div class="welcome-actions">
                <button id="welcome-btn-skip" class="welcome-btn-skip">Pular</button>
                <button id="welcome-btn-next" class="welcome-btn-next">
                    ${isLast ? 'Entrar na Dashboard' : 'Próximo'}
                    ${isLast
                        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:15px;height:15px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>`
                        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:15px;height:15px;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>`
                    }
                </button>
            </div>
        </div>
    `;
}

// ─── Transição entre slides ───────────────────────────────────────────────────

function goToSlide(index, direction = 'next') {
    const container = getContainer();
    const slideEl = container.querySelector('#welcome-slide-content');

    if (slideEl) {
        slideEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        slideEl.style.opacity = '0';
        slideEl.style.transform = direction === 'next' ? 'translateX(-28px)' : 'translateX(28px)';
    }

    setTimeout(() => {
        currentSlide = index;
        const inner = container.querySelector('.welcome-inner');
        if (!inner) return;
        inner.innerHTML = renderSlide(currentSlide);
        bindSlideEvents();

        const newSlide = inner.querySelector('#welcome-slide-content');
        if (newSlide) {
            newSlide.style.opacity = '0';
            newSlide.style.transform = direction === 'next' ? 'translateX(28px)' : 'translateX(-28px)';
            requestAnimationFrame(() => {
                newSlide.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                newSlide.style.opacity = '1';
                newSlide.style.transform = 'translateX(0)';
            });
        }
    }, 200);
}

// ─── Bind de eventos ─────────────────────────────────────────────────────────

function bindSlideEvents() {
    const container = getContainer();

    container.querySelector('#welcome-btn-next')?.addEventListener('click', () => {
        currentSlide < SLIDES.length - 1 ? goToSlide(currentSlide + 1, 'next') : completeWelcome();
    });

    container.querySelector('#welcome-btn-skip')?.addEventListener('click', () => completeWelcome());

    container.querySelectorAll('.welcome-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.dataset.index, 10);
            if (idx !== currentSlide) goToSlide(idx, idx > currentSlide ? 'next' : 'prev');
        });
    });

    let touchStartX = 0;
    const slideEl = container.querySelector('#welcome-slide-content');
    if (slideEl) {
        slideEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        slideEl.addEventListener('touchend', e => {
            const diff = touchStartX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentSlide < SLIDES.length - 1) goToSlide(currentSlide + 1, 'next');
                else if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1, 'prev');
            }
        }, { passive: true });
    }
}

// ─── Marca como visto e fecha ─────────────────────────────────────────────────

async function completeWelcome() {
    const container = getContainer();
    container.style.transition = 'opacity 0.5s ease';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
            await supabase
                .from('user_profiles')
                .update({ has_seen_welcome: true })
                .eq('id', session.user.id);
        }
    } catch (err) {
        console.warn('view-welcome: não foi possível salvar has_seen_welcome:', err);
    }

    setTimeout(() => {
        container.style.display = 'none';
        if (typeof onCompleteCallback === 'function') onCompleteCallback();
    }, 500);
}

// ─── Sequência de intro animada ───────────────────────────────────────────────

async function playIntroSequence(container) {
    // 1. Tela preta cobre tudo (já está por cima via z-index)
    container.style.background = '#000';
    container.style.display = 'flex';
    container.style.opacity = '0';
    container.style.pointerEvents = 'auto';

    // Fade in para o preto
    await delay(20);
    container.style.transition = 'opacity 0.55s ease';
    container.style.opacity = '1';
    await delay(600);

    // 2. "Olá" aparece no centro
    const helloEl = document.createElement('div');
    helloEl.className = 'welcome-hello';
    helloEl.textContent = 'Olá';
    container.appendChild(helloEl);

    await delay(80);
    helloEl.style.opacity = '1';
    helloEl.style.transform = 'translateY(0)';
    await delay(1100);

    // 3. "Olá" some
    helloEl.style.opacity = '0';
    helloEl.style.transform = 'translateY(-12px)';
    await delay(500);
    helloEl.remove();

    // 4. Fundo muda de preto para o gradiente roxo/cinza
    container.style.transition = 'background 1.1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
    container.style.background = '';  // volta ao CSS padrão (gradiente)
    await delay(900);

    // 5. Card surge com drop scale + fade (de dentro pra fora)
    const card = container.querySelector('.welcome-card');
    if (card) {
        card.style.opacity = '1';
        card.style.transform = 'scale(1) translateY(0)';
    }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Exibe a tela de boas-vindas com a sequência de intro.
 * @param {Function} onComplete - Callback chamado quando o usuário conclui ou pula
 */
export function showWelcome(onComplete) {
    currentSlide = 0;
    onCompleteCallback = onComplete;

    const container = getContainer();
    if (!container) {
        console.error('view-welcome: #welcome-screen não encontrado no DOM');
        if (typeof onComplete === 'function') onComplete();
        return;
    }

    // Monta o HTML — card começa invisível para o drop
    container.innerHTML = `
        <div class="welcome-bg-glow" aria-hidden="true"></div>
        <div class="welcome-card" style="opacity:0; transform:scale(0.88) translateY(20px); transition: opacity 0.6s cubic-bezier(0.34,1.56,0.64,1), transform 0.6s cubic-bezier(0.34,1.56,0.64,1);">
            <div class="welcome-logo">
                <img src="images/login-white.png" alt="ProSolution Logo">
            </div>
            <div class="welcome-inner">
                ${renderSlide(currentSlide)}
            </div>
        </div>
    `;

    bindSlideEvents();
    playIntroSequence(container);
}
