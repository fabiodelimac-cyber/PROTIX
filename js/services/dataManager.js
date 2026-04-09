// js/services/dataManager.js

class DataManager {
    constructor() {
        this.rawData = [];       // A base de dados original intocada
        this.filteredData = [];  // A base de dados após os filtros aplicados
        this.currentFilters = {}; // O estado atual dos filtros globais
        this.listeners = [];     // Quem está "escutando" as mudanças (as Views)
    }

    // 1. Recebe os dados brutos na carga inicial (via PapaParse)
    setRawData(data) {
        this.rawData = data;
        this.filteredData = [...data];
        this.notifyListeners();
    }

    // 2. Atualiza um filtro específico e reprocessa a base
    setFilter(key, value) {
        if (value === 'ALL' || value === '') {
            delete this.currentFilters[key];
        } else {
            this.currentFilters[key] = value;
        }
        this.applyFilters();
    }

    // 3. O motor de filtragem (Rápido e centralizado)
    applyFilters() {
        this.filteredData = this.rawData.filter(item => {
            let matches = true;
            for (const key in this.currentFilters) {
                // Se a chave existir no item e não bater com o filtro, descarta
                if (item[key] && item[key] !== this.currentFilters[key]) {
                    matches = false;
                    break;
                }
            }
            return matches;
        });
        
        this.notifyListeners();
    }

    // 4. Inscrição das Views (A View diz: "Me avise quando mudar")
    subscribe(callback) {
        this.listeners.push(callback);
        // Retorna a função de unsubscribe (para limpar a memória ao trocar de tela)
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // 5. O "Grito" (Avisa todas as views inscritas)
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.filteredData));
    }

    // Retorna a foto atual dos dados
    getFilteredData() {
        return this.filteredData;
    }
}

// Exporta uma única instância global (Singleton)
export const appData = new DataManager();