import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR_FUENTES = path.join(RAIZ, 'marca/fuentes');
export const LIMITE_DE_PESO = 10 * 1024 * 1024;

export function escaparXml(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const decodificarNombre = (bruto, plataforma) =>
  (plataforma === 3 ? Buffer.from(bruto).swap16().toString('utf16le') : bruto.toString('latin1')).trim();

export function leerNombresDeFuente(ttf) {
  const sinTablaName = () => new Error('El archivo no tiene una tabla name legible.');
  if (ttf.length < 12) throw sinTablaName();
  const cantidadDeTablas = ttf.readUInt16BE(4);
  let inicioDeLaTabla = -1;
  for (let indice = 0; indice < cantidadDeTablas; indice++) {
    const registro = 12 + 16 * indice;
    if (registro + 16 > ttf.length) throw sinTablaName();
    if (ttf.toString('latin1', registro, registro + 4) === 'name') inicioDeLaTabla = ttf.readUInt32BE(registro + 8);
  }
  if (inicioDeLaTabla < 0 || inicioDeLaTabla + 6 > ttf.length) throw sinTablaName();

  const cantidadDeNombres = ttf.readUInt16BE(inicioDeLaTabla + 2);
  const inicioDeCadenas = inicioDeLaTabla + ttf.readUInt16BE(inicioDeLaTabla + 4);
  const nombres = new Map();
  for (let indice = 0; indice < cantidadDeNombres; indice++) {
    const registro = inicioDeLaTabla + 6 + 12 * indice;
    if (registro + 12 > ttf.length) throw sinTablaName();
    const plataforma = ttf.readUInt16BE(registro);
    const id = ttf.readUInt16BE(registro + 6);
    const largo = ttf.readUInt16BE(registro + 8);
    const inicio = inicioDeCadenas + ttf.readUInt16BE(registro + 10);
    if ((plataforma !== 3 && plataforma !== 1) || inicio + largo > ttf.length) continue;
    if (plataforma === 3 || !nombres.has(id)) nombres.set(id, decodificarNombre(ttf.subarray(inicio, inicio + largo), plataforma));
  }

  const familia = nombres.get(16) ?? nombres.get(1);
  if (!familia) throw new Error('La tabla name no declara la familia de la fuente.');
  return { familia, subfamilia: nombres.get(17) ?? nombres.get(2) ?? '' };
}

function verificarFuente(dirFuentes, { archivo, familia, estilo }) {
  const ruta = path.join(dirFuentes, archivo);
  let declarados;
  try {
    declarados = leerNombresDeFuente(readFileSync(ruta));
  } catch (error) {
    throw new Error(
      `Falta la fuente convertida en ${ruta} o no es legible (${error.message}).\nConvierte los .woff de node_modules/@fontsource/{sora,inter}/files/ a .ttf con fontTools y guárdalos en marca/fuentes/ antes de correr este script.`,
    );
  }
  if (declarados.familia !== familia && declarados.familia !== `${familia} ${estilo}`) {
    throw new Error(`${archivo} declara la familia "${declarados.familia}" y se esperaba "${familia}".`);
  }
  if (!new RegExp(`\\b${estilo}\\b`).test(`${declarados.familia} ${declarados.subfamilia}`)) {
    throw new Error(
      `${archivo} declara el estilo "${declarados.familia} ${declarados.subfamilia}" y se esperaba "${estilo}".`,
    );
  }
}

export function configurarFuentes(dirFuentes = DIR_FUENTES, requeridas = []) {
  for (const requerida of requeridas) verificarFuente(dirFuentes, requerida);
  const cache = mkdtempSync(path.join(tmpdir(), 'fontconfig-marca-'));
  const configuracion = path.join(cache, 'fonts.conf');
  writeFileSync(
    configuracion,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${dirFuentes}</dir>
  <cachedir>${cache}</cachedir>
</fontconfig>
`,
  );
  process.env.FONTCONFIG_FILE = configuracion;
  process.env.FONTCONFIG_PATH = '';
  return cache;
}

const pixelesCrudos = async (png) => (await sharp(png).ensureAlpha().raw().toBuffer()).subarray();

const hayPixelDistinto = (datos, esDistinto) => {
  for (let inicio = 0; inicio < datos.length; inicio += 4) {
    if ([0, 1, 2, 3].some((canal) => esDistinto(inicio, canal))) return true;
  }
  return false;
};

export async function verificarRenderNoVacio(png, fondo = [0, 0, 0, 0]) {
  const datos = await pixelesCrudos(png);
  const referencia = Array.isArray(fondo) ? null : await pixelesCrudos(fondo);
  const distinto = referencia
    ? (inicio, canal) => datos[inicio + canal] !== referencia[inicio + canal]
    : (inicio, canal) => datos[inicio + canal] !== fondo[canal];
  if (!hayPixelDistinto(datos, distinto)) throw new Error('El render quedó vacío: ningún píxel difiere del fondo.');
}

const verificarRenderNoUniforme = async (png) => {
  const datos = await pixelesCrudos(png);
  if (!hayPixelDistinto(datos, (inicio, canal) => datos[inicio + canal] !== datos[canal])) {
    throw new Error('El render quedó vacío: todos los píxeles son iguales.');
  }
};

export async function verificarSoraAplicada(renderMuestra) {
  const [conSora, conFallback] = await Promise.all([renderMuestra('Sora SemiBold'), renderMuestra('serif')]);
  if (conSora.equals(conFallback)) {
    throw new Error(
      'La fuente Sora no se aplicó: el render con "Sora SemiBold" es idéntico al de "serif".\nRevisa que marca/fuentes/*.ttf existan y que fonts.conf apunte a esa carpeta.',
    );
  }
  await verificarRenderNoVacio(conSora);
}

async function validarRaster({ ruta, buffer, fondo, ancho, alto }) {
  try {
    if (buffer.length >= LIMITE_DE_PESO) {
      throw new Error(`pesa ${(buffer.length / 1024 / 1024).toFixed(2)} MB, supera el límite de 10 MB.`);
    }
    const { width, height } = await sharp(buffer).metadata();
    if (width !== ancho || height !== alto) throw new Error(`tiene dimensiones ${width}x${height}, se esperaba ${ancho}x${alto}.`);
    await verificarRenderNoVacio(buffer, fondo);
    await verificarRenderNoUniforme(buffer);
  } catch (error) {
    throw new Error(`${ruta} ${error.message}`);
  }
}

export async function validarYEscribir(rasters, salida) {
  for (const raster of rasters) await validarRaster(raster);
  for (const { ruta, buffer } of rasters) {
    const destino = path.join(salida, ruta);
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, buffer);
  }
}

export function esModuloDeEntrada(urlDelModulo) {
  return Boolean(process.argv[1]) && urlDelModulo === pathToFileURL(path.resolve(process.argv[1])).href;
}
