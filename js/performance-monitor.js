/**
 * Performance Monitor (Backend Only)
 * Coleta silenciosa de CPU, GPU e tempo de sessão
 * Salva dados no Supabase sem interface visual
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            cpu: 0,
            gpu: 0,
            sessionTime: 0,
            startTime: Date.now(),
            lastFrameTime: performance.now(),
            cpuSamples: [],
            gpuSamples: [],
            maxSamples: 60
        };

        this.saveInterval = null;
        this.currentUser = null;
        this.sessionId = this.generateSessionId();
        this.supabaseConfig = null;
        this.isUnloading = false;  // Flag para evitar múltiplos saves no unload

        this.init();
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    init() {
        console.log('🚀 Performance Monitor: Iniciado');
        this.startMonitoring();
        this.setupAutoSave();
    }

    startMonitoring() {
        // Session time update
        setInterval(() => {
            this.metrics.sessionTime = Math.floor((Date.now() - this.metrics.startTime) / 1000);
        }, 1000);

        // CPU & GPU estimation
        this.estimateSystemMetrics();
    }

    estimateSystemMetrics() {
        // CPU usando memory API (se disponível)
        if (performance.memory) {
            setInterval(() => {
                const used = performance.memory.usedJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                const cpuValue = Math.round((used / limit) * 100);
                
                this.metrics.cpuSamples.push(cpuValue);
                if (this.metrics.cpuSamples.length > this.metrics.maxSamples) {
                    this.metrics.cpuSamples.shift();
                }
                
                // Calcula média
                this.metrics.cpu = Math.round(
                    this.metrics.cpuSamples.reduce((a, b) => a + b, 0) / this.metrics.cpuSamples.length
                );
            }, 2000);
        }

        // GPU estimation via requestAnimationFrame (medição correta)
        let lastFrameTime = performance.now();
        let frameTimes = [];
        
        const measureFrame = () => {
            const now = performance.now();
            const delta = now - lastFrameTime;
            lastFrameTime = now;
            
            // Armazena tempo entre frames
            frameTimes.push(delta);
            if (frameTimes.length > 60) {
                frameTimes.shift();
            }
            
            // Calcula média dos últimos 60 frames
            if (frameTimes.length > 0) {
                const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
                
                // GPU load: quanto mais próximo de 16.67ms (60fps), melhor
                // Se avgFrameTime > 16.67ms, a GPU está sobrecarregada
                // Se avgFrameTime < 16.67ms, a GPU está ociosa
                const targetFrameTime = 16.67; // 60fps
                
                if (avgFrameTime <= targetFrameTime) {
                    // GPU está bem, calcula % de uso baseado na proximidade do ideal
                    this.metrics.gpu = Math.round((avgFrameTime / targetFrameTime) * 50);
                } else {
                    // GPU está sobrecarregada
                    const overload = (avgFrameTime - targetFrameTime) / targetFrameTime;
                    this.metrics.gpu = Math.min(100, Math.round(50 + (overload * 50)));
                }
                
                // Adiciona à lista de samples para média
                this.metrics.gpuSamples.push(this.metrics.gpu);
                if (this.metrics.gpuSamples.length > this.metrics.maxSamples) {
                    this.metrics.gpuSamples.shift();
                }
            }
            
            requestAnimationFrame(measureFrame);
        };
        
        requestAnimationFrame(measureFrame);
    }

    setupAutoSave() {
        // Salva métricas a cada 5 minutos (para sessões longas)
        this.saveInterval = setInterval(() => {
            this.saveMetricsToDatabase();
        }, 5 * 60 * 1000);

        // Usa apenas pagehide - é o mais confiável e moderno
        // Funciona em desktop e mobile, captura todos os casos
        window.addEventListener('pagehide', (e) => {
            this.saveOnUnload();
        });
    }

    async setCurrentUser(user) {
        this.currentUser = user;
        
        console.log('🔧 Performance Monitor: Usuário definido', user.email);
        
        // Carrega config do Supabase uma vez
        try {
            const { supabase } = await import('./services/supabaseClient.js');
            
            // Pega o token de sessão do usuário logado
            const { data: { session } } = await supabase.auth.getSession();
            
            const supabaseUrl = 'https://zkxzjrlhuyjqikzszrjx.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreHpqcmxodXlqcWlrenN6cmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDE4OTAsImV4cCI6MjA5MTMxNzg5MH0.dymlLMhnDPnNyZ4_cioD6gTF2TW4uOWdWmH8yF8LvMM';
            
            this.supabaseConfig = {
                url: supabaseUrl,
                key: supabaseKey,
                accessToken: session?.access_token || null  // Token do usuário
            };
            
            console.log('✅ Performance Monitor: Config carregada', {
                hasToken: !!this.supabaseConfig.accessToken
            });
        } catch (e) {
            console.error('❌ Erro ao carregar config Supabase:', e);
        }
    }

    async saveMetricsToDatabase() {
        if (!this.currentUser) {
            console.warn('⚠️ Performance Monitor: Usuário não definido, não salvando');
            return;
        }

        try {
            const payload = {
                user_id: this.currentUser.id,
                user_email: this.currentUser.email,
                session_id: this.sessionId,
                avg_cpu: this.metrics.cpu,
                avg_gpu: this.metrics.gpu,
                session_duration_seconds: this.metrics.sessionTime,
                timestamp: new Date().toISOString(),
                device_info: this.getDeviceInfo()
            };

            console.log('💾 Salvando métricas (normal):', {
                sessao: this.metrics.sessionTime + 's',
                cpu: this.metrics.cpu + '%',
                gpu: this.metrics.gpu + '%'
            });

            // Importa Supabase dinamicamente
            const { supabase } = await import('./services/supabaseClient.js');

            const { data, error } = await supabase
                .from('performance_metrics')
                .insert([payload]);

            if (error) {
                console.error('❌ Erro ao salvar métricas:', error);
            } else {
                console.log('✅ Métricas salvas com sucesso!');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar métricas no banco:', error);
        }
    }

    // Método especial para salvar ao fechar - usa fetch com keepalive
    saveOnUnload() {
        // Evita múltiplos saves (pagehide + beforeunload + visibilitychange)
        if (this.isUnloading) {
            console.log('⏭️ UNLOAD: Já salvando, ignorando evento duplicado');
            return;
        }
        
        if (!this.currentUser) {
            console.warn('⚠️ UNLOAD: Usuário não definido');
            return;
        }
        
        if (!this.supabaseConfig) {
            console.warn('⚠️ UNLOAD: Config não carregada');
            return;
        }
        
        if (!this.supabaseConfig.accessToken) {
            console.warn('⚠️ UNLOAD: Token não disponível');
            return;
        }

        // Marca como "salvando" para evitar duplicatas
        this.isUnloading = true;

        const payload = {
            user_id: this.currentUser.id,
            user_email: this.currentUser.email,
            session_id: this.sessionId,
            avg_cpu: this.metrics.cpu,
            avg_gpu: this.metrics.gpu,
            session_duration_seconds: this.metrics.sessionTime,
            timestamp: new Date().toISOString(),
            device_info: this.getDeviceInfo()
        };

        console.log('🚪 UNLOAD: Salvando ao fechar', {
            sessao: this.metrics.sessionTime + 's',
            cpu: this.metrics.cpu + '%',
            gpu: this.metrics.gpu + '%'
        });

        // Usa fetch com keepalive - CRÍTICO para funcionar ao fechar
        const url = `${this.supabaseConfig.url}/rest/v1/performance_metrics`;
        
        try {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseConfig.key,
                    'Authorization': `Bearer ${this.supabaseConfig.accessToken}`,  // Token do usuário
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(payload),
                keepalive: true  // CRÍTICO: mantém requisição após fechar página
            });
            
            console.log('✅ UNLOAD: Requisição enviada');
        } catch (error) {
            console.error('❌ UNLOAD: Erro ao salvar:', error);
        }
    }

    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            connection: navigator.connection?.effectiveType || 'unknown'
        };
    }

    destroy() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        // Salva uma última vez antes de destruir
        this.saveOnUnload();
    }
}

// Exporta a instância global
window.performanceMonitor = new PerformanceMonitor();
