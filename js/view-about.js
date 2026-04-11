// js/view-about.js

export function getAboutHTML() {
    return `
    <div id="about-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 opacity-0">
        <div class="bg-white dark:bg-[#1c1e22] border border-gray-200 dark:border-[#2d3139] rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transform scale-95 transition-transform duration-300">
            
            <div class="p-8 border-b border-gray-100 dark:border-[#2d3139] flex justify-between items-center bg-gray-50 dark:bg-[#131417]">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-[#685BC7]/10 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#685BC7" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="font-['Archivo',_sans-serif] text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Sobre o Sistema</h2>
                        <p class="font-['Archivo',_sans-serif] text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Field Engagement Tracker</p>
                    </div>
                </div>
            </div>

            <div class="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-6">
                
                <img src="pros_white.png" alt="ProSolution Logo" class="h-8 mx-auto mb-8 object-contain opacity-90 dark:opacity-100 invert dark:invert-0">

                <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-gray-700 dark:text-gray-300" style="font-stretch: 100%;">
                    FIELD ENGAGEMENT TRACKER é um aplicativo corporativo desenvolvido pela ProSolution Marketing para uso exclusivo da Motorola Mobility do Brasil. A solução foi projetada para apoiar decisões táticas, monitoramento de atividades e visualização de indicadores estratégicos, garantindo eficiência operacional, rastreabilidade e acesso confiável às informações necessárias para a tomada de decisão.
                </p>
                <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-gray-700 dark:text-gray-300" style="font-stretch: 100%;">
                    Todo o código-fonte proprietário, arquitetura, lógica de negócio, integrações e elementos visuais exclusivos deste aplicativo constituem propriedade intelectual da ProSolution Marketing, sendo protegidos pelas legislações aplicáveis de direitos autorais e propriedade intelectual. O uso, reprodução, modificação ou distribuição deste software, total ou parcial, sem autorização formal da ProSolution Marketing, é estritamente proibido.
                </p>
                <p class="font-['Archivo',_sans-serif] text-sm leading-relaxed text-gray-700 dark:text-gray-300" style="font-stretch: 100%;">
                    Este aplicativo foi desenvolvido utilizando tecnologias modernas e amplamente adotadas no mercado, incluindo JavaScript (ES6) para estruturação da lógica de aplicação, Tailwind CSS para estilização e construção de interfaces responsivas, Chart.js 4 para geração de gráficos e visualizações de dados, e Supabase como plataforma para serviços de backend e persistência de dados. Essas tecnologias incluem componentes distribuídos sob licenças open source, utilizados em conformidade com suas respectivas condições de uso, conforme definido em suas documentações oficiais e termos de licenciamento aplicáveis.
                </p>
                
                <div class="pt-4">
                    <p class="font-['Archivo',_sans-serif] text-sm font-bold text-[#685BC7] uppercase tracking-wide text-center" style="font-stretch: 110%;">
                        Desenvolvido com carinho pelo time de Business Intelligence
                    </p>
                    <p class="font-['Archivo',_sans-serif] mt-3 text-center text-[10px] font-thin tracking-[0.2em] text-gray-500 dark:text-white uppercase">
                        Build 0.4.7.260411351
                    </p>
                </div>
            </div>

            <div class="p-6 border-t border-gray-100 dark:border-[#2d3139] bg-gray-50 dark:bg-[#131417] flex justify-end">
                <button id="btn-close-about" class="font-['Archivo',_sans-serif] px-8 py-3 bg-[#131417] dark:bg-white text-white dark:text-[#131417] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#685BC7] dark:hover:bg-[#685BC7] hover:text-white dark:hover:text-white transition-colors shadow-sm">
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

    // Animação de Entrada
    requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        modal.classList.remove('scale-95');
    });

    const closeAbout = () => {
        overlay.classList.add('opacity-0');
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
            overlay.remove();
        }, 300);
    };

    btnClose.addEventListener('click', closeAbout);
    
    // Fecha ao clicar fora do modal
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeAbout();
    });
}