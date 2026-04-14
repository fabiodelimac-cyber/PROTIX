import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zkxzjrlhuyjqikzszrjx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreHpqcmxodXlqcWlrenN6cmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDE4OTAsImV4cCI6MjA5MTMxNzg5MH0.dymlLMhnDPnNyZ4_cioD6gTF2TW4uOWdWmH8yF8LvMM';

// Cliente permanente: usado para autenticação (login, sessão, onAuthStateChange)
// Este precisa ser estável e persistente — não pode ser recriado.
export const supabase = createClient(supabaseUrl, supabaseKey);

// Fábrica de cliente descartável: usado para buscar dados (RPC, queries)
// Cria um cliente novo e limpo a cada chamada, evitando estado corrompido
// após o Chrome hibernar a aba.
export function createFreshClient() {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false, // Não tenta reusar sessão — apenas busca dados
            autoRefreshToken: false
        }
    });
}