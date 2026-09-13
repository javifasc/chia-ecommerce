import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Faltan las credenciales de Supabase en el archivo .env');
}

export const AUTH_STORAGE_KEY = 'chia-auth-token';

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY // Unique key to avoid collisions with other local apps
    }
});

/**
 * Cliente de solo lectura para los datos públicos: catálogo, promociones y zonas de envío.
 *
 * La opción `accessToken` fija el header Authorization en la anon key, así que este cliente
 * NUNCA manda el JWT del usuario. Una sesión vencida o firmada con una clave vieja en
 * localStorage no puede romper la carga de productos: PostgREST valida el JWT antes de
 * tocar la tabla y devuelve 401 aunque RLS esté deshabilitado.
 *
 * Al pasar `accessToken`, supabase-js no instancia un segundo cliente de auth, por lo que
 * no hay sesión duplicada ni warning de "Multiple GoTrueClient instances".
 * `supabasePublic.auth` es un proxy que lanza error a propósito: no usarlo.
 */
export const supabasePublic = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    accessToken: async () => supabaseAnonKey || ''
});

/**
 * Detecta si un error viene de un token de sesión que el servidor no puede validar
 * (vencido, firmado con una clave rotada, o corrupto).
 *
 * Importante: el objeto PostgrestError solo tiene { message, details, hint, code } y NO
 * tiene `status`. Para una sesión inválida este proyecto responde:
 *   { code: "PGRST301", message: "No suitable key or wrong key type",
 *     details: "None of the keys was able to decode the JWT" }
 * La palabra "JWT" aparece únicamente en `details`, por eso hay que mirar todos los campos
 * y no solamente `message`.
 */
export function isAuthTokenError(error: unknown): boolean {
    if (!error) return false;

    const e = error as Record<string, any>;

    // PGRST301/PGRST302 = PostgREST rechazó el JWT. 401/403 = rechazo de GoTrue.
    const code = String(e.code ?? '');
    if (code === 'PGRST301' || code === 'PGRST302') return true;
    if (e.status === 401 || e.status === 403) return true;

    const haystack = [e.message, e.details, e.hint, e.error_description, e.error]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return (
        haystack.includes('jwt') ||
        haystack.includes('no suitable key') ||
        haystack.includes('wrong key type') ||
        haystack.includes('refresh token') ||
        haystack.includes('invalid token') ||
        haystack.includes('unauthorized') ||
        haystack.includes('bad_jwt') ||
        haystack.includes('claims')
    );
}

/**
 * Borra por completo la sesión corrupta para que la app vuelva a operar como anónima.
 *
 * `scope: 'local'` evita el pedido de red a /auth/v1/logout, que con un token inválido
 * falla igual. Después barremos el storage por prefijo en lugar de nombres fijos, porque
 * pueden quedar claves de configuraciones anteriores (ej: sb-<ref>-auth-token) y también
 * entradas auxiliares como `<storageKey>-code-verifier` o `<storageKey>-user`.
 */
export async function purgeStaleSession(): Promise<void> {
    try {
        await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
        console.warn('signOut local falló, se limpia el storage igual:', e);
    }

    const isAuthKey = (key: string) =>
        key.startsWith(AUTH_STORAGE_KEY) || (key.startsWith('sb-') && key.includes('-auth-token'));

    for (const store of [localStorage, sessionStorage]) {
        try {
            Object.keys(store)
                .filter(isAuthKey)
                .forEach(key => store.removeItem(key));
        } catch (e) {
            console.warn('No se pudo limpiar el storage:', e);
        }
    }
}
