// js/services/dataManager.js
import { createFreshClient } from './supabaseClient.js';

class DataManager {
    constructor() {
        this.rawData = [];
        this.currentFilters = {};
        this.listeners = [];

        // Listener de reativação de aba
        // Quando o Chrome "acorda" a aba, aguarda 1s e dispara nova busca.
        // O cliente Supabase será recriado do zero nessa chamada (createFreshClient),
        // eliminando qualquer estado corrompido da hibernação.
        let reactivationTimer = null;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                clearTimeout(reactivationTimer);
                reactivationTimer = setTimeout(() => {
                    console.log('👁️ Aba reativada. Recriando conexão com o banco...');
                    this.notify();
                }, 1000);
            }
        });
    }

    /**
     * Busca os dados consolidados no Supabase para o Heatmap Operacional.
     * Aceita p_aparelho como filtro interno da view (select de modelo).
     */
    async fetchHeatmapRPC(p_aparelho = null) {
        const params = {
            p_shopping:     this.currentFilters['shopping']          || null,
            p_rede:         this.currentFilters['rede']              || null,
            p_store_name:   this.currentFilters['store_name']        || null,
            p_linha:        this.currentFilters['linha_de_produto']  || null,
            p_regional:     this.currentFilters['regional']          || null,
            p_p8020:        this.currentFilters['p8020']             || null,
            p_visibilidade: this.currentFilters['visibilidade']      || null,
            p_dates: (this.currentFilters['pure_date'] && this.currentFilters['pure_date'].length > 0)
                     ? this.currentFilters['pure_date']
                     : null,
            p_aparelho: p_aparelho || null
        };

        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                console.log(`⏳ Aguardando ${espera / 1000}s antes da tentativa ${numTentativa} (Heatmap)...`);
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            console.log(`⏳ Heatmap: buscando dados... (Tentativa ${numTentativa}/${tentativas.length})`);

            try {
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_heatmap_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                console.log(`✅ Heatmap: dados recebidos (tentativa ${numTentativa}).`);
                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
                    console.warn(`⏱️ Timeout na tentativa ${numTentativa} (Heatmap).`);
                    if (numTentativa === tentativas.length) {
                        console.error("🚨 Heatmap: falha crítica após todas as tentativas.");
                        return null;
                    }
                } else {
                    console.error("🚨 Heatmap: erro inesperado:", err);
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Busca os dados consolidados no Supabase para a Positivação.
     * Mesma estratégia do fetchOverviewRPC: cliente fresco + 2 tentativas.
     */
    async fetchPositivacaoRPC() {
        const params = {
            p_shopping:     this.currentFilters['shopping']          || null,
            p_rede:         this.currentFilters['rede']              || null,
            p_store_name:   this.currentFilters['store_name']        || null,
            p_linha:        this.currentFilters['linha_de_produto']  || null,
            p_regional:     this.currentFilters['regional']          || null,
            p_p8020:        this.currentFilters['p8020']             || null,
            p_visibilidade: this.currentFilters['visibilidade']      || null,
            p_dates: (this.currentFilters['pure_date'] && this.currentFilters['pure_date'].length > 0)
                     ? this.currentFilters['pure_date']
                     : null
        };

        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                console.log(`⏳ Aguardando ${espera / 1000}s antes da tentativa ${numTentativa} (Positivação)...`);
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            console.log(`⏳ Positivação: buscando dados... (Tentativa ${numTentativa}/${tentativas.length})`);

            try {
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_positivacao_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                console.log(`✅ Positivação: dados recebidos (tentativa ${numTentativa}).`);
                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
                    console.warn(`⏱️ Timeout na tentativa ${numTentativa} (Positivação).`);
                    if (numTentativa === tentativas.length) {
                        console.error("🚨 Positivação: falha crítica após todas as tentativas.");
                        return null;
                    }
                } else {
                    console.error("🚨 Positivação: erro inesperado:", err);
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Busca os dados consolidados no Supabase para a Visão Geral.
     * Cria um cliente Supabase NOVO a cada chamada para evitar estado corrompido
     * após hibernação do Chrome. Possui 2 tentativas com espera entre elas.
     */
    async fetchOverviewRPC() {
        const params = {
            p_shopping:     this.currentFilters['shopping']          || null,
            p_rede:         this.currentFilters['rede']              || null,
            p_store_name:   this.currentFilters['store_name']        || null,
            p_linha:        this.currentFilters['linha_de_produto']  || null,
            p_regional:     this.currentFilters['regional']          || null,
            p_p8020:        this.currentFilters['p8020']             || null,
            p_visibilidade: this.currentFilters['visibilidade']      || null,
            p_dates: (this.currentFilters['pure_date'] && this.currentFilters['pure_date'].length > 0)
                     ? this.currentFilters['pure_date']
                     : null
        };

        // Tenta 2 vezes: primeira imediata, segunda após 3s
        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                console.log(`⏳ Aguardando ${espera / 1000}s antes da tentativa ${numTentativa}...`);
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            console.log(`⏳ Buscando dados... (Tentativa ${numTentativa}/${tentativas.length})`);

            try {
                // PONTO CRÍTICO: cliente novo e limpo a cada tentativa
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_overview_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                console.log(`✅ Dados recebidos com sucesso (tentativa ${numTentativa}).`);
                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
                    console.warn(`⏱️ Timeout na tentativa ${numTentativa}.`);
                    if (numTentativa === tentativas.length) {
                        console.error("🚨 Falha Crítica: Conexão não restaurada após todas as tentativas.");
                        return null;
                    }
                } else {
                    console.error("🚨 Erro inesperado:", err);
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Busca os dados consolidados no Supabase para a view Performance.
     * Mesma estratégia: cliente fresco + 2 tentativas.
     */
    async fetchPerformanceRPC() {
        const params = {
            p_shopping:     this.currentFilters['shopping']          || null,
            p_rede:         this.currentFilters['rede']              || null,
            p_store_name:   this.currentFilters['store_name']        || null,
            p_linha:        this.currentFilters['linha_de_produto']  || null,
            p_regional:     this.currentFilters['regional']          || null,
            p_p8020:        this.currentFilters['p8020']             || null,
            p_visibilidade: this.currentFilters['visibilidade']      || null,
            p_dates: (this.currentFilters['pure_date'] && this.currentFilters['pure_date'].length > 0)
                     ? this.currentFilters['pure_date']
                     : null
        };

        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                console.log(`⏳ Aguardando ${espera / 1000}s antes da tentativa ${numTentativa} (Performance)...`);
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            console.log(`⏳ Performance: buscando dados... (Tentativa ${numTentativa}/${tentativas.length})`);

            try {
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_performance_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                console.log(`✅ Performance: dados recebidos (tentativa ${numTentativa}).`);
                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
                    console.warn(`⏱️ Timeout na tentativa ${numTentativa} (Performance).`);
                    if (numTentativa === tentativas.length) {
                        console.error("🚨 Performance: falha crítica após todas as tentativas.");
                        return null;
                    }
                } else {
                    console.error("🚨 Performance: erro inesperado:", err);
                    return null;
                }
            }
        }

        return null;
    }

    setRawData(data) {
        if (!data || !Array.isArray(data)) {
            console.error("DataManager: Dados inválidos recebidos.");
            return;
        }

        this.rawData = data.map(row => {
            let numSessions = 0;
            if (typeof row.sessions === 'number') {
                numSessions = row.sessions;
            } else if (row.sessions) {
                numSessions = parseFloat(row.sessions.toString().replace(/\./g, '').replace(',', '.')) || 0;
            }
            return { ...row, sessions: numSessions };
        });

        console.log(`DataManager: ${this.rawData.length} linhas carregadas na memória.`);
        this.notify();
    }

    setFilter(key, value) {
        if (!value || value === "" || value === "TODOS" || (Array.isArray(value) && value.length === 0)) {
            delete this.currentFilters[key];
        } else {
            this.currentFilters[key] = value;
        }
        this.notify();
    }

    clearAllFilters() {
        this.currentFilters = {};
        this.notify();
    }

    getFilteredData() {
        if (Object.keys(this.currentFilters).length === 0) {
            return this.rawData;
        }

        return this.rawData.filter(row => {
            for (const key in this.currentFilters) {
                const filterVal = this.currentFilters[key];
                if (Array.isArray(filterVal)) {
                    if (!filterVal.includes(row[key])) return false;
                } else {
                    if (String(row[key]) !== String(filterVal)) return false;
                }
            }
            return true;
        });
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notify() {
        const filteredData = this.getFilteredData();
        this.listeners.forEach(callback => callback(filteredData));
    }
}

export const appData = new DataManager();