import { OWNER_PHONE } from '../utils/whatsappUtils';
import { useLocation } from 'react-router-dom';
import { WhatsAppIcon } from './BrandIcons';

const WhatsAppFAB = () => {
    const location = useLocation();
    // Fuera del panel y del checkout: ahí el botón flotante tapa los campos del formulario.
    const isHidden = location.pathname.startsWith('/admin') || location.pathname === '/cart';

    if (isHidden) return null;

    const handleClick = () => {
        const message = '¡Hola! Quisiera hacerles una consulta.';
        const url = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed bottom-24 right-4 z-[90] animate-in fade-in slide-in-from-bottom-8 duration-500">
            <button
                onClick={handleClick}
                aria-label="Contactarnos por WhatsApp"
                className="group relative flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white h-12 px-4 rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/40 active:scale-95 transition-all"
            >
                {/* Micro-animation ring */}
                <span className="absolute inset-0 rounded-full bg-white/20 scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div className="relative flex items-center justify-center">
                    <WhatsAppIcon />
                </div>

                <span className="hidden sm:inline text-sm font-bold tracking-tight whitespace-nowrap">
                    Contáctanos
                </span>

                {/* Counter-like visual if needed or just premium dot */}
                <span className="hidden sm:flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
            </button>
        </div>
    );
};

export default WhatsAppFAB;
