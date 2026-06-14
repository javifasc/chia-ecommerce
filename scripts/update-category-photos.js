import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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
// Carpeta con las fotos de mayor calidad de Upscayl
const UPSCAYL_DIR = "C:\\Users\\javie\\.gemini\\antigravity\\playground\\astral-trifid\\chia\\FOTO\\Foto mayor calidad\\upscayl_png_upscayl-lite-4x_4x";

const cleanString = (str) => {
    if (!str) return '';
    return str.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
              .replace(/\s+/g, '') // Quitar espacios
              .replace(/&/g, 'y') // Normalizar & a y
              .trim();
};

const cleanCode = (code) => {
    if (!code) return '';
    return code.replace(/\s+/g, '').toLowerCase().trim();
};

async function main() {
    console.log('=== Iniciando Actualización de Fotos de Calidad para Chocolatería ===\n');
    console.log(`Carpeta de origen: ${UPSCAYL_DIR}`);

    if (!fs.existsSync(UPSCAYL_DIR)) {
        console.error(`Error: No existe la carpeta ${UPSCAYL_DIR}`);
        process.exit(1);
    }

    // 2. Obtener productos de la DB
    const { data: products, error } = await supabase
        .from('products')
        .select('id, codigo, name, category, image');

    if (error) {
        console.error('Error al obtener productos:', error.message);
        process.exit(1);
    }

    // Mostrar las categorías únicas en la DB para auditoría
    const categories = [...new Set(products.map(p => p.category))];
    console.log('Categorías encontradas en la base de datos:', categories);

    // Filtrar productos de la categoría "chocolateria & dulces" (normalizado)
    const targetCategoryClean = cleanString('chocolateria & dulces');
    const targetProducts = products.filter(p => cleanString(p.category) === targetCategoryClean);

    console.log(`\nProductos encontrados en la categoría objetivo ("Chocolatería & Dulces"): ${targetProducts.length}`);

    if (targetProducts.length === 0) {
        console.log('No se encontraron productos en esa categoría. Verifica si el nombre coincide.');
        return;
    }

    // 3. Mapear archivos de Upscayl
    const localFiles = fs.readdirSync(UPSCAYL_DIR);
    const localFilesMap = {}; // codigo_limpio -> nombre de archivo original
    localFiles.forEach(file => {
        const ext = path.extname(file);
        const code = path.basename(file, ext).trim();
        localFilesMap[cleanCode(code)] = file;
    });

    console.log(`Imágenes de alta calidad encontradas en la carpeta: ${localFiles.length}`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const p of targetProducts) {
        if (!p.codigo) {
            console.log(`[OMITIDO] ${p.name}: No tiene código de barras asignado.`);
            skipCount++;
            continue;
        }

        const codeClean = cleanCode(p.codigo);
        const matchedFilename = localFilesMap[codeClean];

        if (!matchedFilename) {
            console.log(`[PENDIENTE] ${p.codigo} -> ${p.name}: No se encontró imagen de alta calidad en la carpeta.`);
            skipCount++;
            continue;
        }

        const filePath = path.join(UPSCAYL_DIR, matchedFilename);

        try {
            console.log(`[SUBIENDO] ${p.codigo} -> ${p.name} (Archivo: ${matchedFilename})...`);

            // A. Subir la imagen de alta calidad a Supabase Storage
            const fileBuffer = fs.readFileSync(filePath);
            const storagePath = `products/${matchedFilename}`;
            
            // Upscayl suele exportar como PNG, pero validamos el tipo
            const ext = path.extname(matchedFilename).toLowerCase();
            let mimeType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            if (ext === '.webp') mimeType = 'image/webp';

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, fileBuffer, {
                    contentType: mimeType,
                    upsert: true // Sobrescribe la foto de baja calidad anterior
                });

            if (uploadError) {
                console.error(`   Error al subir a storage: ${uploadError.message}`);
                errorCount++;
                continue;
            }

            // B. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(storagePath);

            // C. Actualizar base de datos
            const { error: updateError } = await supabase
                .from('products')
                .update({ image: publicUrl })
                .eq('id', p.id);

            if (updateError) {
                console.error(`   Error al actualizar producto en DB: ${updateError.message}`);
                errorCount++;
                continue;
            }

            console.log(`   [VINCULADO OK] Nueva imagen asociada exitosamente.`);
            successCount++;

        } catch (err) {
            console.error(`   Error inesperado en ${p.codigo}: ${err.message}`);
            errorCount++;
        }
    }

    console.log('\n=== Resumen de Actualización de Calidad ===');
    console.log(`Imágenes actualizadas con éxito: ${successCount}`);
    console.log(`Omitidas/No encontradas: ${skipCount}`);
    console.log(`Errores: ${errorCount}`);
}

main().catch(err => {
    console.error('Error general del script:', err);
});
