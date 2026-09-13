/**
 * Publicaciones de Instagram que se muestran en la landing.
 *
 * Se administran desde el panel: Admin -> Promociones -> "Publicaciones de
 * Instagram". Se guardan en Supabase (tabla promotions, fila 'instagram'),
 * así que se actualizan sin tocar código ni volver a desplegar.
 *
 * Esta lista es solo el valor por defecto: se usa mientras no se haya
 * guardado ninguna desde el panel.
 */
export const DEFAULT_INSTAGRAM_POSTS: string[] = [
    'Dcj95amDTLl',
    'DcKVuhIN9Qa',
    'Db68Nt6jbm-',
];

/** Cuántas publicaciones se pueden mostrar a la vez. */
export const MAX_INSTAGRAM_POSTS = 6;

/**
 * Saca el código de una publicación a partir de lo que el usuario pegue.
 *
 * Acepta el link completo tal cual lo copia Instagram, con o sin parámetros
 * (?igsh=...), de posts (/p/), reels (/reel/) y videos viejos (/tv/), y
 * también el código pelado. Devuelve null si no reconoce nada.
 */
export function parseInstagramPostCode(input: string): string | null {
    const value = input.trim();
    if (!value) return null;

    const fromUrl = value.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (fromUrl) return fromUrl[1];

    // Código pelado. El rango es estrecho a propósito: los shortcodes tienen
    // 11 caracteres, y aceptar cualquier palabra corta dejaría pasar un error
    // de tipeo como si fuera válido.
    if (/^[A-Za-z0-9_-]{10,15}$/.test(value)) return value;

    return null;
}

/**
 * Mensaje para mostrarle al usuario cuando lo que pegó no sirve.
 * Distingue el caso del link corto de "Compartir", que no se puede resolver
 * desde el navegador porque es una redirección.
 */
export function describeInstagramLinkProblem(input: string): string {
    const value = input.trim();

    if (/instagram\.com\/share\//i.test(value)) {
        return 'Ese es un link corto de "Compartir". Abrí la publicación y copiá el link de la barra de direcciones.';
    }
    if (/instagram\.com\/stories\//i.test(value)) {
        return 'Las historias no se pueden incrustar: duran 24 horas. Usá una publicación o un reel.';
    }
    if (/instagram\.com/i.test(value)) {
        return 'Ese link es de Instagram pero no apunta a una publicación. Tiene que incluir /p/ o /reel/.';
    }
    return 'No parece un link de Instagram.';
}
