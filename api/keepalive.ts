/**
 * "Despertador" de Supabase.
 *
 * El plan gratis de Supabase pausa el proyecto tras 7 días sin actividad, y con
 * la base pausada la tienda queda sin catálogo, login ni pedidos. El cron de
 * vercel.json llama a esta función una vez por día y hace una consulta mínima
 * para que el proyecto cuente como activo.
 *
 * Usa las mismas variables que la app (VITE_SUPABASE_URL y la clave pública)
 * y solo lee un id de products, que ya es público por RLS.
 */
export async function GET(request: Request) {
    // Si el proyecto de Vercel tiene CRON_SECRET, Vercel lo manda en cada
    // llamada del cron; así nadie más puede disparar la función.
    const secret = process.env.CRON_SECRET;
    if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
        return new Response('No autorizado', { status: 401 });
    }

    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
        return Response.json({ ok: false, error: 'Faltan las variables de Supabase' }, { status: 500 });
    }

    try {
        const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        // Un 5xx o un error de red se loguea en Vercel y el cron queda marcado
        // como fallido: es la señal de que la base está caída o pausada.
        return Response.json({ ok: res.ok, status: res.status }, { status: res.ok ? 200 : 502 });
    } catch (error) {
        return Response.json({ ok: false, error: String(error) }, { status: 502 });
    }
}
