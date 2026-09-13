import { OWNER_PHONE } from './whatsappUtils';

/**
 * Datos de contacto del local, en un solo lugar para que no se dupliquen
 * ni queden desincronizados entre la landing, el perfil y los mensajes.
 */

export const INSTAGRAM_USER = 'chia_almacennatural_rada';
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USER}/`;

// Enlace exacto de la ficha del local en Google Maps (sin los parámetros de
// sesión que agrega el navegador al copiarla).
export const MAPS_URL =
    'https://www.google.com/maps/place/%23Ch%C3%ADa+%22Almac%C3%A9n+Natural%22/@-45.9342277,-67.5629453,17z/data=!3m1!4b1!4m6!3m5!1s0xbde5ac5c44032279:0x3e927e30a90e1388!8m2!3d-45.9342277!4d-67.5629453!16s%2Fg%2F11g7ztvgb4';

export const WHATSAPP_URL = `https://wa.me/${OWNER_PHONE}`;

export const CITY = 'Rada Tilly, Chubut';
