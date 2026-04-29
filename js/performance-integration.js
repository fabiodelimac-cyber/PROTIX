/**
 * Performance Monitor Integration
 * Conecta o monitor de performance com o sistema de autenticação
 * Coleta silenciosa - sem interface visual
 */

export async function initPerformanceMonitoring(user) {
    if (!window.performanceMonitor) return;

    // Define o usuário atual no monitor
    await window.performanceMonitor.setCurrentUser(user);
}

export function stopPerformanceMonitoring() {
    if (window.performanceMonitor) {
        window.performanceMonitor.destroy();
    }
}

/**
 * Função auxiliar para obter relatório de performance do usuário
 */
export async function getPerformanceReport(supabase, userId, days = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('performance_metrics')
            .select('*')
            .eq('user_id', userId)
            .gte('timestamp', startDate.toISOString())
            .order('timestamp', { ascending: false });

        if (error) throw error;

        // Calcula estatísticas
        if (data && data.length > 0) {
            const stats = {
                totalSessions: data.length,
                avgCpu: Math.round(data.reduce((sum, m) => sum + (m.avg_cpu || 0), 0) / data.length),
                avgGpu: Math.round(data.reduce((sum, m) => sum + (m.avg_gpu || 0), 0) / data.length),
                totalSessionTime: data.reduce((sum, m) => sum + (m.session_duration_seconds || 0), 0),
                metrics: data
            };
            return stats;
        }

        return null;
    } catch (error) {
        console.error('Erro ao obter relatório de performance:', error);
        return null;
    }
}
