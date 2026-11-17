/**
 * Prueba las credenciales SMTP de Brevo sin pasar por Supabase.
 *
 * Sirve para partir el problema en dos: si este script manda el correo, Brevo
 * esta bien y la falla es de Supabase; si falla aca, es de Brevo y no tiene
 * sentido seguir tocando el dashboard de Supabase.
 *
 * Uso:
 *   1. Agregar al .env:
 *        BREVO_SMTP_LOGIN=b93d84001@smtp-brevo.com
 *        BREVO_SMTP_KEY=<la SMTP key>
 *        BREVO_SENDER=chiaalmacennaturalrada@gmail.com
 *   2. node scripts/test-brevo-smtp.js destino@ejemplo.com
 *
 * Se habla SMTP crudo sobre sockets del runtime para no sumar dependencias
 * (nodemailer) a un proyecto que no las necesita en produccion.
 */
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';

const HOST = 'smtp-relay.brevo.com';
const PORT = 587;

// El .env se parsea a mano, igual que en los demas scripts del repo.
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
}

const LOGIN = env.BREVO_SMTP_LOGIN;
const KEY = env.BREVO_SMTP_KEY;
const SENDER = env.BREVO_SENDER;
const TO = process.argv[2];

if (!LOGIN || !KEY || !SENDER) {
    console.error('Faltan BREVO_SMTP_LOGIN, BREVO_SMTP_KEY o BREVO_SENDER en el .env');
    process.exit(1);
}
if (!TO) {
    console.error('Uso: node scripts/test-brevo-smtp.js destino@ejemplo.com');
    process.exit(1);
}

/** Lee una respuesta SMTP completa: las multilinea traen "250-" hasta el "250 " final. */
function readReply(socket) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const onData = chunk => {
            buffer += chunk.toString();
            if (/^\d{3} [^\n]*\r?\n$/m.test(buffer.split(/(?<=\n)/).pop() || '')) {
                socket.removeListener('data', onData);
                socket.removeListener('error', onError);
                resolve(buffer.trim());
            }
        };
        const onError = err => {
            socket.removeListener('data', onData);
            reject(err);
        };
        socket.on('data', onData);
        socket.once('error', onError);
    });
}

async function send(socket, command, hide = false) {
    console.log('  >', hide ? '<oculto>' : command);
    socket.write(command + '\r\n');
    const reply = await readReply(socket);
    console.log('  <', reply);
    return reply;
}

function expect(reply, code, step) {
    if (!reply.startsWith(code)) {
        console.error(`\nFALLO en ${step}: se esperaba ${code} y llego:\n${reply}`);
        process.exit(1);
    }
}

const b64 = s => Buffer.from(s, 'utf8').toString('base64');

console.log(`Conectando a ${HOST}:${PORT} ...\n`);

const plain = net.createConnection({ host: HOST, port: PORT });
plain.setEncoding('utf8');

plain.once('connect', async () => {
    try {
        expect(await readReply(plain), '220', 'saludo inicial');
        expect(await send(plain, 'EHLO chia-test'), '250', 'EHLO');
        expect(await send(plain, 'STARTTLS'), '220', 'STARTTLS');

        const secure = tls.connect({ socket: plain, servername: HOST });
        secure.setEncoding('utf8');
        await new Promise((res, rej) => {
            secure.once('secureConnect', res);
            secure.once('error', rej);
        });
        console.log('\nTLS establecido.\n');

        expect(await send(secure, 'EHLO chia-test'), '250', 'EHLO sobre TLS');

        console.log('\nAutenticando ...');
        expect(await send(secure, 'AUTH LOGIN'), '334', 'AUTH LOGIN');
        expect(await send(secure, b64(LOGIN), true), '334', 'usuario');
        const auth = await send(secure, b64(KEY), true);
        if (!auth.startsWith('235')) {
            console.error('\nLas credenciales fueron RECHAZADAS por Brevo.');
            console.error('Revisar que Username sea el Login xxx@smtp-brevo.com y que');
            console.error('Password sea la SMTP key, no la contrasena de la cuenta.');
            console.error(`\nRespuesta: ${auth}`);
            process.exit(1);
        }
        console.log('\nCredenciales VALIDAS.\n');

        console.log('Enviando correo de prueba ...');
        expect(await send(secure, `MAIL FROM:<${SENDER}>`), '250', 'MAIL FROM');

        const rcpt = await send(secure, `RCPT TO:<${TO}>`);
        if (!rcpt.startsWith('250')) {
            console.error('\nBrevo RECHAZO el destinatario.');
            console.error('Suele pasar cuando la cuenta todavia no esta activada para');
            console.error('enviar, o cuando el remitente no esta verificado en Brevo.');
            console.error(`\nRespuesta: ${rcpt}`);
            process.exit(1);
        }

        expect(await send(secure, 'DATA'), '354', 'DATA');
        const message = [
            `From: #CHIA <${SENDER}>`,
            `To: <${TO}>`,
            'Subject: Prueba de SMTP de #CHIA',
            'Content-Type: text/plain; charset=utf-8',
            '',
            'Si estas leyendo esto, Brevo esta enviando correctamente.',
            'El problema, entonces, esta del lado de Supabase.',
            '.',
        ].join('\r\n');
        const sent = await send(secure, message);
        expect(sent, '250', 'envio');

        await send(secure, 'QUIT');
        console.log('\nCORREO ACEPTADO POR BREVO. Revisar la casilla (y spam).');
        process.exit(0);
    } catch (err) {
        console.error('\nError de conexion:', err.message);
        process.exit(1);
    }
});

plain.once('error', err => {
    console.error('No se pudo conectar:', err.message);
    process.exit(1);
});
