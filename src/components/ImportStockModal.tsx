import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNotifications } from '../context/NotificationContext';
import { parseStockXLSX, ParseResult } from '../utils/xlsxParser';
import { analyzeImport } from '../utils/importAnalysis';
import { supabaseService, ImportRecord } from '../lib/supabaseService';

type Props = { onClose: () => void };

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const money = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

/**
 * Importar el stock desde el Excel del sistema de caja.
 * Antes de aplicar muestra qué va a cambiar y avisa si parece un archivo
 * equivocado; después se puede deshacer la última importación.
 */
const ImportStockModal = ({ onClose }: Props) => {
    const { state, importStockFile, undoLastImport } = useStore();
    const { showToast, showConfirm } = useNotifications();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [importData, setImportData] = useState<ParseResult | null>(null);
    const [fileName, setFileName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [result, setResult] = useState<{ updated: number; created: number } | null>(null);
    const [confirmedWarnings, setConfirmedWarnings] = useState(false);
    const [lastImport, setLastImport] = useState<ImportRecord | null>(null);

    const busy = isImporting || isUndoing;

    const loadLastImport = useCallback(async () => {
        try {
            setLastImport(await supabaseService.getLastImport());
        } catch (error) {
            console.error('No se pudo leer la última importación:', error);
        }
    }, []);

    useEffect(() => { loadLastImport(); }, [loadLastImport]);

    const analysis = useMemo(
        () => (importData && importData.missingColumns.length === 0 ? analyzeImport(importData.rows, state.products) : null),
        // Se calcula al elegir el archivo; no hace falta recalcular con cada cambio de stock.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [importData]
    );

    const blockingError = importData
        ? importData.missingColumns.length > 0
            ? `Al archivo le falta: ${importData.missingColumns.join(', ')}. No parece el Excel de stock del sistema de caja.`
            : importData.rows.length === 0
                ? 'El archivo no tiene productos con código.'
                : null
        : null;

    const needsConfirmation = !!analysis && analysis.warnings.length > 0;
    const canImport = !!importData && !blockingError && !busy && (!needsConfirmation || confirmedWarnings);

    const handleFileSelected = async (file: File) => {
        try {
            const parsed = await parseStockXLSX(file);
            setImportData(parsed);
            setFileName(file.name);
            setResult(null);
            setConfirmedWarnings(false);
        } catch (err: any) {
            showToast(err.message || 'Error al leer el archivo', 'error');
        }
    };

    const resetFile = () => {
        setImportData(null);
        setFileName('');
        setConfirmedWarnings(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImport = async () => {
        if (!importData || !canImport) return;
        setIsImporting(true);
        try {
            const res = await importStockFile(importData.rows);
            setResult(res);
            showToast(`Importación completa: ${res.updated} actualizados, ${res.created} nuevos.`, 'success');
            await loadLastImport();
        } catch (err: any) {
            console.error('Error al importar:', err);
            // Es todo o nada: si falla, la tienda queda como estaba.
            showToast(`No se importó nada: ${err?.message || 'error desconocido'}`, 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleUndo = () => {
        if (!lastImport) return;
        showConfirm({
            title: '¿Deshacer la importación?',
            message: `Vuelven el stock, los precios y los nombres a como estaban antes de la importación del ${formatDate(lastImport.createdAt)}, y se borran los ${lastImport.created} productos que creó. Los pedidos que entraron después se respetan.`,
            confirmText: 'Deshacer',
            isDestructive: true,
            onConfirm: async () => {
                setIsUndoing(true);
                try {
                    const res = await undoLastImport();
                    const extra = res.hidden > 0 ? ` ${res.hidden} nuevos ya tenían pedidos: quedaron sin stock en vez de borrarse.` : '';
                    showToast(`Importación deshecha: ${res.restored} productos restaurados, ${res.deleted} borrados.${extra}`, 'success');
                    setResult(null);
                    resetFile();
                    await loadLastImport();
                } catch (err: any) {
                    console.error('Error al deshacer:', err);
                    showToast(err?.message || 'No se pudo deshacer la importación', 'error');
                } finally {
                    setIsUndoing(false);
                }
            },
        });
    };

    const close = () => { if (!busy) onClose(); };

    const stat = (value: number, label: string, tone: 'blue' | 'green' | 'red' | 'orange') => {
        const tones = {
            blue: 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400',
            green: 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400',
            red: 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400',
            orange: 'bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400',
        };
        return (
            <div className={`rounded-2xl p-3 text-center ${tones[tone]}`}>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] font-bold uppercase mt-0.5 leading-tight">{label}</p>
            </div>
        );
    };

    const lastImportCard = lastImport && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Última importación: {formatDate(lastImport.createdAt)}</p>
                <p className="text-[11px] text-slate-400">
                    {lastImport.updated} actualizados, {lastImport.created} nuevos
                    {lastImport.undoneAt && ` · deshecha el ${formatDate(lastImport.undoneAt)}`}
                </p>
            </div>
            {!lastImport.undoneAt && (
                <button
                    type="button"
                    onClick={handleUndo}
                    disabled={busy}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">undo</span>
                    {isUndoing ? 'Deshaciendo…' : 'Deshacer'}
                </button>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

            <div className="relative w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center">
                            <span aria-hidden="true" className="material-symbols-outlined text-primary">upload_file</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-left">Importar Stock</h2>
                            <p className="text-[11px] text-slate-400 text-left">Desde archivo fiscal (.xlsx)</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        disabled={busy}
                        aria-label="Cerrar"
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-50"
                    >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {!importData && !result && (
                        <>
                            <div
                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelected(f); }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${isDragging
                                    ? 'border-primary bg-primary/5 scale-[1.02]'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5'}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
                                />
                                <span aria-hidden="true" className="material-symbols-outlined text-5xl text-primary/60 mb-3 block">cloud_upload</span>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    {isDragging ? '¡Soltar archivo aquí!' : 'Arrastrá o tocá para seleccionar'}
                                </p>
                                <p className="text-[11px] text-slate-400">Formatos: .xlsx, .xls, .csv</p>
                            </div>
                            {lastImportCard}
                        </>
                    )}

                    {/* Resumen antes de importar */}
                    {importData && !result && (
                        <div className="space-y-4 text-left">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{fileName}</p>
                                    <p className="text-[11px] text-slate-400">{importData.rows.length} productos en el archivo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetFile}
                                    disabled={busy}
                                    className="shrink-0 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                >
                                    <span aria-hidden="true" className="material-symbols-outlined text-sm">refresh</span>
                                    Otro archivo
                                </button>
                            </div>

                            {blockingError && (
                                <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4">
                                    <p className="text-sm font-bold text-red-600 dark:text-red-400">No se puede importar este archivo</p>
                                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{blockingError}</p>
                                </div>
                            )}

                            {analysis && (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {stat(analysis.matched, 'Se actualizan', 'blue')}
                                        {stat(analysis.created, 'Nuevos', 'green')}
                                        {stat(analysis.leavingStore, 'Salen de la tienda', analysis.leavingStore > 0 ? 'orange' : 'blue')}
                                        {stat(analysis.bigPriceChanges, 'Precio cambia +50%', analysis.bigPriceChanges > 0 ? 'orange' : 'blue')}
                                    </div>

                                    {analysis.createdVisible > 0 && (
                                        <p className="text-[11px] text-slate-500">
                                            {analysis.createdVisible} de los nuevos tienen precio y stock: van a aparecer en la tienda sin foto.
                                        </p>
                                    )}
                                    {analysis.priceExamples.length > 0 && (
                                        <div className="text-[11px] text-slate-500 space-y-0.5">
                                            {analysis.priceExamples.map(ex => (
                                                <p key={ex.name} className="truncate">{ex.name}: {money(ex.from)} → {money(ex.to)}</p>
                                            ))}
                                        </div>
                                    )}
                                    {importData.mergedCodes.length > 0 && (
                                        <p className="text-[11px] text-slate-500">
                                            {importData.mergedCodes.length} códigos aparecían en más de una fila: se sumó su stock.
                                        </p>
                                    )}
                                    {importData.errors.length > 0 && (
                                        <p className="text-[11px] text-slate-500">{importData.errors.length} filas sin código se omiten.</p>
                                    )}

                                    {analysis.warnings.length > 0 && (
                                        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4 space-y-2">
                                            <p className="text-sm font-bold text-red-600 dark:text-red-400">Revisá antes de importar: puede ser un Excel equivocado</p>
                                            <ul className="text-xs text-red-600/90 dark:text-red-400/90 list-disc pl-4 space-y-1">
                                                {analysis.warnings.map(w => <li key={w}>{w}</li>)}
                                            </ul>
                                            <label className="flex items-start gap-2 pt-1 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={confirmedWarnings}
                                                    onChange={(e) => setConfirmedWarnings(e.target.checked)}
                                                    className="mt-0.5 rounded text-primary focus:ring-primary"
                                                />
                                                Revisé el archivo y quiero importarlo igual
                                            </label>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px]">Código</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-widest text-[11px]">Nombre</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-widest text-[11px]">Stock</th>
                                                    <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-widest text-[11px]">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importData.rows.slice(0, 10).map(row => (
                                                    <tr key={row.codigo} className="border-t border-slate-100 dark:border-slate-800">
                                                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{row.codigo}</td>
                                                        <td className="px-3 py-2 truncate max-w-[180px]">{row.nombre}</td>
                                                        <td className="px-3 py-2 text-right font-bold">{row.stock}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-primary-dark dark:text-primary">{row.unitPrice === null ? '—' : money(row.unitPrice)}</td>
                                                    </tr>
                                                ))}
                                                {importData.rows.length > 10 && (
                                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                                        <td colSpan={4} className="px-3 py-2 text-center text-slate-400 text-[11px]">
                                                            … y {importData.rows.length - 10} productos más
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Resultado */}
                    {result && (
                        <div className="space-y-4 text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                    <span aria-hidden="true" className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                                </div>
                                <div>
                                    <p className="text-lg font-bold">¡Importación completa!</p>
                                    <p className="text-[11px] text-slate-400">Si algo no quedó bien, podés deshacerla.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {stat(result.updated, 'Actualizados', 'blue')}
                                {stat(result.created, 'Nuevos', 'green')}
                            </div>
                            {lastImportCard}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    {!result ? (
                        <>
                            <button
                                type="button"
                                onClick={close}
                                disabled={busy}
                                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            {importData && (
                                <button
                                    type="button"
                                    onClick={handleImport}
                                    disabled={!canImport}
                                    className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                    <span aria-hidden="true" className={`material-symbols-outlined text-lg ${isImporting ? 'animate-spin' : ''}`}>
                                        {isImporting ? 'progress_activity' : 'cloud_upload'}
                                    </span>
                                    {isImporting ? 'Importando…' : 'Aplicar cambios'}
                                </button>
                            )}
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={close}
                            disabled={busy}
                            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-primary text-slate-900 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportStockModal;
