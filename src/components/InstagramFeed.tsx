import { useCallback, useEffect, useRef, useState } from 'react';
import { INSTAGRAM_POSTS } from '../utils/instagramPosts';
import { INSTAGRAM_URL, INSTAGRAM_USER } from '../utils/contact';
import { InstagramIcon } from './BrandIcons';

/** Alto de reserva hasta que el embed informa el suyo. */
const FALLBACK_HEIGHT = 640;

/**
 * Publicaciones de Instagram embebidas en la landing.
 *
 * Dos cuidados que no son obvios:
 *
 * 1. Cada embed carga la página de Instagram dentro de un iframe y pesa
 *    cientos de KB, así que no se montan hasta que la sección está por
 *    entrar en pantalla.
 * 2. El alto del embed depende del formato del post (cuadrado, vertical,
 *    reel, carrusel). Con un alto fijo se recorta la foto. El propio iframe
 *    publica su altura real por postMessage, así que la escuchamos y la
 *    aplicamos, en lugar de cargar el embed.js de Instagram.
 */
const InstagramFeed = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const frameRefs = useRef<(HTMLIFrameElement | null)[]>([]);
    const [shouldLoad, setShouldLoad] = useState(false);
    const [heights, setHeights] = useState<Record<number, number>>({});

    // Carga diferida: recién cuando la sección se acerca a la pantalla.
    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;

        if (typeof IntersectionObserver === 'undefined') {
            setShouldLoad(true);
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    setShouldLoad(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '400px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Altura real de cada publicación, informada por el propio embed.
    useEffect(() => {
        if (!shouldLoad) return;

        const onMessage = (event: MessageEvent) => {
            if (!String(event.origin).endsWith('instagram.com')) return;

            let payload: { type?: string; details?: { height?: number } };
            try {
                payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            } catch {
                return;
            }

            const height = payload?.details?.height;
            if (payload?.type !== 'MEASURE' || typeof height !== 'number' || height <= 0) return;

            const index = frameRefs.current.findIndex(frame => frame && frame.contentWindow === event.source);
            if (index === -1) return;

            setHeights(prev => (prev[index] === height ? prev : { ...prev, [index]: height }));
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [shouldLoad]);

    const setFrameRef = useCallback(
        (index: number) => (el: HTMLIFrameElement | null) => {
            frameRefs.current[index] = el;
        },
        []
    );

    if (INSTAGRAM_POSTS.length === 0) return null;

    return (
        <section ref={sectionRef} className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
                    <div>
                        <span className="text-primary font-semibold uppercase tracking-[0.2em] text-xs mb-3 block">
                            Novedades
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Lo último del local</h2>
                    </div>
                    <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 h-12 px-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:border-primary hover:text-primary-dark dark:hover:text-primary transition-all self-start sm:self-auto flex-shrink-0"
                    >
                        <InstagramIcon className="w-5 h-5" />
                        @{INSTAGRAM_USER}
                    </a>
                </div>

                {/* En móvil, tres publicaciones apiladas son más de 2000px de scroll:
                    se recorren de costado con swipe. Desde sm vuelve a ser grilla. */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:items-start">
                    {INSTAGRAM_POSTS.map((code, i) => (
                        <div
                            key={code}
                            style={{ height: heights[i] ?? FALLBACK_HEIGHT }}
                            className="relative w-[85vw] max-w-[340px] flex-shrink-0 snap-center sm:w-auto sm:max-w-none rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-[height] duration-300"
                        >
                            {shouldLoad ? (
                                <iframe
                                    ref={setFrameRef(i)}
                                    src={`https://www.instagram.com/p/${code}/embed/`}
                                    title={`Publicación de Instagram de @${INSTAGRAM_USER}`}
                                    loading="lazy"
                                    scrolling="no"
                                    className="w-full h-full border-0"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 dark:text-slate-600 animate-pulse">
                                    <InstagramIcon className="w-8 h-8" />
                                    <span className="text-xs font-semibold uppercase tracking-widest">
                                        Publicación {i + 1}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {INSTAGRAM_POSTS.length > 1 && (
                    <p className="sm:hidden text-center text-xs text-slate-400 mt-4">
                        Deslizá para ver más →
                    </p>
                )}

                {/* Si el visitante tiene un bloqueador, los iframes quedan vacíos:
                    este enlace es la salida para llegar igual al perfil. */}
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-10">
                    ¿No ves las publicaciones?{' '}
                    <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary-dark dark:text-primary hover:underline"
                    >
                        Abrí nuestro Instagram
                    </a>
                </p>
            </div>
        </section>
    );
};

export default InstagramFeed;
