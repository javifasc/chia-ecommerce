import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar variables de entorno desde .env manualmente
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.error('No se encontró el archivo .env en la raíz del proyecto.');
    process.exit(1);
}

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

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env.');
    process.exit(1);
}

// 2. Inicializar cliente de Supabase con Service Role Key (evita RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false
    }
});

const BUCKET_NAME = 'product-images';
const FOTO_DIR = path.join(__dirname, '..', 'FOTO');

async function main() {
    console.log('=== Iniciando carga automática de fotos ===');
    console.log(`Carpeta de fotos: ${FOTO_DIR}`);

    if (!fs.existsSync(FOTO_DIR)) {
        console.error(`Error: No existe la carpeta ${FOTO_DIR}`);
        process.exit(1);
    }

    // 3. Verificar o crear el bucket en Supabase Storage
    console.log(`Verificando bucket "${BUCKET_NAME}"...`);
    const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
    if (listBucketsError) {
        console.error('Error listando buckets:', listBucketsError.message);
        process.exit(1);
    }

    let bucket = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucket) {
        console.log(`El bucket "${BUCKET_NAME}" no existe. Creándolo...`);
        const { error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
        if (createBucketError) {
            console.error('Error al crear el bucket:', createBucketError.message);
            process.exit(1);
        }
        console.log(`Bucket "${BUCKET_NAME}" creado como público.`);
    } else {
        console.log(`Bucket "${BUCKET_NAME}" verificado.`);
    }

    // 4. Leer archivos de la carpeta FOTO
    const files = fs.readdirSync(FOTO_DIR).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    console.log(`Se encontraron ${files.length} imágenes para procesar.`);

    // Argumento para modo prueba (ej: node upload-photos.js --test)
    const isTest = process.argv.includes('--test');
    if (isTest) {
        console.log('--- MODO DE PRUEBA: Solo se procesarán las primeras 5 fotos ---');
    }

    const filesToProcess = isTest ? files.slice(0, 5) : files;

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of filesToProcess) {
        const ext = path.extname(file);
        const code = path.basename(file, ext).trim();
        const filePath = path.join(FOTO_DIR, file);

        try {
            // A. Buscar si el producto existe en la DB
            const { data: product, error: findError } = await supabase
                .from('products')
                .select('id, name')
                .eq('codigo', code)
                .maybeSingle();

            if (findError) {
                console.error(`[${code}] Error al buscar en DB: ${findError.message}`);
                errorCount++;
                continue;
            }

            if (!product) {
                console.log(`[${code}] omitido: No existe ningún producto con este código en la base de datos.`);
                skipCount++;
                continue;
            }

            // B. Subir archivo a Supabase Storage
            const fileBuffer = fs.readFileSync(filePath);
            const storagePath = `products/${file}`;
            let mimeType = 'image/jpeg';
            if (ext.toLowerCase() === '.png') mimeType = 'image/png';
            if (ext.toLowerCase() === '.webp') mimeType = 'image/webp';

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, fileBuffer, {
                    contentType: mimeType,
                    upsert: true
                });

            if (uploadError) {
                console.error(`[${code}] Error al subir foto: ${uploadError.message}`);
                errorCount++;
                continue;
            }

            // C. Obtener la URL pública de la foto
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(storagePath);

            // D. Actualizar columna 'image' del producto en la DB
            const { error: updateError } = await supabase
                .from('products')
                .update({ image: publicUrl })
                .eq('id', product.id);

            if (updateError) {
                console.error(`[${code}] Error al actualizar producto: ${updateError.message}`);
                errorCount++;
                continue;
            }

            console.log(`[OK] ${code} -> ${product.name} (Foto cargada exitosamente)`);
            successCount++;

        } catch (err) {
            console.error(`[${code}] Error inesperado: ${err.message}`);
            errorCount++;
        }
    }

    console.log('\n=== Resumen de ejecución ===');
    console.log(`Procesadas exitosamente: ${successCount}`);
    console.log(`Omitidas (sin producto en DB): ${skipCount}`);
    console.log(`Errores: ${errorCount}`);
    if (isTest && files.length > 5) {
        console.log(`Quedan ${files.length - 5} imágenes sin procesar. Ejecuta el script sin '--test' para procesar todo.`);
    }
}

main().catch(err => {
    console.error('Error general del script:', err);
});
