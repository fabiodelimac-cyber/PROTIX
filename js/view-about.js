// js/view-about.js

export function getAboutHTML() {
    return `
    <div id="about-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 opacity-0">
        <div class="bg-white dark:bg-[#1c1e22] border border-gray-200 dark:border-[#2d3139] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transform scale-95 transition-transform duration-300">
            
            <div class="p-8 border-b border-gray-100 dark:border-[#2d3139] flex justify-between items-center bg-gray-50 dark:bg-[#131417]">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-[#685BC7]/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#685BC7" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="font-['Archivo',_sans-serif] text-xl font-bold uppercase tracking-wider" style="color:var(--text-main);">Sobre o Sistema</h2>
                        <p class="ds-login-product text-[20px]" style="margin-top: 4px;">APP</p>
                    </div>
                </div>
            </div>

            <div class="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-6">
                
                <img src="images/pros_white.png" alt="ProSolution Logo" class="h-8 mx-auto mb-8 object-contain opacity-90 dark:opacity-100 invert dark:invert-0">

                <div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-blue-900 dark:text-blue-100" style="font-stretch: 100%;">
                        <span class="font-bold">Telemetria:</span> O APP monitora tempo de sessão e uso de CPU/GPU para otimizar performance e estabilidade do sistema. Esses dados são associados ao seu e-mail de acesso.
                    </p>
                </div>

                <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-gray-700 dark:text-gray-300" style="font-stretch: 100%;">
                    APP é um aplicativo corporativo desenvolvido pela ProSolution Marketing para a Motorola Mobility do Brasil. Projetado para apoiar decisões táticas, monitoramento de atividades e visualização de indicadores estratégicos.
                </p>
                <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-gray-700 dark:text-gray-300" style="font-stretch: 100%;">
                    Desenvolvido com tecnologias modernas e componentes open source, em conformidade com suas respectivas licenças.
                </p>
                <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-gray-700 dark:text-gray-300" style="font-stretch: 100%;">
                    Propriedade intelectual protegida. Uso, reprodução ou distribuição sem autorização é proibido.
                </p>
                
                <div class="pt-4">
                    <p class="font-['Archivo',_sans-serif] text-sm font-bold text-[#685BC7] uppercase tracking-wide text-center" style="font-stretch: 110%;">
                        Desenvolvido com carinho pelo time de Business Intelligence
                    </p>
                    <p class="font-['Archivo',_sans-serif] mt-3 text-center text-[10px] font-thin tracking-[0.2em] uppercase" style="color:var(--text-muted-strong);">
                        Versão BETA 0.96 Build 20260505 RC6
                    </p>
                </div>
            </div>

            <div class="p-6 border-t border-gray-100 dark:border-[#2d3139] bg-gray-50 dark:bg-[#131417] flex justify-end">
                <button id="btn-close-about" class="font-['Archivo',_sans-serif] px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors shadow-sm" style="background:var(--ps-blue); color:#e4e4e4;">
                    Fechar Detalhes
                </button>
            </div>
            </div>
    </div>
    `;
}

export function initAbout() {
    const overlay = document.getElementById('about-overlay');
    const modal = overlay.querySelector('div');
    const btnClose = document.getElementById('btn-close-about');

    let isClosing = false; // Flag para evitar múltiplos fechamentos

    // Animação de Entrada
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('scale-95');
    });

    const closeAbout = () => {
        if (isClosing) return;
        
        isClosing = true;
        
        // Bloqueia cliques imediatamente para não interceptar nada
        overlay.style.pointerEvents = 'none';
        
        // Desabilita o botão de fechar visualmente
        if (btnClose) {
            btnClose.disabled = true;
            btnClose.style.opacity = '0.5';
        }
        
        overlay.classList.add('opacity-0');
        modal.classList.remove('scale-100');
        modal.classList.add('scale-95');
        
        // Restaura o foco e retira o blur do Dashboard
        const shell = document.getElementById('dash-shell');
        if(shell) {
            shell.style.transition = 'opacity 0.6s ease, filter 0.6s ease';
            shell.style.filter = 'none';
            shell.style.opacity = '1';
        }

        // Aguarda a animação para remover do DOM
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    };

    btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAbout();
    });
    
    // Fecha ao clicar fora do modal
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeAbout();
        }
    });
    
    // Fecha com Escape
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeAbout();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}