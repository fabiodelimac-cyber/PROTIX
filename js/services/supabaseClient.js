import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zkxzjrlhuyjqikzszrjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreHpqcmxodXlqcWlrenN6cmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDE4OTAsImV4cCI6MjA5MTMxNzg5MH0.dymlLMhnDPnNyZ4_cioD6gTF2TW4uOWdWmH8yF8LvMM';

// Cliente permanente: usado para autenticação (login, sessão, onAuthStateChange).
// Este precisa ser estável e persistente — não pode ser recriado.
export const supabase = createClient(supabaseUrl, supabaseKey);

// Fábrica de cliente descartável: usado para buscar dados (RPC, queries).
// Cria um cliente novo e limpo a cada chamada, evitando estado corrompido
// após o Chrome hibernar a aba.
//
// O token JWT é lido diretamente do localStorage (onde o SDK persiste
// automaticamente) para evitar o travamento do getSession() após hibernação.
// O getSession() é usado como fallback apenas se o localStorage estiver vazio.
export async function createFreshClient() {
    let session = null;

    // 1. Tenta localStorage primeiro (instantâneo e confiável)
    try {
        const storageKey = Object.keys(localStorage).find(k =>
            k.startsWith('sb-') && k.endsWith('-auth-token')
        );
        if (storageKey) {
            const stored = JSON.parse(localStorage.getItem(storageKey));
            if (stored?.access_token) {
                session = stored;
            }
        }
    } catch (e) { /* silencioso */ }

    // 2. Fallback: getSession() com timeout de 2s (caso localStorage esteja vazio)
    if (!session) {
        try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT_SESSION')), 2000)
            );
            const result = await Promise.race([sessionPromise, timeoutPromise]);
            session = result.data?.session;
        } catch (err) { /* silencioso — opera como anon */ }
    }

    const freshClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            storageKey: `sb-fresh-${Date.now()}-${Math.random().toString(36).slice(2)}`
        }
    });

    // Injeta o token do usuário logado para que o cliente opere como authenticated
    if (session?.access_token) {
        await freshClient.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
        });
    }

    return freshClient;
}
