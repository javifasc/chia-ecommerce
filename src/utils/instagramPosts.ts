/**
 * Publicaciones de Instagram que se muestran en la landing.
 *
 * PARA ACTUALIZARLAS:
 * 1. Abrí la publicación en Instagram (desde la web, no la app).
 * 2. Copiá el link. Queda algo así:
 *      https://www.instagram.com/p/Dcj95amDTLl/
 *                                  ^^^^^^^^^^^ este es el código
 *    En los reels el link dice /reel/ en vez de /p/ y también sirve.
 * 3. Reemplazá los códigos de abajo por los nuevos.
 *
 * No hace falta tocar nada más: ni Supabase, ni Vercel, ni tokens.
 * Se muestran en este orden, así que el primero es el más destacado.
 *
 * Se cargan recién cuando el visitante scrollea hasta la sección: cada
 * embed pesa varios cientos de KB y si no, se comería la landing en 4G.
 */
export const INSTAGRAM_POSTS: string[] = [
    'Dcj95amDTLl',
    'DcKVuhIN9Qa',
    'Db68Nt6jbm-',
];
