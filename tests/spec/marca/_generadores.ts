import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { raiz } from './_marca';

export const SCRIPT_ML = path.join(raiz, 'scripts/generar-marca-ml.mjs');
export const SCRIPT_REDES = path.join(raiz, 'scripts/generar-marca-redes.mjs');

const DIR_FUENTES_REPO = path.join(raiz, 'marca/fuentes');
const SORA_SEMIBOLD = 'Sora-SemiBold.ttf';
const SORA_BOLD = 'Sora-Bold.ttf';
const INTER = 'Inter-Regular.ttf';

export const FUENTES_ML = [SORA_SEMIBOLD, INTER];
export const FUENTES_REDES = [SORA_SEMIBOLD, SORA_BOLD, INTER];

export const directorioTemporal = (prefijo: string): string => mkdtempSync(path.join(tmpdir(), `${prefijo}-`));

export const fuentesVacias = (): string => directorioTemporal('fuentes-vacias');

export const fuentesConArchivosVacios = (nombres: string[]): string => {
  const directorio = directorioTemporal('fuentes-archivos-vacios');
  for (const nombre of nombres) writeFileSync(path.join(directorio, nombre), '');
  return directorio;
};

export const fuentesSinSora = (nombres: string[]): string => {
  const directorio = directorioTemporal('fuentes-sin-sora');
  for (const nombre of nombres) {
    if (nombre === INTER) copyFileSync(path.join(DIR_FUENTES_REPO, INTER), path.join(directorio, nombre));
    else writeFileSync(path.join(directorio, nombre), '');
  }
  return directorio;
};

export const fuentesDelRepoCon = (sustituciones: Record<string, Buffer>): string => {
  const directorio = directorioTemporal('fuentes-sustituidas');
  for (const nombre of [SORA_SEMIBOLD, SORA_BOLD, INTER]) {
    if (nombre in sustituciones) writeFileSync(path.join(directorio, nombre), sustituciones[nombre]);
    else copyFileSync(path.join(DIR_FUENTES_REPO, nombre), path.join(directorio, nombre));
  }
  return directorio;
};

export const fuenteDelRepo = (nombre: string): Buffer => readFileSync(path.join(DIR_FUENTES_REPO, nombre));

export const fuentesConNombres = (archivos: Record<string, Buffer>): string => {
  const directorio = directorioTemporal('fuentes-con-nombres');
  for (const [nombre, contenido] of Object.entries(archivos)) writeFileSync(path.join(directorio, nombre), contenido);
  return directorio;
};

export interface RegistroDeNombre {
  plataforma: 1 | 3;
  id: number;
  texto: string;
}

export const ttfConNombres = (registros: RegistroDeNombre[]): Buffer => {
  const cadenas = registros.map(({ plataforma, texto }) =>
    plataforma === 3 ? Buffer.from(texto, 'utf16le').swap16() : Buffer.from(texto, 'latin1'),
  );
  const inicioDeCadenas = 6 + 12 * registros.length;
  const tabla = Buffer.alloc(inicioDeCadenas);
  tabla.writeUInt16BE(registros.length, 2);
  tabla.writeUInt16BE(inicioDeCadenas, 4);
  let desplazamiento = 0;
  registros.forEach(({ plataforma, id }, indice) => {
    const inicio = 6 + 12 * indice;
    tabla.writeUInt16BE(plataforma, inicio);
    tabla.writeUInt16BE(plataforma === 3 ? 1 : 0, inicio + 2);
    tabla.writeUInt16BE(plataforma === 3 ? 0x409 : 0, inicio + 4);
    tabla.writeUInt16BE(id, inicio + 6);
    tabla.writeUInt16BE(cadenas[indice].length, inicio + 8);
    tabla.writeUInt16BE(desplazamiento, inicio + 10);
    desplazamiento += cadenas[indice].length;
  });
  const cabecera = Buffer.alloc(28);
  cabecera.writeUInt32BE(0x00010000, 0);
  cabecera.writeUInt16BE(1, 4);
  cabecera.write('name', 12, 'latin1');
  cabecera.writeUInt32BE(28, 20);
  cabecera.writeUInt32BE(tabla.length + desplazamiento, 24);
  return Buffer.concat([cabecera, tabla, ...cadenas]);
};

export interface OpcionesDeMain {
  dirFuentes?: string;
  site?: unknown;
}

export const correrMain = (script: string, salida: string, { dirFuentes, site }: OpcionesDeMain = {}) =>
  spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const { main } = await import(${JSON.stringify(pathToFileURL(script).href)});` +
        `await main({ salida: process.env.SALIDA` +
        `, ...(process.env.FUENTES ? { dirFuentes: process.env.FUENTES } : {})` +
        `, ...(process.env.SITE ? { site: JSON.parse(process.env.SITE) } : {}) });`,
    ],
    {
      env: { ...process.env, SALIDA: salida, FUENTES: dirFuentes ?? '', SITE: site ? JSON.stringify(site) : '' },
      encoding: 'utf-8',
      timeout: 120000,
    },
  );
