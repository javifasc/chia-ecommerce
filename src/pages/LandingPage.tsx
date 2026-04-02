import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    const values = [
        {
            icon: 'eco',
            title: '100% Orgánico',
            desc: 'Productos seleccionados con amor, libres de agroquímicos y respetuosos con la tierra.'
        },
        {
            icon: 'verified',
            title: 'Sin TACC',
            desc: 'Gran variedad de opciones seguras y deliciosas para celíacos y sensibles al gluten.'
        },
        {
            icon: 'set_meal',
            title: 'Plant Based',
            desc: 'Fomentamos una alimentación consciente con alternativas vegetales para cada comida.'
        },
        {
            icon: 'local_shipping',
            title: 'Local & Fresco',
            desc: 'Apoyamos a productores de la zona para garantizar frescura y calidad superior.'
        }
    ];

    return (
        <div className="bg-white dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display selection:bg-primary/30 antialiased">

            {/* Navigation Header */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-background-dark/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="CHiA Logo" className="h-12 w-auto" />
                        <span className="text-xl font-black tracking-tighter hidden sm:block">#CHiA</span>
                    </div>
                    <Link
                        to="/shop"
                        className="bg-primary text-slate-900 px-6 py-2.5 rounded-full font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        Tienda Online
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/assets/landing/hero.png"
                        alt="Hero background"
                        className="w-full h-full object-cover opacity-20 dark:opacity-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-background-dark dark:to-background-dark" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                    <div className="max-w-3xl">
                        <motion.span
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-block px-4 py-1.5 bg-primary/10 text-primary-dark dark:text-primary text-xs font-black uppercase tracking-[0.3em] rounded-full mb-6"
                        >
                            Almacén Natural • Rada Tilly
                        </motion.span>
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.9] mb-8"
                        >
                            Nutrición real para un <span className="text-primary italic">bienestar</span> consciente.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed max-w-2xl"
                        >
                            En CHiA seleccionamos cada producto pensando en tu salud. Somos el refugio de quienes buscan alimentarse con propósito, calidad y respeto por el cuerpo.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <Link
                                to="/shop"
                                className="h-16 px-10 bg-primary text-slate-900 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Ingresar a la Tienda
                                <span className="material-symbols-outlined font-black">arrow_forward</span>
                            </Link>
                            <a
                                href="#filosofia"
                                className="h-16 px-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm"
                            >
                                Nuestra Filosofía
                            </a>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Values / Grid Section */}
            <section id="filosofia" className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight">Lo que nos mueve</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            No solo vendemos comida; promovemos un estilo de vida. CHiA nació de la necesidad de encontrar en Rada Tilly un espacio donde lo saludable sea simple, variado y delicioso.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((v, i) => (
                            <motion.div
                                key={v.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-primary-dark dark:text-primary text-3xl font-black">{v.icon}</span>
                                </div>
                                <h3 className="text-xl font-black mb-3">{v.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{v.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="py-24 sm:py-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        <div className="w-full lg:w-1/2 relative">
                            <div className="aspect-[4/5] rounded-[48px] overflow-hidden shadow-2xl relative z-10">
                                <img
                                    src="/assets/landing/values_bg.png"
                                    alt="Health lifestyle"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-0" />
                            <div className="absolute -top-10 -left-10 w-64 h-64 bg-soft-orange/10 rounded-full blur-3xl -z-0" />
                        </div>
                        <div className="w-full lg:w-1/2">
                            <span className="text-primary font-black uppercase tracking-[0.2em] text-xs mb-4 block">Nuestra Historia</span>
                            <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight leading-[1]">Más que un almacén, una <span className="text-primary italic">comunidad</span> saludable.</h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6">
                                CHiA Almacén Natural surgió como un proyecto familiar dedicado a acercar la alimentación consciente a cada hogar. Creemos fervientemente que lo que ponemos en nuestro plato define nuestra energía, nuestro humor y nuestro futuro.
                            </p>
                            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-10">
                                Hoy somos el punto de referencia en Rada Tilly para quienes buscan algo especial: desde granos a granel hasta los snacks más innovadores, siempre con la etiqueta clara y la sonrisa dispuesta.
                            </p>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <span className="block text-3xl font-black text-primary">+1000</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Productos</span>
                                </div>
                                <div className="w-px h-10 bg-slate-100 dark:bg-slate-700" />
                                <div className="text-center">
                                    <span className="block text-3xl font-black text-primary">Rada Tilly</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chubut</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-slate-900 rounded-[56px] p-8 sm:p-20 relative overflow-hidden text-center">
                        <div className="absolute inset-0 opacity-20">
                            <img src="/assets/landing/hero.png" alt="Overlay" className="w-full h-full object-cover" />
                        </div>
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-4xl sm:text-6xl text-white font-black mb-8 tracking-tight">¿List@ para cambiar tu forma de comer?</h2>
                            <p className="text-white/60 text-lg sm:text-xl font-medium mb-12">
                                Explora nuestro catálogo online y retira tu pedido en el local o recíbelo en la puerta de tu casa.
                            </p>
                            <Link
                                to="/shop"
                                className="inline-flex h-20 px-12 bg-primary text-slate-900 rounded-3xl font-black text-xl items-center justify-center gap-3 shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
                            >
                                Comenzar Pedido
                                <span className="material-symbols-outlined font-black">shopping_bag</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Info Bar / Footer */}
            <footer className="py-12 border-t border-slate-100 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-8">
                    <div className="text-center sm:text-left">
                        <h4 className="font-black text-lg mb-1">#CHiA Almacén Natural</h4>
                        <p className="text-sm text-slate-400">Rada Tilly, Chubut. Patagonia Argentina.</p>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary/20 hover:text-primary transition-all">
                            <span className="material-symbols-outlined">alternate_email</span>
                        </a>
                        <a href="#" className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary/20 hover:text-primary transition-all">
                            <span className="material-symbols-outlined">share</span>
                        </a>
                        <a href="#" className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary/20 hover:text-primary transition-all">
                            <span className="material-symbols-outlined">room</span>
                        </a>
                    </div>
                </div>
                <div className="mt-12 text-center text-[10px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-widest">
                    &copy; 2024 CHiA Almacén Natural. Todos los derechos reservados.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
