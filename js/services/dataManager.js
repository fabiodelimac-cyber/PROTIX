// js/services/dataManager.js
import { createFreshClient } from './supabaseClient.js';

class DataManager {
    constructor() {
        this.rawData = [];
        this.devicesByLinha = [];
        this.currentFilters = {};
        this.listeners = [];
        this.onReactivation = null; // Callback registrado pelo app.js para re-renderizar a view ativa
        this._notifyTimer = null;   // Timer do debounce do notify()

        // Listener de reativação de aba
        // Quando o Chrome "acorda" a aba, re-renderiza a view ativa do zero.
        let reactivationTimer = null;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                clearTimeout(reactivationTimer);
                reactivationTimer = setTimeout(() => {
                    if (typeof this.onReactivation === 'function') {
                        this.onReactivation();
                    } else {
                        this.notify();
                    }
                }, 1000);
            }
        });
    }

    /**
     * Normaliza parâmetros de filtro para arrays, mantendo backward compatibility.
     */
    normalizeFilterParam(filterValue) {
        try {
            if (!filterValue || filterValue === "" || filterValue === "TODOS") {
                return null;
            }
            if (Array.isArray(filterValue) && filterValue.length === 0) {
                return null;
            }
            if (Array.isArray(filterValue)) {
                if (filterValue.length > 100) {
                    return filterValue.slice(0, 100);
                }
                return filterValue;
            }
            return [filterValue];
        } catch (error) {
            console.error('Erro ao normalizar parâmetro de filtro:', error);
            return null;
        }
    }

    /**
     * Executa uma chamada RPC com retry e timeout.
     * Cria um cliente descartável a cada tentativa para evitar estado corrompido.
     */
    async _callRPC(functionName, params) {
        const tentativas = [0, 3000];

        for (let i = 0; i < tentativas.length; i++) {
            const espera = tentativas[i];
            const numTentativa = i + 1;

            if (espera > 0) {
                await new Promise(resolve => setTimeout(resolve, espera));
            }

            try {
                const freshClient = await createFreshClient();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT_REDE")), 15000)
                );

                const dbPromise = freshClient.rpc(functionName, params);

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

                if (error) throw error;

                return data;

            } catch (err) {
                if (err.message === "TIMEOUT_REDE") {
                    if (numTentativa === tentativas.length) {
                        console.error(`🚨 ${functionName}: falha crítica após todas as tentativas.`);
                        return null;
                    }
                } else {
                    console.error(`🚨 ${functionName}: erro inesperado:`, err);
                    return null;
                }
            }
        }

        return null;
    }

    /** Monta os parâmetros padrão de filtro usados por todas as RPCs */
    _buildFilterParams() {
        return {
            p_shopping: this.normalizeFilterParam(this.currentFilters['shopping']),
            p_rede: null,
            p_store_name: this.normalizeFilterParam(this.currentFilters['store_name']),
            p_linha: this.normalizeFilterParam(this.currentFilters['linha_de_produto']),
            p_regional: this.normalizeFilterParam(this.currentFilters['regional']),
            p_p8020: this.normalizeFilterParam(this.currentFilters['p8020']),
            p_visibilidade: this.normalizeFilterParam(this.currentFilters['visibilidade']),
            p_dates: this.currentFilters['pure_date'] || null
        };
    }

    /** Busca dados consolidados para o Heatmap Operacional */
    async fetchHeatmapRPC(p_aparelho = null) {
        const params = {
            ...this._buildFilterParams(),
            p_aparelho: this.normalizeFilterParam(p_aparelho)
        };
        return this._callRPC('get_heatmap_metrics', params);
    }

    /** Busca dados consolidados para a Positivação */
    async fetchPositivacaoRPC() {
        return this._callRPC('get_positivacao_metrics', this._buildFilterParams());
    }

    /** Busca dados consolidados para a Visão Geral */
    async fetchOverviewRPC() {
        return this._callRPC('get_overview_metrics', this._buildFilterParams());
    }

    /** Busca dados consolidados para a view Performance */
    async fetchPerformanceRPC() {
        return this._callRPC('get_performance_metrics', this._buildFilterParams());
    }

    /** Busca o raio-x detalhado de uma loja específica */
    async fetchStoreXrayRPC(storeName) {
        const params = {
            ...this._buildFilterParams(),
            p_store_name: this.normalizeFilterParam(storeName)
        };
        return this._callRPC('get_store_xray', params);
    }

    /** Busca combinações únicas de filtro + devices_by_linha (substitui select(*)) */
    async fetchFilterOptionsRPC() {
        return this._callRPC('get_filter_options', {});
    }

    /**
     * Recebe as combinações únicas retornadas pela get_filter_options e
     * armazena como rawData. Não faz parse de sessions (não existe nesse shape).
     */
    setRawData(data) {
        if (!data || !Array.isArray(data)) {
            console.error("DataManager: Dados inválidos recebidos.");
            return;
        }

        // Dados de filtro: apenas colunas de dimensão, sem sessions
        this.rawData = data;

        this.notify();
    }

    /**
     * Armazena devices_by_linha retornado pela get_filter_options.
     * Usado pelo tooltip de aparelhos na Overview.
     */
    setDevicesByLinha(data) {
        this.devicesByLinha = Array.isArray(data) ? data : [];
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
                    if (filterVal.length === 0) continue;
                    if (!rowVal || rowVal === 'N/A' || !filterVal.includes(rowVal)) {
                        return false;
                    }
                } else {
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
        // Debounce de 300ms: evita múltiplas RPCs simultâneas em cliques rápidos nos filtros
        clearTimeout(this._notifyTimer);
        this._notifyTimer = setTimeout(() => {
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
        }, 300);
    }
}

export const appData = new DataManager();
