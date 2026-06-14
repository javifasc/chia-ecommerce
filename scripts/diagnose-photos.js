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

const FOTO_DIR = path.join(__dirname, '..', 'FOTO');

async function main() {
    console.log('=== Iniciando diagnóstico de fotos faltantes ===\n');

    // Obtener todos los productos de la DB
    const { data: products, error } = await supabase
        .from('products')
        .select('id, codigo, name, image');

    if (error) {
        console.error('Error al obtener productos:', error.message);
        process.exit(1);
    }

    console.log(`Total de productos en la base de datos: ${products.length}`);

    // Filtrar productos que no tienen foto real (tienen '', null o '/logo.png')
    const productsWithoutPhoto = products.filter(p => !p.image || p.image === '' || p.image === '/logo.png');
    console.log(`Productos sin foto asociados: ${productsWithoutPhoto.length}`);

    if (productsWithoutPhoto.length === 0) {
        console.log('¡Todos los productos tienen fotos asociadas!');
        return;
    }

    // Leer archivos locales en FOTO (mapear a minúsculas para comparación insensible)
    const localFiles = fs.readdirSync(FOTO_DIR);
    const localFilesMap = {}; // codigo -> nombre de archivo original
    localFiles.forEach(file => {
        const ext = path.extname(file);
        const code = path.basename(file, ext).trim().toLowerCase();
        localFilesMap[code] = file;
    });

    let countWithLocalPhoto = 0;
    let countWithoutLocalPhoto = 0;
    const matchWithTypoOrCase = [];
    const missingPhotosList = [];

    for (const p of productsWithoutPhoto) {
        if (!p.codigo) {
            missingPhotosList.push({ name: p.name, codigo: '(Sin código asignado)', reason: 'El producto no tiene código en la base de datos' });
            countWithoutLocalPhoto++;
            continue;
        }

        const codeLower = p.codigo.trim().toLowerCase();
        const matchedFilename = localFilesMap[codeLower];

        if (matchedFilename) {
            // Existe la foto localmente pero no está asociada en la DB
            countWithLocalPhoto++;
            matchWithTypoOrCase.push({
                codigoDb: p.codigo,
                name: p.name,
                fileName: matchedFilename
            });
        } else {
            // No existe la foto localmente
            countWithoutLocalPhoto++;
            missingPhotosList.push({
                codigoDb: p.codigo,
                name: p.name,
                reason: 'No se encontró ninguna foto con este código en la carpeta FOTO'
            });
        }
    }

    console.log(`\n--- ANÁLISIS ---`);
    console.log(`1. Productos sin foto que SÍ tienen archivo local disponible: ${countWithLocalPhoto}`);
    console.log(`   (Esto pasa si la foto se agregó después de ejecutar el script de carga o por diferencia de mayúsculas/minúsculas)`);
    console.log(`2. Productos sin foto que NO tienen archivo local en la carpeta FOTO: ${countWithoutLocalPhoto}`);

    if (matchWithTypoOrCase.length > 0) {
        console.log('\n=== Productos sin foto con archivo local disponible ===');
        matchWithTypoOrCase.forEach(item => {
            console.log(`- Código DB: [${item.codigoDb}] | Producto: ${item.name} | Archivo Local: ${item.fileName}`);
        });
    }

    if (missingPhotosList.length > 0) {
        console.log('\n=== Productos que no tienen foto en la carpeta FOTO ===');
        // Mostrar los primeros 30 para no saturar la consola
        missingPhotosList.slice(0, 30).forEach(item => {
            console.log(`- Código: [${item.codigoDb}] | Producto: ${item.name} | Motivo: ${item.reason}`);
        });
        if (missingPhotosList.length > 30) {
            console.log(`... y ${missingPhotosList.length - 30} productos más.`);
        }
    }
}

main().catch(err => {
    console.error('Error general del script:', err);
});
