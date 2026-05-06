/**
 * Usage Stats — Coleta leve de dados de uso por sessão
 * Registra: hora do login, duração da sessão, aba mais usada
 * Substitui o PerformanceMonitor (CPU/GPU) removido na RT1.0 item 2.2
 */

import { supabase } from './services/supabaseClient.js';

class UsageStats {
    constructor() {
        this.currentUser = null;
        this.sessionStart = null;

        // Tempo acumulado por aba (em ms)
        this.tabTimes = {
            'view-overview':      0,
            'view-positivacao':   0,
            'view-heat-produtos': 0,
            'view-performance':   0
        };

        // Controle da aba atual e quando entrou nela
        this.currentTab = 'view-overview';
        this.tabEnteredAt = null;

        // Flag para evitar double-save no pagehide + logout simultâneos
        this.saved = false;

        // Supabase config para o fetch keepalive no pagehide
        this.supabaseUrl = null;
        this.supabaseKey = null;
        this.accessToken = null;
    }

    /**
     * Inicia a sessão. Chamado logo após o login bem-sucedido.
     */
    async init(user) {
        this.currentUser = user;
        this.sessionStart = new Date().toISOString();
        this.saved = false;
        this.tabEnteredAt = Date.now();

        // Carrega config para o fetch keepalive
        try {
            const { data: { session } } = await supabase.auth.getSession();
            this.supabaseUrl = 'https://zkxzjrlhuyjqikzszrjx.supabase.co';
            this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreHpqcmxodXlqcWlrenN6cmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDE4OTAsImV4cCI6MjA5MTMxNzg5MH0.dymlLMhnDPnNyZ4_cioD6gTF2TW4uOWdWmH8yF8LvMM';
            this.accessToken = session?.access_token || null;
        } catch (e) {
            console.error('[UsageStats] Erro ao carregar config:', e);
        }

        // Salva ao fechar aba/browser (keepalive garante envio mesmo após fechar)
        window.addEventListener('pagehide', () => this._saveOnUnload());
    }

    /**
     * Notifica troca de aba. Chamado pelo roteador do app.js.
     */
    setTab(tabName) {
        if (!this.currentUser) return;

        // Acumula tempo na aba anterior
        if (this.tabEnteredAt && this.currentTab) {
            this.tabTimes[this.currentTab] = (this.tabTimes[this.currentTab] || 0)
                + (Date.now() - this.tabEnteredAt);
        }

        this.currentTab = tabName;
        this.tabEnteredAt = Date.now();
    }

    /**
     * Finaliza e salva a sessão. Chamado no logout explícito.
     */
    async save() {
        if (!this.currentUser || this.saved) return;
        this.saved = true;

        // Acumula tempo da aba atual antes de salvar
        if (this.tabEnteredAt && this.currentTab) {
            this.tabTimes[this.currentTab] = (this.tabTimes[this.currentTab] || 0)
                + (Date.now() - this.tabEnteredAt);
        }

        const payload = this._buildPayload();

        try {
            const { error } = await supabase.from('usage_stats').insert([payload]);
            if (error) console.error('[UsageStats] Erro ao salvar:', error);
        } catch (e) {
            console.error('[UsageStats] Erro inesperado ao salvar:', e);
        }
    }

    /**
     * Salva via fetch keepalive — funciona mesmo ao fechar a aba/browser.
     */
    _saveOnUnload() {
        if (!this.currentUser || this.saved) return;
        if (!this.accessToken) return;
        this.saved = true;

        // Acumula tempo da aba atual
        if (this.tabEnteredAt && this.currentTab) {
            this.tabTimes[this.currentTab] = (this.tabTimes[this.currentTab] || 0)
                + (Date.now() - this.tabEnteredAt);
        }

        const payload = this._buildPayload();

        try {
            fetch(`${this.supabaseUrl}/rest/v1/usage_stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch (e) {
            console.error('[UsageStats] Erro no save de unload:', e);
        }
    }

    /**
     * Monta o payload para inserção.
     */
    _buildPayload() {
        const tabTimesSeconds = {};
        let mostUsedTab = null;
        let maxTime = 0;

        for (const [tab, ms] of Object.entries(this.tabTimes)) {
            const seconds = Math.round(ms / 1000);
            tabTimesSeconds[tab] = seconds;
            if (seconds > maxTime) {
                maxTime = seconds;
                mostUsedTab = tab;
            }
        }

        return {
            user_id:       this.currentUser.id,
            user_email:    this.currentUser.email,
            session_start: this.sessionStart,
            session_end:   new Date().toISOString(),
            most_used_tab: mostUsedTab,
            tab_times:     tabTimesSeconds
        };
    }

    /**
     * Reseta o estado para uma nova sessão (após logout).
     */
    reset() {
        this.currentUser = null;
        this.sessionStart = null;
        this.saved = false;
        this.tabEnteredAt = null;
        this.currentTab = 'view-overview';
        this.tabTimes = {
            'view-overview':      0,
            'view-positivacao':   0,
            'view-heat-produtos': 0,
            'view-performance':   0
        };
        this.accessToken = null;
    }
}

export const usageStats = new UsageStats();
