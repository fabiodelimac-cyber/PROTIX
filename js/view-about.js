// js/view-about.js

export const getAboutHTML = () => {
    return `
        <style>
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-15px); }
            }
            .about-overlay {
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100vw; 
                height: 100vh; 
                z-index: 9999;
                background-color: #131417;
                display: flex !important; 
                flex-direction: column !important; 
                align-items: center !important; 
                justify-content: center !important;
                text-align: center !important;
                animation: fadeIn 0.5s ease-out forwards;
            }
            .logo-about {
                width: 280px; 
                height: auto;
                animation: float 5s ease-in-out infinite;
                filter: drop-shadow(0 0 20px rgba(104, 91, 199, 0.2));
            }
            .tech-grid {
                display: flex; 
                flex-wrap: wrap;
                justify-content: center;
                gap: 12px; 
                margin-top: 20px;
                width: 100%;
                max-w-xl;
            }
            .badge-tech {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.08);
                padding: 8px 16px; 
                border-radius: 100px;
                font-size: 9px; 
                font-weight: 700; 
                color: #777;
                text-transform: uppercase; 
                letter-spacing: 2px;
                white-space: nowrap;
                transition: all 0.3s ease;
            }
            .badge-tech:hover {
                border-color: #685BC7; 
                color: white; 
                background: rgba(104, 91, 199, 0.1);
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        </style>

        <div id="about-screen" class="about-overlay">
            <div class="flex flex-col items-center justify-center w-full max-w-3xl px-6">
                
                <img src="pros_white.png" alt="ProSolution" class="logo-about mb-12 pointer-events-none">
                
                <h1 class="text-xl md:text-2xl font-light tracking-[0.6em] text-white uppercase mb-16 opacity-90">
                    Field Engagement Tracker
                </h1>

                <div class="w-full mb-20 flex flex-col items-center">
                    <p class="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-6">Tecnologias Usadas</p>
                    <div class="tech-grid">
                        <span class="badge-tech">Vanilla JS</span>
                        <span class="badge-tech">Tailwind 3</span>
                        <span class="badge-tech">Chart.js 4</span>
                        <span class="badge-tech">Firebase</span>
                        <span class="badge-tech">PapaParse</span>
                        <span class="badge-tech">ES6 Modules</span>
                    </div>
                </div>

                <div class="flex flex-col items-center w-full">
                    
                    <p class="text-[11px] font-medium text-white leading-relaxed uppercase tracking-[0.2em] opacity-80 mb-2 max-w-lg">
                        Sistema em desenvolvimento, build estável para validação. Erros podem ocorrer.
                    </p>
                    
                    <p class="text-[10px] text-[#685BC7] font-bold uppercase tracking-[0.2em] mb-12">
                        Software fornecido para uso exclusivo de Motorola Mobility do Brasil
                    </p>
                    
                    <button id="btn-about-close" class="relative z-50 px-12 py-4 border border-white/20 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-white hover:bg-white hover:text-black transition-all mb-16 cursor-pointer shadow-lg hover:shadow-white/20">
                        Fechar Detalhes
                    </button>

                    <footer class="flex flex-col items-center text-center">
                        <span class="text-white text-base md:text-lg font-bold uppercase tracking-[0.3em] mb-1">
                            ProSolution Marketing • 2026
                        </span>
                        <span class="text-white/60 text-[10px] uppercase tracking-[0.2em] mb-10">
                            Todos os direitos reservados
                        </span>
                        
                        <span class="text-gray-600 text-[9px] uppercase tracking-widest font-black">
                            Desenvolvido com carinho pelo time de Business Intelligence da ProSolution Marketing!
                        </span>
                    </footer>
                </div>
            </div>
        </div>
    `;
};

export const initAbout = () => {
    const closeBtn = document.getElementById('btn-about-close');
    
    // Usando event listener robusto com prevenção de propagação
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Impede que elementos abaixo roubem o clique
            
            const about = document.getElementById('about-screen');
            const shell = document.getElementById('dash-shell');

            if (about) {
                about.style.transition = 'opacity 0.4s ease';
                about.style.opacity = '0';
                
                // Restaura o dashboard
                if (shell) {
                    shell.style.filter = 'none';
                    shell.style.opacity = '1';
                }

                // Remove do DOM após a animação de fade
                setTimeout(() => { about.remove(); }, 400);
            }
        });
    }
};