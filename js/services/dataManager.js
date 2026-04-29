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
                    this.notify();
                }, 1000);
            }
        });
    }

    /**
     * Normaliza parâmetros de filtro para arrays, mantendo backward compatibility.
     * Converte strings únicas para arrays de um elemento, mantém arrays como estão,
     * e retorna null para valores vazios ou "TODOS".
     * 
     * @param {*} filterValue - Valor do filtro (string, array, null, undefined)
     * @returns {Array|null} - Array normalizado ou null
     */
    normalizeFilterParam(filterValue) {
        try {
            // Se é null, undefined ou string vazia, retorna null
            if (!filterValue || filterValue === "" || filterValue === "TODOS") {
                return null;
            }
            
            // Se é array vazio, retorna null
            if (Array.isArray(filterValue) && filterValue.length === 0) {
                return null;
            }
            
            // Se é array com valores, retorna o array
            if (Array.isArray(filterValue)) {
                // Validação de tamanho (máximo 100 itens)
                if (filterValue.length > 100) {
                    return filterValue.slice(0, 100);
                }
                return filterValue;
            }
            
            // Se é valor único, converte para array
            return [filterValue];
            
        } catch (error) {
            console.error('Erro ao normalizar parâmetro de filtro:', error);
            return null;
        }
    }

    /**
     * Busca os dados consolidados no Supabase para o Heatmap Operacional.
     * Aceita p_aparelho como filtro interno da view (select de modelo).
     * ATUALIZADO: Agora envia arrays completos para suporte a seleção múltipla.
     */
    async fetchHeatmapRPC(p_aparelho = null) {
        const params = {
            p_shopping: this.normalizeFilterParam(this.currentFilters['shopping']),
            p_rede: null, // Removido filtro de rede
            p_store_name: this.normalizeFilterParam(this.currentFilters['store_name']),
            p_linha: this.normalizeFilterParam(this.currentFilters['linha_de_produto']),
            p_regional: this.normalizeFilterParam(this.currentFilters['regional']),
            p_p8020: this.normalizeFilterParam(this.currentFilters['p8020']),
            p_visibilidade: this.normalizeFilterParam(this.currentFilters['visibilidade']),
            p_dates: this.currentFilters['pure_date'] || null,
            p_aparelho: this.normalizeFilterParam(p_aparelho)
        };

        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            try {
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_heatmap_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
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
     * ATUALIZADO: Agora envia arrays completos para suporte a seleção múltipla.
     */
    async fetchPositivacaoRPC() {
        const params = {
            p_shopping: this.normalizeFilterParam(this.currentFilters['shopping']),
            p_rede: null, // Removido filtro de rede
            p_store_name: this.normalizeFilterParam(this.currentFilters['store_name']),
            p_linha: this.normalizeFilterParam(this.currentFilters['linha_de_produto']),
            p_regional: this.normalizeFilterParam(this.currentFilters['regional']),
            p_p8020: this.normalizeFilterParam(this.currentFilters['p8020']),
            p_visibilidade: this.normalizeFilterParam(this.currentFilters['visibilidade']),
            p_dates: this.currentFilters['pure_date'] || null
        };

        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            try {
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_positivacao_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
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
     * ATUALIZADO: Agora envia arrays completos para suporte a seleção múltipla.
     */
    async fetchOverviewRPC() {
        const params = {
            p_shopping: this.normalizeFilterParam(this.currentFilters['shopping']),
            p_rede: null, // Removido filtro de rede
            p_store_name: this.normalizeFilterParam(this.currentFilters['store_name']),
            p_linha: this.normalizeFilterParam(this.currentFilters['linha_de_produto']),
            p_regional: this.normalizeFilterParam(this.currentFilters['regional']),
            p_p8020: this.normalizeFilterParam(this.currentFilters['p8020']),
            p_visibilidade: this.normalizeFilterParam(this.currentFilters['visibilidade']),
            p_dates: this.currentFilters['pure_date'] || null
        };

        // Tenta 2 vezes: primeira imediata, segunda após 3s
        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            try {
                // PONTO CRÍTICO: cliente novo e limpo a cada tentativa
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_overview_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
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
     * ATUALIZADO: Agora envia arrays completos para suporte a seleção múltipla.
     */
    async fetchPerformanceRPC() {
        const params = {
            p_shopping: this.normalizeFilterParam(this.currentFilters['shopping']),
            p_rede: null, // Removido filtro de rede
            p_store_name: this.normalizeFilterParam(this.currentFilters['store_name']),
            p_linha: this.normalizeFilterParam(this.currentFilters['linha_de_produto']),
            p_regional: this.normalizeFilterParam(this.currentFilters['regional']),
            p_p8020: this.normalizeFilterParam(this.currentFilters['p8020']),
            p_visibilidade: this.normalizeFilterParam(this.currentFilters['visibilidade']),
            p_dates: this.currentFilters['pure_date'] || null
        };

        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            try {
                const freshClient = createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc('get_performance_metrics', params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
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

    /**
     * Busca o raio-x detalhado de uma loja específica.
     * Retorna: aparelhos, fluxo por hora, dia da semana, semana vs fds, linha de produto.
     */
    async fetchStoreXrayRPC(storeName) {
        const params = {
            p_shopping: this.normalizeFilterParam(this.currentFilters['shopping']),
            p_rede: null,
            p_store_name: this.normalizeFilterParam(storeName),
            p_linha: this.normalizeFilterParam(this.currentFilters['linha_de_produto']),
            p_regional: this.normalizeFilterParam(this.currentFilters['regional']),
            p_p8020: this.normalizeFilterParam(this.currentFilters['p8020']),
            p_visibilidade: this.normalizeFilterParam(this.currentFilters['visibilidade']),
            p_dates: this.currentFilters['pure_date'] || null
        };

        try {
            const freshClient = createFreshClient();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
            );

            const dbPromise = freshClient.rpc('get_store_xray', params);

            const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

            if (error) throw error;

            return data;

        } catch (err) {
            console.error("🚨 Store X-Ray: erro:", err);
            return null;
        }
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
                const rowVal = row[key];
                
                if (Array.isArray(filterVal)) {
                    // Se o array está vazio, não filtra
                    if (filterVal.length === 0) continue;
                    
                    // Verifica se o valor da linha existe e está no array de filtros
                    if (!rowVal || rowVal === 'N/A' || !filterVal.includes(rowVal)) {
                        return false;
                    }
                } else {
                    // Para valores únicos, compara normalmente
                    if (filterVal && rowVal && String(rowVal) !== String(filterVal)) {
                        return false;
                    }
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
        try {
            const filteredData = this.getFilteredData();
            this.listeners.forEach((callback) => {
                try {
                    callback(filteredData);
                } catch (error) {
                    console.error('Erro em listener do DataManager:', error);
                }
            });
        } catch (error) {
            console.error('Erro na função notify do DataManager:', error);
        }
    }
}

export const appData = new DataManager();