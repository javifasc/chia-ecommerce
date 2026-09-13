import { useState, useRef } from 'react';
import { useStore, HeroPromo, FeaturedPromo, InstagramPromo } from '../context/StoreContext';
import { Link, useNavigate } from 'react-router-dom';
import { fileToBase64 } from '../utils/imageUtils';
import { useNotifications } from '../context/NotificationContext';
import {
    DEFAULT_INSTAGRAM_POSTS,
    MAX_INSTAGRAM_POSTS,
    describeInstagramLinkProblem,
    parseInstagramPostCode,
} from '../utils/instagramPosts';
import { InstagramIcon } from '../components/BrandIcons';

const AdminPromotions = () => {
    const { state, updatePromotions } = useStore();
    const { showToast } = useNotifications();
    const navigate = useNavigate();

    const heroFileInputRef = useRef<HTMLInputElement>(null);
    const featFileInputRef = useRef<HTMLInputElement>(null);

    // Hero Promo State
    const [heroTag, setHeroTag] = useState(state.promotions.hero.tag);
    const [heroTitle, setHeroTitle] = useState(state.promotions.hero.title);
    const [heroDescription, setHeroDescription] = useState(state.promotions.hero.description);
    const [heroImage, setHeroImage] = useState(state.promotions.hero.image);
    const [heroButton, setHeroButton] = useState(state.promotions.hero.buttonText);

    // Featured Promo State
    const [featSectionTitle, setFeatSectionTitle] = useState(state.promotions.featured.sectionTitle);
    const [featItemTitle, setFeatItemTitle] = useState(state.promotions.featured.itemTitle);
    const [featItemDesc, setFeatItemDesc] = useState(state.promotions.featured.itemDescription);
    const [featItemImage, setFeatItemImage] = useState(state.promotions.featured.itemImage);
    const [featPrice, setFeatPrice] = useState(state.promotions.featured.price.toString());
    const [featOldPrice, setFeatOldPrice] = useState(state.promotions.featured.oldPrice.toString());

    // Instagram: se guardan los códigos, pero el dueño pega el link completo.
    // Mantenemos el texto tal cual lo pegó para no borrarle lo que escribió
    // si todavía no es un link válido.
    const savedInstagram = state.promotions.instagram?.posts ?? [];
    const [instagramLinks, setInstagramLinks] = useState<string[]>(
        (savedInstagram.length > 0 ? savedInstagram : DEFAULT_INSTAGRAM_POSTS)
            .map(code => `https://www.instagram.com/p/${code}/`)
    );

    const instagramCodes = instagramLinks.map(parseInstagramPostCode);
    const validInstagramCodes = instagramCodes.filter((c): c is string => c !== null);
    const hasInvalidLink = instagramLinks.some((link, i) => link.trim() !== '' && instagramCodes[i] === null);

    const updateInstagramLink = (index: number, value: string) => {
        setInstagramLinks(links => links.map((link, i) => (i === index ? value : link)));
    };

    const addInstagramLink = () => {
        setInstagramLinks(links => (links.length >= MAX_INSTAGRAM_POSTS ? links : [...links, '']));
    };

    const removeInstagramLink = (index: number) => {
        setInstagramLinks(links => links.filter((_, i) => i !== index));
    };

    const handleSavePromos = async () => {
        const hero: HeroPromo = {
            tag: heroTag,
            title: heroTitle,
            description: heroDescription,
            image: heroImage,
            buttonText: heroButton
        };

        const featured: FeaturedPromo = {
            sectionTitle: featSectionTitle,
            itemTitle: featItemTitle,
            itemDescription: featItemDesc,
            itemImage: featItemImage,
            price: parseFloat(featPrice),
            oldPrice: parseFloat(featOldPrice)
        };

        if (hasInvalidLink) {
            showToast('Hay un link de Instagram que no se entiende. Revisalo o borralo.', 'warning');
            return;
        }

        const instagram: InstagramPromo = { posts: validInstagramCodes };

        try {
            await updatePromotions(hero, featured, instagram);
            showToast('Promociones actualizadas con éxito.', 'success');
            navigate('/admin');
        } catch (error) {
            console.error('Error updating promotions:', error);
            showToast('Error al actualizar las promociones.', 'error');
        }
    };

    const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setHeroImage(base64);
            } catch (error) {
                showToast('Error al cargar la imagen del banner.', 'error');
            }
        }
    };

    const handleFeatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setFeatItemImage(base64);
            } catch (error) {
                showToast('Error al cargar la imagen de la oferta.', 'error');
            }
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen pb-24 max-w-md mx-auto shadow-2xl relative not-italic">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] border-b border-slate-200 dark:border-slate-800">
                <Link to="/admin" className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-slate-800 active:scale-95 transition-transform">
                    <span aria-hidden="true" className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <h1 className="text-lg font-bold tracking-tight">Editar Portada</h1>
                <button onClick={handleSavePromos} className="text-sm font-bold text-primary px-2 py-1">Guardar</button>
            </header>

            <main className="px-5 py-6 space-y-10 text-left">
                {/* Hero Section Edit */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary">view_carousel</span>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Banner Principal (NOVEDAD)</h2>
                    </div>

                    {/* LIVE PREVIEW: HERO */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Previsualización en Vivo</p>
                        <div className="relative w-full rounded-2xl overflow-hidden aspect-[16/9] shadow-md border border-slate-100 dark:border-slate-800">
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
                            <img alt="Hero Preview" className="w-full h-full object-cover" src={heroImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1074&auto=format&fit=crop"}
                                onError={(e) => (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1074&auto=format&fit=crop"}
                            />
                            <div className="absolute bottom-0 left-0 p-4 z-20 w-3/4 text-left">
                                <span className="inline-block px-2 py-0.5 bg-primary text-slate-900 text-[11px] font-bold rounded-md mb-1">{heroTag || 'Etiqueta'}</span>
                                <h2 className="text-lg font-bold text-white mb-1 leading-tight">{heroTitle || 'Título del Banner'}</h2>
                                <p className="text-white/90 text-xs mb-3 font-medium line-clamp-2">{heroDescription || 'Descripción de la promoción...'}</p>
                                <div className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm inline-flex items-center gap-1.5 cursor-default">
                                    {heroButton || 'Botón'}
                                    <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_forward</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Imagen del Banner</label>
                                <button
                                    onClick={() => heroFileInputRef.current?.click()}
                                    className="text-[11px] font-bold text-primary uppercase"
                                >
                                    Subir Archivo
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={heroFileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleHeroFileChange}
                            />
                            <input value={heroImage} onChange={(e) => setHeroImage(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="URL o Base64..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Etiqueta</label>
                                <input value={heroTag} onChange={(e) => setHeroTag(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Novedad" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Texto Botón</label>
                                <input value={heroButton} onChange={(e) => setHeroButton(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Comprar" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Título</label>
                            <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Título del banner..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Descripción</label>
                            <textarea value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} rows={2} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Descripción corta..."></textarea>
                        </div>
                    </div>
                </section>

                {/* Featured Section Edit */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span aria-hidden="true" className="material-symbols-outlined text-primary">local_offer</span>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Oferta Destacada</h2>
                    </div>

                    {/* LIVE PREVIEW: FEATURED */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Previsualización en Vivo ({featSectionTitle || 'Sección'})</p>
                        <div className="bg-sage-light/30 dark:bg-slate-800/50 rounded-2xl p-3 flex items-center gap-3 text-left border border-slate-100 dark:border-slate-800">
                            <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-xl flex-shrink-0 overflow-hidden p-1.5 shadow-sm">
                                <img alt="Featured Preview" className="w-full h-full object-contain" src={featItemImage || "https://images.unsplash.com/photo-1544306094-e2dca9f57142?q=80&w=600&auto=format&fit=crop"}
                                    onError={(e) => (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544306094-e2dca9f57142?q=80&w=600&auto=format&fit=crop"}
                                />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{featItemTitle || 'Nombre del Producto'}</h4>
                                <p className="text-[11px] text-slate-600 dark:text-white/70 mt-0.5 mb-1.5 line-clamp-1">{featItemDesc || 'Descripción corta...'}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-primary-dark dark:text-primary font-bold text-sm">${parseFloat(featPrice || '0').toFixed(2)}</span>
                                    {parseFloat(featOldPrice || '0') > 0 && (
                                        <span className="text-slate-400 text-[11px] line-through font-medium">${parseFloat(featOldPrice || '0').toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-slate-900 shadow-sm cursor-default">
                                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Título de la Sección</label>
                            <input value={featSectionTitle} onChange={(e) => setFeatSectionTitle(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Ofertas Frescas" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Imagen del Item</label>
                                <button
                                    onClick={() => featFileInputRef.current?.click()}
                                    className="text-[11px] font-bold text-primary uppercase"
                                >
                                    Subir Archivo
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={featFileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFeatFileChange}
                            />
                            <input value={featItemImage} onChange={(e) => setFeatItemImage(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="URL o Base64..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Nombre del Producto</label>
                            <input value={featItemTitle} onChange={(e) => setFeatItemTitle(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Nombre..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">Descripción Corta</label>
                            <input value={featItemDesc} onChange={(e) => setFeatItemDesc(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Pack de jugos naturales" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Precio Promo</label>
                                <input type="number" value={featPrice} onChange={(e) => setFeatPrice(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase">Precio Original</label>
                                <input type="number" value={featOldPrice} onChange={(e) => setFeatOldPrice(e.target.value)} className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Instagram */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <InstagramIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                            Publicaciones de Instagram
                        </h2>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5">
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Se muestran en la página de inicio, en la sección{' '}
                            <span className="font-bold">"Lo último del local"</span>. Abrí la publicación
                            en Instagram, tocá <span className="font-bold">Compartir → Copiar enlace</span> y
                            pegalo acá. Sirven posts y reels.
                        </p>
                    </div>

                    <div className="space-y-3 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        {instagramLinks.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4">
                                No hay publicaciones. La sección no se va a mostrar.
                            </p>
                        )}

                        {instagramLinks.map((link, i) => {
                            const code = instagramCodes[i];
                            const isEmpty = link.trim() === '';
                            const isInvalid = !isEmpty && code === null;

                            return (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase">
                                            Publicación {i + 1}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeInstagramLink(i)}
                                            aria-label={`Quitar publicación ${i + 1}`}
                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                            Quitar
                                        </button>
                                    </div>
                                    <input
                                        value={link}
                                        onChange={(e) => updateInstagramLink(i, e.target.value)}
                                        placeholder="https://www.instagram.com/p/..."
                                        className={`w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-3 px-3 text-xs outline-none focus:ring-2 transition-shadow ${isInvalid ? 'ring-2 ring-red-400 focus:ring-red-400' : 'focus:ring-primary'
                                            }`}
                                    />
                                    {isInvalid ? (
                                        <p className="text-[11px] font-semibold text-red-500 flex items-start gap-1 leading-relaxed">
                                            <span aria-hidden="true" className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '13px' }}>error</span>
                                            {describeInstagramLinkProblem(link)}
                                        </p>
                                    ) : code ? (
                                        <p className="text-[11px] font-semibold text-primary-dark dark:text-primary flex items-center gap-1">
                                            <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                                            Listo ({code})
                                        </p>
                                    ) : null}
                                </div>
                            );
                        })}

                        {instagramLinks.length < MAX_INSTAGRAM_POSTS && (
                            <button
                                type="button"
                                onClick={addInstagramLink}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary-dark dark:hover:text-primary transition-colors"
                            >
                                <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                                Agregar publicación
                            </button>
                        )}

                        <p className="text-[11px] text-slate-400 pt-1">
                            {validInstagramCodes.length} de {MAX_INSTAGRAM_POSTS} publicaciones. Se muestran en este orden.
                        </p>
                    </div>
                </section>

                <div className="pt-4">
                    <button
                        onClick={handleSavePromos}
                        className="w-full bg-primary text-slate-900 font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                    >
                        Actualizar Todo
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AdminPromotions;
