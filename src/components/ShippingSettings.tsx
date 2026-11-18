import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNotifications } from '../context/NotificationContext';

const THRESHOLD_KEY = '_FREE_THRESHOLD_';

/**
 * Costos de envío por zona y monto para envío gratis, editables por el dueño.
 * Se guarda todo junto con un botón: antes el monto gratis se guardaba en cada
 * tecla (4, 40, 400…) y los costos por zona solo se podían cambiar en la base.
 */
const ShippingSettings = () => {
    const { state, updateDeliveryFees } = useStore();
    const { showToast } = useNotifications();

    // Lo que figura guardado en la base, como texto para los campos.
    const saved = useMemo(() => {
        const values: Record<string, string> = {};
        Object.entries(state.deliveryFees).forEach(([zone, fee]) => { values[zone] = String(fee); });
        values[THRESHOLD_KEY] = String(state.freeShippingThreshold);
        return values;
    }, [state.deliveryFees, state.freeShippingThreshold]);

    const [draft, setDraft] = useState<Record<string, string>>(saved);
    const [isSaving, setIsSaving] = useState(false);

    const isDirty = Object.keys(saved).some(key => draft[key] !== saved[key]);

    // Si no hay cambios sin guardar, seguimos lo que llega de la base.
    useEffect(() => {
        if (!isDirty) setDraft(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saved]);

    const zones = Object.keys(state.deliveryFees);

    const handleSave = async () => {
        const fees: Record<string, number> = {};
        for (const key of Object.keys(saved)) {
            const raw = (draft[key] ?? '').trim();
            const value = Number(raw);
            if (raw === '' || !Number.isFinite(value) || value < 0) {
                const label = key === THRESHOLD_KEY ? 'el monto para envío gratis' : key;
                showToast(`Revisá el valor de ${label}: tiene que ser un número, 0 o más.`, 'warning');
                return;
            }
            if (draft[key] !== saved[key]) fees[key] = Math.round(value);
        }

        setIsSaving(true);
        try {
            await updateDeliveryFees(fees);
            showToast('Envíos actualizados', 'success');
        } catch (error: any) {
            console.error('Error al guardar envíos:', error);
            showToast(error?.message || 'No se pudieron guardar los envíos', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = 'w-28 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm font-bold text-right focus:ring-2 focus:ring-primary outline-none transition-all';

    const field = (key: string, label: string) => (
        <label key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <span className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">$</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    className={inputClass}
                />
            </span>
        </label>
    );

    return (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-left">
            <div className="flex items-center gap-2 mb-4">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">local_shipping</span>
                <h3 className="font-bold text-lg">Configuración de Envíos</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Cambiá los costos de envío por zona y desde qué monto el envío a Rada Tilly es gratis. Los cambios se aplican a los pedidos nuevos.</p>

            <div className="space-y-3 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Costo por zona</p>
                {zones.map(zone => field(zone, zone))}
            </div>

            <div className="p-4 bg-primary/10 dark:bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-primary-dark dark:text-primary">Envío gratis a Rada Tilly</p>
                {field(THRESHOLD_KEY, 'Gratis a partir de')}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Con 0 no hay envío gratis.
                </p>
            </div>

            <div className="flex gap-2 mt-4">
                {isDirty && (
                    <button
                        type="button"
                        onClick={() => setDraft(saved)}
                        disabled={isSaving}
                        className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold"
                    >
                        Descartar
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex-1 py-3 rounded-xl bg-primary text-slate-900 text-sm font-bold shadow-md shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
                >
                    {isSaving ? 'Guardando…' : isDirty ? 'Guardar cambios' : 'Sin cambios'}
                </button>
            </div>
        </div>
    );
};

export default ShippingSettings;
