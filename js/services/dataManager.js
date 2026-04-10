// js/services/dataManager.js

class DataManager {
    constructor() {
        this.rawData = [];
        this.currentFilters = {};
        this.listeners = [];
    }

    /**
     * Recebe os dados brutos do Supabase e padroniza os tipos
     * @param {Array} data - Array de objetos vindos do PostgreSQL
     */
    setRawData(data) {
        if (!data || !Array.isArray(data)) {
            console.error("DataManager: Dados inválidos recebidos.");
            return;
        }

        // SANITIZAÇÃO DE ENTRADA: 
        // Garante que 'sessions' seja um número matemático puro e não uma string.
        // Assim, as Views não precisam fazer tratamento de dados.
        this.rawData = data.map(row => {
            let numSessions = 0;
            if (typeof row.sessions === 'number') {
                numSessions = row.sessions;
            } else if (row.sessions) {
                numSessions = parseFloat(row.sessions.toString().replace(/\./g, '').replace(',', '.')) || 0;
            }

            return {
                ...row,
                sessions: numSessions
            };
        });

        console.log(`DataManager: ${this.rawData.length} linhas carregadas na memória.`);
        this.notify();
    }

    /**
     * Adiciona ou remove um filtro
     * @param {string} key - Nome EXATO da coluna no Supabase (ex: 'store_name')
     * @param {string} value - Valor selecionado no dropdown
     */
    setFilter(key, value) {
        // Agora ele entende se 'value' for um array vazio e limpa o filtro
        if (!value || value === "" || value === "TODOS" || (Array.isArray(value) && value.length === 0)) {
            delete this.currentFilters[key];
        } else {
            this.currentFilters[key] = value;
        }
        this.notify();
    }

    /**
     * Limpa todos os filtros ativos
     */
    clearAllFilters() {
        this.currentFilters = {};
        this.notify();
    }

    /**
     * Motor de Cruzamento: Retorna apenas as linhas que passam por TODOS os filtros ativos
     */
   getFilteredData() {
        if (Object.keys(this.currentFilters).length === 0) {
            return this.rawData;
        }

        return this.rawData.filter(row => {
            for (const key in this.currentFilters) {
                const filterVal = this.currentFilters[key];
                
                // Se o filtro for um Array (Checkbox de Data), verifica se a linha está dentro da lista
                if (Array.isArray(filterVal)) {
                    if (!filterVal.includes(row[key])) return false;
                } 
                // Se for Dropdown normal, faz verificação exata
                else {
                    if (String(row[key]) !== String(filterVal)) return false;
                }
            }
            return true;
        });
    }

    /**
     * Inscreve uma função (View) para ouvir mudanças nos dados
     * @param {Function} callback - Função que será rodada com os dados filtrados
     * @returns {Function} - Função para cancelar a inscrição (Cleanup)
     */
    subscribe(callback) {
        this.listeners.push(callback);
        
        // Retorna a função de unsubscribe para evitar memory leaks quando mudar de tela
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Avisa todas as Views e Dropdowns que algo mudou (Cascata)
     */
    notify() {
        const filteredData = this.getFilteredData();
        this.listeners.forEach(callback => callback(filteredData));
    }
}

// Exporta uma instância ÚNICA (Singleton) para ser compartilhada por toda a aplicação
export const appData = new DataManager();