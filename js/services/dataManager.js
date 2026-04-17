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
                    console.warn('Array de filtro muito grande, limitando a 100 itens');
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

        console.log('🎯 Parâmetros enviados para fetchOverviewRPC:', params);

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
        console.log('🔔 Notificando views sobre mudança de filtros...');
        try {
            const filteredData = this.getFilteredData();
            console.log(`📊 ${this.listeners.length} listeners registrados`);
            this.listeners.forEach((callback, index) => {
                try {
                    console.log(`📞 Chamando listener ${index + 1}`);
                    callback(filteredData);
                } catch (error) {
                    console.error(`❌ Erro no listener ${index + 1}:`, error);
                }
            });
        } catch (error) {
            console.error('❌ Erro na função notify:', error);
        }
    }
}

export const appData = new DataManager();