import { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { CATEGORIES_MAP } from '../utils/categoryMapping';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fileToBase64 } from '../utils/imageUtils';
import { useNotifications } from '../context/NotificationContext';

const ProductUpload = () => {
    const { state, addProduct, updateProduct } = useStore();
    const { showToast } = useNotifications();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fullDescription, setFullDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Almacén Seco');
    const [subcategory, setSubcategory] = useState('GENERAL');
    const [stock, setStock] = useState('');
    const [unit, setUnit] = useState('Bolsa 1kg');
    const [badges, setBadges] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [isFractional, setIsFractional] = useState(false);
    const [fractionalStep, setFractionalStep] = useState('0.25');
    const [image, setImage] = useState('https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=1000&auto=format&fit=crop');

    useEffect(() => {
        if (isEditMode) {
            const product = state.products.find(p => p.id === id);
            if (product) {
                setName(product.name);
                setDescription(product.description);
                setFullDescription(product.fullDescription || '');
                setPrice(product.price.toString());
                setCategory(product.category);
                setSubcategory(product.subcategory || '');
                setStock(product.availableStock.toString());
                setUnit(product.unit);
                setBadges(product.badges?.join(', ') || '');
                setCalories(product.nutritionalInfo?.calories || '');
                setProtein(product.nutritionalInfo?.protein || '');
                setCarbs(product.nutritionalInfo?.carbs || '');
                setFat(product.nutritionalInfo?.fat || '');
                setIsFractional(product.isFractional || false);
                setFractionalStep(product.fractionalStep?.toString() || '0.25');
                setImage(product.image);
            }
        }
    }, [isEditMode, id, state.products]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setImage(base64);
            } catch (error) {
                console.error('Error uploading image:', error);
                showToast('No se pudo cargar la imagen. Inténtalo de nuevo.', 'error');
            }
        }
    };

    const handleSaveProduct = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!name || !price || !stock) {
            showToast('Por favor, completa los campos obligatorios (Nombre, Precio y Stock).', 'warning');
            return;
        }

        const newProduct: Product = {
            id: isEditMode ? id! : '', // ID will be handled by Supabase if empty
            name,
            description,
            fullDescription,
            price: parseFloat(price),
            category,
            subcategory,
            image,
            unit,
            availableStock: parseFloat(stock.toString().replace(',', '.')),
            reservedStock: isEditMode ? (state.products.find(p => p.id === id)?.reservedStock || 0) : 0,
            isFractional,
            fractionalStep: isFractional ? parseFloat(fractionalStep.toString().replace(',', '.')) : 1,
            badges: badges ? badges.split(',').map(b => b.trim()) : undefined,
            nutritionalInfo: (calories || protein || carbs || fat) ? {
                calories: calories || undefined,
                protein: protein || undefined,
                carbs: carbs || undefined,
                fat: fat || undefined
            } : undefined
        };

        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await updateProduct(newProduct);
                showToast('Producto actualizado con éxito.', 'success');
            } else {
                const { id: _, ...productPayload } = newProduct;
                await addProduct(productPayload);
                showToast('Producto añadido con éxito.', 'success');
            }
            navigate('/admin/inventory');
        } catch (error: any) {
            console.error('Error al guardar producto:', error);
            const errorMessage = error?.message || error?.details || 'Error deconocido';
            showToast(`Error al guardar: ${errorMessage}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased selection:bg-primary selection:text-primary-content min-h-screen pb-24 max-w-md mx-auto shadow-2xl relative italic-none">
            <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 pt-12">
                <Link to="/admin" className="flex size-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-slate-800 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <h1 className="text-lg font-bold tracking-tight">{isEditMode ? 'Editar Producto' : 'Nuevo Producto'}</h1>
                <button
                    onClick={handleSaveProduct}
                    disabled={isSubmitting}
                    className={`text-sm font-bold px-2 py-1 ${isSubmitting ? 'text-slate-400' : 'text-primary'}`}
                >
                    {isSubmitting ? '...' : 'Guardar'}
                </button>
            </header>

            <main className="px-5 py-6 space-y-6 text-left">
                <section>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative h-48 w-full rounded-2xl border-2 border-dashed border-primary/40 bg-white dark:bg-surface-dark overflow-hidden transition-all hover:border-primary cursor-pointer"
                    >
                        <img src={image} alt="Preview" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 text-white backdrop-blur-[2px]">
                            <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                            <p className="text-xs font-bold uppercase tracking-widest">Cambiar Imagen</p>
                        </div>
                    </div>
                </section>

                <form onSubmit={handleSaveProduct} className="space-y-5">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Nombre del Artículo *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="ej., Aguacates Orgánicos"
                            type="text"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-left">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">Categoría</label>
                            <select
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                    setSubcategory(CATEGORIES_MAP[e.target.value][0]);
                                }}
                                className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none appearance-none"
                            >
                                {Object.keys(CATEGORIES_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 text-left">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 pl-1">Subcategoría</label>
                            <select
                                value={subcategory}
                                onChange={(e) => setSubcategory(e.target.value)}
                                className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none appearance-none"
                            >
                                {CATEGORIES_MAP[category]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Descripción Corta</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full resize-none rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Resumen rápido para el listado..."
                            rows={2}
                        ></textarea>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Descripción Larga (Premium)</label>
                        <textarea
                            value={fullDescription}
                            onChange={(e) => setFullDescription(e.target.value)}
                            className="w-full resize-none rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Detalles extendidos, beneficios, ritual de uso..."
                            rows={4}
                        ></textarea>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Sellos / Atributos (Separados por coma)</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {['Sin TACC', 'Vegano', 'Sin Azúcar', 'Orgánico', 'Keto'].map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                        const currentTags = badges ? badges.split(',').map(b => b.trim()) : [];
                                        if (!currentTags.includes(tag)) {
                                            setBadges(badges ? `${badges}, ${tag}` : tag);
                                        }
                                    }}
                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-lg hover:bg-primary/20 hover:text-primary-dark transition-colors"
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                        <input
                            value={badges}
                            onChange={(e) => setBadges(e.target.value)}
                            className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="ej: Vegano, Orgánico, Sin TACC"
                            type="text"
                        />
                    </div>

                    <div className="space-y-4 pt-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Información Nutricional</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Calorías</label>
                                <input
                                    value={calories}
                                    onChange={(e) => setCalories(e.target.value)}
                                    className="w-full rounded-lg border-none bg-white dark:bg-surface-dark py-3 px-3 text-xs shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="ej: 120 kcal"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Proteína</label>
                                <input
                                    value={protein}
                                    onChange={(e) => setProtein(e.target.value)}
                                    className="w-full rounded-lg border-none bg-white dark:bg-surface-dark py-3 px-3 text-xs shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="ej: 24g"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Carbohidratos</label>
                                <input
                                    value={carbs}
                                    onChange={(e) => setCarbs(e.target.value)}
                                    className="w-full rounded-lg border-none bg-white dark:bg-surface-dark py-3 px-3 text-xs shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="ej: 5g"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400">Grasas</label>
                                <input
                                    value={fat}
                                    onChange={(e) => setFat(e.target.value)}
                                    className="w-full rounded-lg border-none bg-white dark:bg-surface-dark py-3 px-3 text-xs shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="ej: 2g"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Precio de Venta *</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 pl-8 pr-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="0.00"
                                    type="number"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Stock Inicial {isFractional ? '(en kg)' : '(en unidades)'} *</label>
                            <input
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                placeholder={isFractional ? "ej: 10.5" : "ej: 50"}
                                type="number"
                                step={isFractional ? "0.001" : "1"}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Unidad de Medida</label>
                        <input
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="ej., Bolsa 1kg, Botella 500ml"
                            type="text"
                        />
                    </div>

                    {/* Fractional Product Config */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between p-1">
                            <div className="space-y-0.5">
                                <label className="text-sm font-bold text-slate-900 dark:text-white">¿Producto fraccionado?</label>
                                <p className="text-[10px] text-slate-400 font-medium">Permite vender por peso (ej: cada 250g)</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFractional(!isFractional)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isFractional ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                                    }`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isFractional ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {isFractional && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">Incremento en GRAMOS</label>
                                <div className="relative">
                                    <input
                                        value={fractionalStep}
                                        onChange={(e) => setFractionalStep(e.target.value)}
                                        className="w-full rounded-xl border-none bg-white dark:bg-surface-dark py-4 px-4 text-sm shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="ej: 250"
                                        type="number"
                                    />
                                    <p className="mt-1 text-[10px] text-primary font-bold italic">
                                        Tip: Poné 250 si querés que el cliente sume de a 250 gramos por click. El stock se descontará en consecuencia (0.250kg).
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </main>

            <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-white/90 dark:bg-background-dark/90 px-5 pb-10 pt-4 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 z-40">
                <button
                    onClick={handleSaveProduct}
                    disabled={isSubmitting}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-all shadow-lg
                        ${isSubmitting
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-primary text-slate-900 shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]'}`}
                >
                    {isSubmitting ? (
                        <>
                            <span>Guardando...</span>
                            <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                        </>
                    ) : (
                        <>
                            <span>{isEditMode ? 'Actualizar Producto' : 'Publicar Producto'}</span>
                            <span className="material-symbols-outlined text-lg font-bold">check</span>
                        </>
                    )}
                </button>
            </div>

            {/* Modal removed as we now use fixed categories */}
        </div>
    );
};

export default ProductUpload;
