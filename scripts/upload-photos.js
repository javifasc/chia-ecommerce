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

// Función para limpiar códigos (quitar espacios y a minúsculas)
const cleanCode = (code) => {
    if (!code) return '';
    return code.replace(/\s+/g, '').toLowerCase().trim();
};

async function main() {
    console.log('=== Iniciando carga optimizada de fotos ===');
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

    // 4. Obtener todos los productos de la base de datos (Optimización: 1 sola consulta)
    console.log('Obteniendo catálogo de productos desde Supabase...');
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, codigo, name');

    if (fetchError) {
        console.error('Error al obtener productos:', fetchError.message);
        process.exit(1);
    }

    // Mapear productos por su código limpio
    const productMap = {};
    products.forEach(p => {
        if (p.codigo) {
            const clean = cleanCode(p.codigo);
            productMap[clean] = p;
        }
    });

    // 5. Leer archivos de la carpeta FOTO
    const files = fs.readdirSync(FOTO_DIR).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    console.log(`Se encontraron ${files.length} imágenes locales para procesar.`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
        const ext = path.extname(file);
        const fileCode = path.basename(file, ext).trim();
        const cleanFileCode = cleanCode(fileCode);
        const filePath = path.join(FOTO_DIR, file);

        const product = productMap[cleanFileCode];

        if (!product) {
            // console.log(`[${fileCode}] omitido: No existe ningún producto con este código en la base de datos.`);
            skipCount++;
            continue;
        }

        try {
            // A. Subir archivo a Supabase Storage
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
                console.error(`[${fileCode}] Error al subir foto: ${uploadError.message}`);
                errorCount++;
                continue;
            }

            // B. Obtener la URL pública de la foto
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(storagePath);

            // C. Actualizar columna 'image' del producto en la DB
            const { error: updateError } = await supabase
                .from('products')
                .update({ image: publicUrl })
                .eq('id', product.id);

            if (updateError) {
                console.error(`[${fileCode}] Error al actualizar producto en DB: ${updateError.message}`);
                errorCount++;
                continue;
            }

            console.log(`[OK] ${fileCode} (DB: ${product.codigo}) -> ${product.name}`);
            successCount++;

        } catch (err) {
            console.error(`[${fileCode}] Error inesperado: ${err.message}`);
            errorCount++;
        }
    }

    console.log('\n=== Resumen de ejecución ===');
    console.log(`Procesadas exitosamente: ${successCount}`);
    console.log(`Omitidas (sin producto en DB): ${skipCount}`);
    console.log(`Errores: ${errorCount}`);
}

main().catch(err => {
    console.error('Error general del script:', err);
});
