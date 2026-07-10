import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar variables de entorno
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[key] = value.trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

const BUCKET_NAME = 'product-images';
const FOTO_DIR = path.join(__dirname, '..', 'FOTO');

const cleanCode = (code) => {
    if (!code) return '';
    return code.replace(/\s+/g, '').toLowerCase().trim();
};

async function main() {
    console.log('=== Generando Reporte en Excel para el Cliente ===\n');

    // 2. Obtener productos de la DB
    const { data: products, error } = await supabase
        .from('products')
        .select('id, codigo, name, category, subcategory, price, image')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error al obtener productos:', error.message);
        process.exit(1);
    }

    // 3. Contar y clasificar
    const totalProducts = products.length;
    let productsWithPhotoCount = 0;
    let productsWithoutPhotoCount = 0;

    const detailRows = [[
        "Código", 
        "Nombre de Producto", 
        "Categoría", 
        "Subcategoría", 
        "Precio ($)", 
        "Estado de Foto", 
        "Detalle / Acción Requerida"
    ]];

    products.forEach(p => {
        const code = p.codigo || '';
        const hasPhoto = p.image && p.image !== '' && p.image !== '/logo.png';
        
        let status = "";
        let detail = "";
        
        if (hasPhoto) {
            status = "FOTO OK";
            detail = "Imagen cargada y asociada correctamente.";
            productsWithPhotoCount++;
        } else {
            status = "FALTA FOTO";
            productsWithoutPhotoCount++;
            if (!code) {
                detail = "El producto no tiene un código asignado en la base de datos. Se debe asignar un código primero.";
            } else {
                detail = `No se encontró la foto en la carpeta. Debe agregar la imagen como '${code}.jpg' o '${code}.webp'`;
            }
        }

        detailRows.push([
            code,
            p.name,
            p.category || 'General',
            p.subcategory || 'General',
            Number(p.price),
            status,
            detail
        ]);
    });

    // 4. Crear Libro de Excel
    const wb = XLSX.utils.book_new();

    // Hoja 1: Portada y Explicación
    const summaryData = [
        ["#CHIA - REPORTE DE ESTADO DE FOTOS DE PRODUCTOS"],
        ["Fecha de Generación:", new Date().toLocaleDateString('es-AR')],
        [],
        ["1. EXPLICACIÓN GENERAL PARA EL CLIENTE"],
        ["¿Por qué hay productos cargados en la web que no tienen foto?"],
        ["Los productos de la tienda se cargaron de forma masiva a la base de datos a partir del listado de inventario (Excel). Para que cada producto muestre su foto, debe existir una imagen en la carpeta local que coincida exactamente con su código único (ej: 'ACE01.jpg' para el producto con código 'ACE01')."],
        ["Aquellos productos que no tienen su foto correspondiente en la carpeta local muestran de forma provisional el logotipo de #CHIA para asegurar una navegación limpia y profesional para el cliente, evitando enlaces rotos o imágenes vacías."],
        [],
        ["2. RESUMEN DEL CATÁLOGO"],
        ["Total de productos en base de datos:", totalProducts],
        ["Productos con foto cargada con éxito:", productsWithPhotoCount, `(${Math.round((productsWithPhotoCount / totalProducts) * 100)}%)`],
        ["Productos sin foto (Faltan cargar):", productsWithoutPhotoCount, `(${Math.round((productsWithoutPhotoCount / totalProducts) * 100)}%)`],
        [],
        ["3. INSTRUCCIONES PARA COMPLETAR LAS FOTOS FALTANTES"],
        ["1. Consulte la pestaña 'Detalle de Productos' para identificar cuáles dicen 'FALTA FOTO'."],
        ["2. Busque o tome la foto del artículo faltante."],
        ["3. Guarde la foto con el nombre del código exacto del producto (ejemplo: si el código es 'ALF11', guarde la foto como 'ALF11.jpg' o 'ALF11.webp')."],
        ["4. Inserte las fotos en la carpeta 'FOTO' y el administrador ejecutará la carga automática. La web se actualizará al instante."]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Ajustar anchos de columna de la hoja de resumen
    wsSummary['!cols'] = [
        { wch: 35 },
        { wch: 15 },
        { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen y Explicación");

    // Hoja 2: Detalle de Productos
    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

    // Ajustar anchos de columna de la hoja de detalle
    wsDetail['!cols'] = [
        { wch: 12 }, // Código
        { wch: 55 }, // Nombre
        { wch: 20 }, // Categoría
        { wch: 25 }, // Subcategoría
        { wch: 12 }, // Precio
        { wch: 15 }, // Estado
        { wch: 70 }  // Detalle
    ];

    XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle de Productos");

    // 5. Guardar Archivo Excel
    const outputFilename = 'Reporte_Fotos_Productos.xlsx';
    const outputPath = path.join(__dirname, '..', outputFilename);
    XLSX.writeFile(wb, outputPath);

    console.log(`\n¡Reporte de Excel generado con éxito!`);
    console.log(`Ubicación: ${outputPath}`);
}

main().catch(err => {
    console.error('Error general del script:', err);
});
